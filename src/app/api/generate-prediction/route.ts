import { NextRequest, NextResponse } from "next/server";
import { computePrediction, calculateConfidence } from "@/lib/predictionEngine";

// Data quality helper
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

// Call Groq with retries
async function callGroq(prompt: string, temp = 0.4, tokens = 1200) {
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
          content: "You are an expert football analyst for Winora. Write detailed, insightful match previews. Never mention 'general knowledge' or 'limited data or team likely formation if you have no idea about them'. Return only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: temp,
      max_tokens: tokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) throw new Error("Groq API error");
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "{}";
}

// Fallback analysis builder (only used if absolutely everything fails)
function buildFallback(match: any, pred: string, conf: number) {
  return `${match.team_a} vs ${match.team_b} Based on recent trends and squad strength, ${pred} is the favoured outcome with a confidence of ${conf}%. Expect a tactical battle where key players and set‑pieces could prove decisive. Our recommendation: ${pred}.`;
}

export async function POST(req: NextRequest) {
  const { match } = await req.json();

  const dataQuality = calculateDataQuality(match);
  const hasRealData = dataQuality >= 30;

  let mainPrediction = "Home Win";
  let confidence = 50;
  let scores: any = {};
  let engineUsed = false;

  // If real stats exist, run engine
  if (hasRealData) {
    scores = computePrediction(match);
    const sorted = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
    mainPrediction = sorted[0]?.[0] || "Home Win";
    confidence = calculateConfidence(scores as any, dataQuality);
    engineUsed = true;
  }

  // ----- Build a strict, demanding prompt -----
  const prompt = `You are Winora's lead World Cup analyst. Produce a detailed, professional match preview for **${match.team_a} vs ${match.team_b}**.

${hasRealData ? `Available statistics:
- Form points (last 5): ${match.form_points_a} vs ${match.form_points_b}
- Home goals scored/conceded per game: ${match.home_goals_scored || "?"}/${match.home_goals_conceded || "?"}
- Away goals scored/conceded per game: ${match.away_goals_scored || "?"}/${match.away_goals_conceded || "?"}
- Clean sheets (last 5): ${match.clean_sheets_last5_a} vs ${match.clean_sheets_last5_b}
- Failed to score (last 5): ${match.failed_to_score_last5_a} vs ${match.failed_to_score_last5_b}
- Over 2.5 % (last 5): ${match.over25_last5_pct_a}% vs ${match.over25_last5_pct_b}%
- BTTS % (last 5): ${match.btts_last5_pct_a}% vs ${match.btts_last5_pct_b}%
- H2H last 5: ${match.h2h_last5 || "N/A"} (Over 2.5: ${match.h2h_over25_pct}%, BTTS: ${match.h2h_btts_pct}%)`
  : "No detailed statistics are available."}

${engineUsed ? `Engine market strengths (higher = stronger): ${Object.entries(scores).map(([k,v])=>`${k}:${v}`).join(", ")}. Engine pick: ${mainPrediction} (confidence ${confidence}).` : "Please determine the most likely main prediction yourself."}

Your response must be a JSON object with the following keys:
- "main_prediction": a specific betting market (e.g., "Over 2.5 Goals", "Home Win", "Both Teams to Score").
- "alternative_prediction": a secondary option.
- "risk_level": "Low", "Medium", or "High".
- "confidence_score": a number 50‑95.
- "recommended_stake": "1/5" to "3/5".
- "analysis": a **5‑6 sentence** detailed preview. It MUST include:
   * Recent form and its impact.
   * Key players to watch (mention at least one per team by name).
   * Tactical matchup (formations, pressing, counter‑attacking).
   * Goal trends and what they suggest.
   * Why the main prediction is the strongest angle.
   * Use **specific team names** throughout. Never say "based on general knowledge" or "limited data". Write confidently.
- "final_verdict": a one‑sentence conclusion.

**Return ONLY valid JSON.**`;

  // Retry loop – maximum 3 attempts with increasing creativity
  let content = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const temperature = 0.4 + attempt * 0.15; // 0.4, 0.55, 0.7
      content = await callGroq(prompt, temperature, 1200 + attempt * 200);
      const report = JSON.parse(content);

      // Check if analysis is long enough and contains team names
      if (
        report.analysis &&
        report.analysis.length > 120 &&
        report.analysis.includes(match.team_a) &&
        report.analysis.includes(match.team_b)
      ) {
        // Success – use AI's prediction if engine didn't run
        if (!engineUsed && report.main_prediction) {
          mainPrediction = report.main_prediction;
          confidence = report.confidence_score || 60;
        }

        return NextResponse.json({
          prediction: mainPrediction,
          confidence,
          analysis: report.analysis,
          fullReport: {
            main_prediction: mainPrediction,
            alternative_prediction: report.alternative_prediction || "N/A",
            risk_level: report.risk_level || "Medium",
            confidence_score: confidence,
            recommended_stake: report.recommended_stake || "1/5",
            analysis: report.analysis,
            final_verdict: report.final_verdict || "",
          },
        });
      }
    } catch {
      // continue to next attempt
    }
  }

  // If all attempts failed, return a solid fallback (not the generic placeholder)
  const fallbackAnalysis = buildFallback(match, mainPrediction, confidence);
  return NextResponse.json({
    prediction: mainPrediction,
    confidence,
    analysis: fallbackAnalysis,
    fullReport: null,
  });
}