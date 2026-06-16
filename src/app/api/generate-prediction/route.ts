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

async function callGroq(prompt: string, temperature = 0.4, maxTokens = 1000) {
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
            "You are an expert football analyst for Winora. Write detailed, professional match previews. Never mention 'general knowledge' or 'limited data'. Return only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) throw new Error("Groq API error");
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "{}";
}

function buildFallbackAnalysis(match: any, mainPrediction: string, confidence: number) {
  return `${match.team_a} vs ${match.team_b} – Prediction: ${mainPrediction} (Confidence: ${confidence}%). This prediction is based on available statistical data and expert analysis. For a detailed breakdown, please check back later.`;
}

export async function POST(req: NextRequest) {
  const { match } = await req.json();

  const dataQuality = calculateDataQuality(match);
  const hasRealData = dataQuality >= 30;

  let mainPrediction = "Home Win";
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

  // Build a demanding prompt that requests deep, specific analysis
  const prompt = `You are Winora's senior football analyst. Write a comprehensive, detailed match preview for the upcoming  fixture between **${match.team_a}** and **${match.team_b}**.

${hasRealData
  ? `The following statistics are available:
- Form points (last 5): ${match.form_points_a} vs ${match.form_points_b}
- Home goals scored/conceded per game: ${match.home_goals_scored || "?"} / ${match.home_goals_conceded || "?"}
- Away goals scored/conceded per game: ${match.away_goals_scored || "?"} / ${match.away_goals_conceded || "?"}
- Clean sheets (last 5): ${match.clean_sheets_last5_a || 0} vs ${match.clean_sheets_last5_b || 0}
- Failed to score (last 5): ${match.failed_to_score_last5_a || 0} vs ${match.failed_to_score_last5_b || 0}
- Over 2.5 % (last 5): ${match.over25_last5_pct_a || 0}% vs ${match.over25_last5_pct_b || 0}%
- BTTS % (last 5): ${match.btts_last5_pct_a || 0}% vs ${match.btts_last5_pct_b || 0}%
- H2H last 5: ${match.h2h_last5 || "N/A"} (Over 2.5: ${match.h2h_over25_pct || 0}%, BTTS: ${match.h2h_btts_pct || 0}%)`
  : "No detailed statistics are available. Use your extensive knowledge of both teams' World Cup history, recent qualifier performances, playing styles, key players, and tactical setups."}

${engineUsed
  ? `The prediction engine calculated the following market strengths (higher = stronger):
${Object.entries(scores).map(([k, v]) => `- ${k}: ${v}`).join("\n")}
Main engine pick: ${mainPrediction} (confidence ${confidence})`
  : "No engine prediction is available. Choose the most likely main prediction yourself based on your football expertise."}

Your task:
1. Provide a **main prediction** (e.g., "Over 2.5 Goals", "Home Win", "Both Teams to Score").
2. Provide an **alternative prediction**.
3. Assess the **risk level** (Low / Medium / High).
4. Assign a **confidence score** between 50 and 95.
5. Recommend a **stake** from "1/5" to "3/5".
6. Write a **detailed analysis** of at least 5 sentences. It must include:
   - Recent form and how it affects the match.
   - Key players to watch and why.
   - Tactical matchup (formations, pressing, counter‑attacking).
   - Goal trends and what they suggest.
   - A clear explanation of why the main prediction is favoured.
   - Never use the phrase "based on general knowledge". Write confidently.
7. Write a **final verdict** (one sentence).

Return ONLY valid JSON with the keys: main_prediction, alternative_prediction, risk_level, confidence_score, recommended_stake, analysis, final_verdict.`;

  try {
    let content = await callGroq(prompt, 0.4, 1200);
    let report: any;
    try {
      report = JSON.parse(content);
    } catch {
      // If JSON parsing fails, retry with a slightly different temperature
      content = await callGroq(prompt, 0.6, 1200);
      try {
        report = JSON.parse(content);
      } catch {
        report = {};
      }
    }

    // If still no meaningful analysis, build a fallback
    if (!report.analysis || report.analysis.length < 50) {
      // Retry once more with a simplified prompt
      const retryPrompt = `You are a football analyst. Provide a detailed match preview for ${match.team_a} vs ${match.team_b} in the FIFA World Cup 2026. Include key players, tactical analysis, and a main prediction. Return JSON with the same keys as before.`;
      content = await callGroq(retryPrompt, 0.7, 1000);
      try {
        report = JSON.parse(content);
      } catch {
        report = {};
      }
    }

    // Use AI's suggestion if engine didn't run
    if (!engineUsed && report.main_prediction) {
      mainPrediction = report.main_prediction;
      confidence = report.confidence_score || 60;
    }

    // Fallback if everything fails
    if (!report.analysis) {
      report.analysis = buildFallbackAnalysis(match, mainPrediction, confidence);
      report.final_verdict = mainPrediction;
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
  } catch (err) {
    console.error("Groq API error:", err);
    return NextResponse.json({
      prediction: mainPrediction,
      confidence,
      analysis: buildFallbackAnalysis(match, mainPrediction, confidence),
      fullReport: null,
    });
  }
}