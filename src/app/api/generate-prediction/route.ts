import { NextRequest, NextResponse } from "next/server";
import { computePrediction, calculateConfidence } from "@/lib/predictionEngine";

// Data quality score (same as before)
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
  console.log(`Data quality for ${match.team_a} vs ${match.team_b}: ${dataQuality}%`);

  // 1. Calculate engine scores
  const scores = computePrediction(match);
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const mainPrediction = sorted[0]?.[0] || "Home Win";
  const alternativePrediction = sorted[1]?.[0] || "Draw";
  const confidence = calculateConfidence(scores, dataQuality);
  const topScore = sorted[0]?.[1] || 50;
  const secondScore = sorted[1]?.[1] || 50;
  const edge = topScore - secondScore;
  const riskLevel = edge > 15 && dataQuality > 80 ? "Low" : edge > 10 && dataQuality > 70 ? "Medium" : "High";
  const recommendedStake = confidence > 75 ? "3/5" : confidence > 65 ? "2/5" : "1/5";

  // 2. Build the prompt for the AI writer
  const hasData = dataQuality > 30; // if we have some stats, use them
  const dataSection = hasData
    ? `Match Data:
${match.team_a} (Home) vs ${match.team_b} (Away)
Form points (last 5): ${match.form_points_a} vs ${match.form_points_b}
Home goals scored/conceded per game: ${match.home_goals_scored || "?"} / ${match.home_goals_conceded || "?"}
Away goals scored/conceded per game: ${match.away_goals_scored || "?"} / ${match.away_goals_conceded || "?"}
Clean sheets (last 5): ${match.clean_sheets_last5_a || 0} vs ${match.clean_sheets_last5_b || 0}
Failed to score (last 5): ${match.failed_to_score_last5_a || 0} vs ${match.failed_to_score_last5_b || 0}
Over 2.5 % (last 5): ${match.over25_last5_pct_a || 0}% vs ${match.over25_last5_pct_b || 0}%
BTTS % (last 5): ${match.btts_last5_pct_a || 0}% vs ${match.btts_last5_pct_b || 0}%
H2H last 5: ${match.h2h_last5 || "N/A"} (Over 2.5: ${match.h2h_over25_pct || 0}%, BTTS: ${match.h2h_btts_pct || 0}%)`
    : "No detailed statistics are available for this match.";

  const prompt = `You are Winora's senior football analyst. Write a detailed, professional match analysis based on the supplied information. 

Match: ${match.team_a} vs ${match.team_b}
Sport: ${match.sport || "Football"}
League: ${match.league || "International Friendly"}
Time: ${match.time || "TBD"}

${hasData ? `Supplied Data:
Form points (last 5): ${match.form_points_a} vs ${match.form_points_b}
Home goals scored/conceded per game: ${match.home_goals_scored || "?"} / ${match.home_goals_conceded || "?"}
Away goals scored/conceded per game: ${match.away_goals_scored || "?"} / ${match.away_goals_conceded || "?"}
Clean sheets (last 5): ${match.clean_sheets_last5_a || 0} vs ${match.clean_sheets_last5_b || 0}
Failed to score (last 5): ${match.failed_to_score_last5_a || 0} vs ${match.failed_to_score_last5_b || 0}
Over 2.5 % (last 5): ${match.over25_last5_pct_a || 0}% vs ${match.over25_last5_pct_b || 0}%
BTTS % (last 5): ${match.btts_last5_pct_a || 0}% vs ${match.btts_last5_pct_b || 0}%
H2H last 5: ${match.h2h_last5 || "N/A"} (Over 2.5: ${match.h2h_over25_pct || 0}%, BTTS: ${match.h2h_btts_pct || 0}%)` 
: "No detailed statistics are available for this match."}

The prediction engine has calculated the following scores (higher = stronger):
${sorted.map(([pred, score]) => `- ${pred}: ${score}`).join("\n")}

Main prediction: ${mainPrediction} (confidence ${confidence})
Alternative: ${alternativePrediction}
Risk level: ${riskLevel}
Recommended stake: ${recommendedStake}

Write a JSON report containing:
- "analysis": a 3-4 sentence analysis that explains why ${mainPrediction} is the best pick. You must mention ${match.team_a} and ${match.team_b} by name at least twice each. Use specific, football‑relevant language (e.g., home advantage, recent friendly form, attacking styles, defensive records). Never say "both teams are equal" or "tightly contested" in a generic way. If no data is available, use your general knowledge of the teams to provide a reasoned, engaging analysis.
- "final_verdict": a one‑line summary.

Be engaging and sound like a human expert. Return ONLY valid JSON.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 700,
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let report = { analysis: "", final_verdict: "" };
    try {
      const parsed = JSON.parse(content);
      report = { analysis: parsed.analysis || "", final_verdict: parsed.final_verdict || "" };
    } catch {}

    const fullAnalysis = report.analysis || `Based on the calculated model, ${mainPrediction} is the most likely outcome with ${confidence}% confidence.`;

    return NextResponse.json({
      prediction: mainPrediction,
      confidence,
      analysis: fullAnalysis,
      fullReport: {
        main_prediction: mainPrediction,
        alternative_prediction: alternativePrediction,
        risk_level: riskLevel,
        confidence_score: confidence,
        recommended_stake: recommendedStake,
        analysis: fullAnalysis,
        final_verdict: report.final_verdict || `${mainPrediction} is the recommended pick.`,
      },
    });
  } catch (err) {
    console.error("Groq API error:", err);
    return NextResponse.json({
      prediction: mainPrediction,
      confidence,
      analysis: `${mainPrediction} is the calculated best pick with ${confidence}% confidence based on available data.`,
      fullReport: null,
    });
  }
}