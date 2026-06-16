import { NextRequest, NextResponse } from "next/server";
import { computePrediction, calculateConfidence } from "@/lib/predictionEngine";

function calculateDataQuality(match: any) {
  let quality = 0;
  if (match.form_points_a != null && match.form_points_b != null) quality += 15;
  if (match.form_points_a != null) quality += 15;
  if (match.home_goals_scored != null) quality += 10;
  if (match.away_goals_scored != null) quality += 10;
  if (match.over25_last5_pct_a != null) quality += 15;
  if (match.over25_last5_pct_b != null) quality += 15;
  if (match.btts_last5_pct_a != null) quality += 10;
  if (match.h2h_last5) quality += 15;
  if (match.league_position_a != null && match.league_position_b != null) quality += 10;
  return Math.min(quality, 100);
}

export async function POST(req: NextRequest) {
  const { match } = await req.json();

  const dataQuality = calculateDataQuality(match);
  const hasRealData = dataQuality >= 30;

  let mainPrediction = "Home Win";   // fallback default
  let confidence = 50;
  let scores: any = {};
  let engineUsed = false;

  if (hasRealData) {
    scores = computePrediction(match);
    const sorted = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
    mainPrediction = sorted[0]?.[0] || "Home Win";
    confidence = calculateConfidence(scores as any, dataQuality);
    engineUsed = true;
  }

  const prompt = `You are Winora's senior football analyst. Produce a detailed, professional match preview for an upcoming FIFA World Cup 2026 fixture. ${
    hasRealData
      ? "Use ONLY the supplied statistics below."
      : "No statistics are available. Use your extensive general knowledge of the teams' World Cup history, recent qualifier form, playing styles, and key players to provide a reasoned, engaging preview."
  }

Match: ${match.team_a} vs ${match.team_b}
Sport: Football
League: FIFA World Cup 2026
Time: ${match.time || "TBD"}

${
    hasRealData
      ? `Supplied Data:
Form points (last 5): ${match.form_points_a} vs ${match.form_points_b}
Home goals scored/conceded per game: ${match.home_goals_scored || "?"} / ${match.home_goals_conceded || "?"}
Away goals scored/conceded per game: ${match.away_goals_scored || "?"} / ${match.away_goals_conceded || "?"}
Clean sheets (last 5): ${match.clean_sheets_last5_a || 0} vs ${match.clean_sheets_last5_b || 0}
Failed to score (last 5): ${match.failed_to_score_last5_a || 0} vs ${match.failed_to_score_last5_b || 0}
Over 2.5 % (last 5): ${match.over25_last5_pct_a || 0}% vs ${match.over25_last5_pct_b || 0}%
BTTS % (last 5): ${match.btts_last5_pct_a || 0}% vs ${match.btts_last5_pct_b || 0}%
H2H last 5: ${match.h2h_last5 || "N/A"} (Over 2.5: ${match.h2h_over25_pct || 0}%, BTTS: ${match.h2h_btts_pct || 0}%)`
      : ""
  }

${
    engineUsed
      ? `Engine computed market strengths:
${Object.entries(scores)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}
Main prediction: ${mainPrediction} (confidence ${confidence})`
      : `The engine cannot calculate probabilities. Choose the most likely main prediction yourself, and set a realistic confidence (50‑85) based on your knowledge.`
  }

Write a JSON object with exactly these keys:
- "main_prediction": a clear betting market (e.g., "Over 2.5 Goals", "Home Win", "Both Teams to Score").
- "alternative_prediction": a secondary market.
- "risk_level": "Low", "Medium", or "High".
- "confidence_score": a number 50‑95.
- "recommended_stake": "1/5" to "3/5".
- "analysis": a detailed, 5‑6 sentence analysis that reads like a sports journalist wrote it. Discuss team form, key players, tactical match‑up, goal trends, and why the main prediction is favoured. Never use the phrase "based on general knowledge" – just present your analysis confidently. Use specific team names and football vocabulary.
- "final_verdict": a one‑sentence summary.

Return ONLY valid JSON.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are an expert football analyst for Winora. Write professionally, use football terminology, and be concise but detailed. Never mention 'general knowledge' or 'limited data' in your analysis. Return only valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let report: any;
    try {
      report = JSON.parse(content);
    } catch {
      report = {};
    }

    // Use AI's prediction if engine didn't run, or if AI provided one
    if (!engineUsed && report.main_prediction) {
      mainPrediction = report.main_prediction;
      confidence = report.confidence_score || 50;
    } else if (!report.main_prediction && !engineUsed) {
      // AI failed – fallback to a simple prediction
      mainPrediction = "Over 2.5 Goals";
      confidence = 60;
    }

    return NextResponse.json({
      prediction: mainPrediction,
      confidence,
      analysis: report.analysis || report.final_verdict || `${mainPrediction} is the recommended pick.`,
      fullReport: {
        main_prediction: mainPrediction,
        alternative_prediction: report.alternative_prediction || "N/A",
        risk_level: report.risk_level || "Medium",
        confidence_score: confidence,
        recommended_stake: report.recommended_stake || "1/5",
        analysis: report.analysis || "",
        final_verdict: report.final_verdict || "",
      },
    });
  } catch (err) {
    console.error("Groq API error:", err);
    return NextResponse.json({
      prediction: mainPrediction,
      confidence: 50,
      analysis: `${mainPrediction} appears the most likely outcome for this World Cup fixture.`,
    });
  }
}