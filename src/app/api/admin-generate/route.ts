import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generatePredictionResult } from "@/lib/generatePredictionResult";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { matchId?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { matchId } = body;
  if (!matchId) {
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase environment variables not configured" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: match, error: fetchError } = await supabase
    .from("predictions")
    .select("*")
    .eq("id", matchId)
    .single();

  if (fetchError || !match) {
    return NextResponse.json({ error: fetchError?.message || "Match not found" }, { status: 404 });
  }

  if (match.elo_a == null || match.elo_b == null) {
    const [eloResA, eloResB] = await Promise.all([
      supabase.from("team_elos").select("elo_rating").eq("team_name", match.team_a).maybeSingle(),
      supabase.from("team_elos").select("elo_rating").eq("team_name", match.team_b).maybeSingle(),
    ]);
    match.elo_a = match.elo_a ?? eloResA?.data?.elo_rating ?? 1500;
    match.elo_b = match.elo_b ?? eloResB?.data?.elo_rating ?? 1500;
  }

  const result = generatePredictionResult(match);
  const {
    mainPick, safePick, goalsPick, bttsPick,
    expectedScore, confidence, risk, stake,
    analysis, scores, dataQuality,
  } = result;

  const { error: updateError } = await supabase
    .from("predictions")
    .update({
      prediction:        mainPick,
      confidence,
      analysis,
      expected_score:    expectedScore,
      main_pick:         mainPick,
      safe_pick:         safePick,
      goals_pick:        goalsPick,
      btts_pick:         bttsPick,
      risk_level:        risk,
      recommended_stake: stake,
      prob_home:         scores["Home Win"],
      prob_draw:         scores["Draw"],
      prob_away:         scores["Away Win"],
      main_edge:         result.mainEdge,
    })
    .eq("id", matchId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("prediction_logs").insert({
    prediction_id:  matchId,
    prob_home_win:  scores["Home Win"],
    prob_draw:      scores["Draw"],
    prob_away_win:  scores["Away Win"],
    prob_over25:    scores["Over 2.5 Goals"],
    prob_under25:   scores["Under 2.5 Goals"],
    prob_btts:      scores["Both Teams to Score"],
    prob_btts_no:   scores["BTTS No"],
    data_quality:   dataQuality,
    main_pick:      mainPick,
    safe_pick:      safePick,
    goals_pick:     goalsPick,
    btts_pick:      bttsPick,
  });

  return NextResponse.json({
    prediction:    mainPick,
    confidence,
    analysis,
    expectedScore,
    mainPick,
    safePick,
    goalsPick,
    bttsPick,
    riskLevel:     risk,
    stake,
    probHome:      scores["Home Win"],
    probDraw:      scores["Draw"],
    probAway:      scores["Away Win"],
    mainEdge:      result.mainEdge,
  });
}