import { NextRequest, NextResponse } from "next/server";
import { computePrediction, calculateConfidence } from "@/lib/predictionEngine";

// Data quality score (kept for enriched matches)
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

  let mainPrediction = "No recommendation";
  let confidence = 0;
  let scores: any = {};
  let engineUsed = false;

  // If we have real stats, run the engine
  if (hasRealData) {
    scores = computePrediction(match);
    const sorted = Object.entries(scores).sort(
      (a, b) => (b[1] as number) - (a[1] as number)
    );
    mainPrediction = sorted[0]?.[0] || "Home Win";
    confidence = calculateConfidence(scores as any, dataQuality);
    engineUsed = true;
  }

  // Build the prompt – always includes match info and asks for detailed analysis
  const prompt = `You are Winora's senior football analyst. You are given an upcoming World Cup 2026 match. ${
    hasRealData
      ? "Use ONLY the supplied statistics below. Never invent stats."
      : "No detailed statistics are available. Use your extensive general knowledge of the teams' playing styles, recent World Cup qualifier performances, star players, and tactical setups to provide a reasoned, engaging analysis. Clearly mention that this preview is based on general knowledge."
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
      ? `The prediction engine has calculated the following market strengths (higher = stronger):
${Object.entries(scores)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

Main prediction: ${mainPrediction} (confidence ${confidence})`
      : `The engine cannot compute a prediction due to lack of data. You must decide the main prediction based on your general knowledge.`
  }

Write a JSON report containing:
- "main_prediction": your best prediction (e.g., "Over 2.5 Goals", "Home Win", "Both Teams to Score").
- "alternative_prediction": a secondary option.
- "risk_level": "Low", "Medium", or "High".
- "confidence_score": 50‑95 (or lower if very uncertain).
- "recommended_stake": "1/5" to "3/5".
- "analysis": a 3‑4 sentence engaging analysis that explains why the main prediction is favoured. Use specific team names, mention key players if known, and refer to tactical styles (e.g., pressing, counter‑attack). ${
    hasRealData
      ? "Base it strictly on the supplied stats."
      : "Base it on your general knowledge of the teams."
  }
- "final_verdict": a one‑line summary.

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
              "You are Winora's senior football analyst. Write professionally, use football terminology, and be concise. Return only valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 800,
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

    // If the engine ran, use its prediction; otherwise, take the AI's suggestion
    if (!engineUsed && report.main_prediction) {
      mainPrediction = report.main_prediction;
      confidence = report.confidence_score || 50;
    }

    return NextResponse.json({
      prediction: mainPrediction,
      confidence,
      analysis: report.analysis || report.final_verdict || "",
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
      prediction: "N/A",
      confidence: 0,
      analysis: "Failed to generate analysis. Please try again.",
    });
  }
}