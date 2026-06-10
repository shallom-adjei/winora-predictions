import { NextRequest, NextResponse } from "next/server";
import { computePrediction, calculateConfidence } from "@/lib/predictionEngine";

// ----- Data quality (same as before) -----
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

// ----- Build a bullet‑list of evidence strings -----
function buildReasons(match: any, scores: any) {
  const reasons: string[] = [];
  if (match.btts_last5_pct_a > 60) reasons.push(`Home team BTTS rate: ${match.btts_last5_pct_a}%`);
  if (match.btts_last5_pct_b > 60) reasons.push(`Away team BTTS rate: ${match.btts_last5_pct_b}%`);
  if (match.h2h_btts_pct > 60) reasons.push(`H2H BTTS: ${match.h2h_btts_pct}%`);
  if (match.over25_last5_pct_a > 60) reasons.push(`Home team Over 2.5 rate: ${match.over25_last5_pct_a}%`);
  if (match.over25_last5_pct_b > 60) reasons.push(`Away team Over 2.5 rate: ${match.over25_last5_pct_b}%`);
  if (match.h2h_over25_pct > 60) reasons.push(`H2H Over 2.5: ${match.h2h_over25_pct}%`);
  if (match.clean_sheets_last5_a >= 2) reasons.push(`Home clean sheets: ${match.clean_sheets_last5_a}`);
  if (match.clean_sheets_last5_b >= 2) reasons.push(`Away clean sheets: ${match.clean_sheets_last5_b}`);
  if (match.failed_to_score_last5_a >= 2) reasons.push(`Home failed to score in ${match.failed_to_score_last5_a} of last 5`);
  if (match.failed_to_score_last5_b >= 2) reasons.push(`Away failed to score in ${match.failed_to_score_last5_b} of last 5`);
  if (match.form_points_a && match.form_points_b) {
    const diff = Number(match.form_points_a) - Number(match.form_points_b);
    if (Math.abs(diff) >= 3) reasons.push(`Form advantage: ${diff > 0 ? match.team_a : match.team_b} (+${Math.abs(diff)})`);
  }
  if (match.league_position_a && match.league_position_b) {
    const gap = Number(match.league_position_b) - Number(match.league_position_a);
    if (gap > 4) reasons.push(`League position advantage: ${match.team_a} (${gap} places higher)`);
    else if (gap < -4) reasons.push(`League position advantage: ${match.team_b} (${-gap} places higher)`);
  }
  return reasons;
}

export async function POST(req: NextRequest) {
  const { match } = await req.json();

  const dataQuality = calculateDataQuality(match);
  if (dataQuality < 30) {
    return NextResponse.json({
      prediction: "No recommendation",
      confidence: 0,
      analysis: "Insufficient analytical data available for this match.",
      fullReport: null,
    });
  }

  // 1. Compute all market scores
  const scores = computePrediction(match);
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const mainPrediction = sorted[0]?.[0] || "Home Win";
  const alternativePrediction = sorted[1]?.[0] || "Draw";
  const topScore = sorted[0]?.[1] || 50;
  const secondScore = sorted[1]?.[1] || 50;
  const edge = topScore - secondScore;

  // 2. Confidence
  const confidence = calculateConfidence(scores, dataQuality, Number(match.form_points_a) - Number(match.form_points_b));

  // 3. Risk
  const riskLevel = edge < 5 ? "High" : edge < 12 ? "Medium" : "Low";

  // 4. Stake (conservative)
  const stake = confidence >= 85 ? "2/5" : confidence >= 75 ? "1.5/5" : "1/5";

  // 5. Build evidence reasons
  const reasons = buildReasons(match, scores);
  const reasonsText = reasons.length
    ? reasons.map(r => `- ${r}`).join("\n")
    : "No specific statistical data points were available.";

  // 6. AI prompt – purely from evidence
  const prompt = `You are Winora's senior football analyst. Write a concise, professional, 3‑sentence analysis for the following match. Use ONLY the supporting evidence provided; do not invent any statistics, form, injuries, or historical events.

Match: ${match.team_a} vs ${match.team_b}
League: ${match.league || "International"}
Main prediction: ${mainPrediction}
Confidence: ${confidence}
Risk level: ${riskLevel}
Stake recommendation: ${stake}

Supporting evidence:
${reasonsText}

Return ONLY a JSON object with the key "analysis".`;

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
          { role: "system", content: "You are a professional football analyst. Write concisely and use only the provided evidence. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let analysis = "";
    try {
      const parsed = JSON.parse(content);
      analysis = parsed.analysis || "";
    } catch {}

    if (!analysis) {
      analysis = `${mainPrediction} is the statistically favoured outcome based on the available data. Confidence: ${confidence}%.`;
    }

    return NextResponse.json({
      prediction: mainPrediction,
      confidence,
      analysis,
      fullReport: {
        main_prediction: mainPrediction,
        alternative_prediction: alternativePrediction,
        risk_level: riskLevel,
        confidence_score: confidence,
        recommended_stake: stake,
        analysis,
        evidence: reasons,
      },
    });
  } catch (err) {
    console.error("Groq API error:", err);
    return NextResponse.json({
      prediction: mainPrediction,
      confidence,
      analysis: `${mainPrediction} is the recommended pick based on available data.`,
      fullReport: null,
    });
  }
}