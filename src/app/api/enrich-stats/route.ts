import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.FOOTBALL_DATA_API_KEY;

async function getTeamStats(teamId: number) {
  const res = await fetch(
    `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=5`,
    { headers: { "X-Auth-Token": apiKey! } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const matches = data.matches || [];
  if (matches.length === 0) return null;

  // Form points (W=3, D=1, L=0)
  const formPoints = matches.reduce((sum: number, m: any) => {
    if (m.score.winner === "HOME_TEAM" && m.homeTeam.id === teamId) return sum + 3;
    if (m.score.winner === "AWAY_TEAM" && m.awayTeam.id === teamId) return sum + 3;
    if (m.score.winner === "DRAW") return sum + 1;
    return sum;
  }, 0);

  // Home goals scored / conceded
  const homeMatches = matches.filter((m: any) => m.homeTeam.id === teamId);
  const homeGoalsScored = homeMatches.length
    ? (homeMatches.reduce((s: number, m: any) => s + (m.score.fullTime.home || 0), 0) / homeMatches.length).toFixed(1)
    : null;
  const homeGoalsConceded = homeMatches.length
    ? (homeMatches.reduce((s: number, m: any) => s + (m.score.fullTime.away || 0), 0) / homeMatches.length).toFixed(1)
    : null;

  // Clean sheets & failed to score
  const cleanSheets = matches.filter((m: any) => {
    if (m.homeTeam.id === teamId) return m.score.fullTime.away === 0;
    else return m.score.fullTime.home === 0;
  }).length;
  const failedToScore = matches.filter((m: any) => {
    if (m.homeTeam.id === teamId) return m.score.fullTime.home === 0;
    else return m.score.fullTime.away === 0;
  }).length;

  // Over 2.5 % and BTTS %
  const over25 = matches.filter((m: any) => {
    const total = (m.score.fullTime.home || 0) + (m.score.fullTime.away || 0);
    return total > 2.5;
  }).length;
  const btts = matches.filter((m: any) => {
    return (m.score.fullTime.home || 0) > 0 && (m.score.fullTime.away || 0) > 0;
  }).length;
  const over25Pct = ((over25 / matches.length) * 100).toFixed(0);
  const bttsPct = ((btts / matches.length) * 100).toFixed(0);

  return {
    form_points: formPoints,
    home_goals_scored: homeGoalsScored,
    home_goals_conceded: homeGoalsConceded,
    clean_sheets_last5: cleanSheets,
    failed_to_score_last5: failedToScore,
    over25_last5_pct: over25Pct,
    btts_last5_pct: bttsPct,
  };
}

export async function POST(req: NextRequest) {
  if (!apiKey) return NextResponse.json({ error: "Missing FOOTBALL_DATA_API_KEY" }, { status: 500 });

  const { supabase } = await import("@/lib/supabase");

  // Select matches that are missing stats (form_points_a is null)
  const { data: matches } = await supabase
    .from("predictions")
    .select("*")
    .is("form_points_a", null)
    .not("team_id_a", "is", null)
    .limit(20);

  if (!matches || matches.length === 0) {
    return NextResponse.json({ success: true, message: "All matches already have stats." });
  }

  let enriched = 0;
  let failed = 0;

  for (const match of matches) {
    try {
      const [statsA, statsB] = await Promise.all([
        getTeamStats(match.team_id_a),
        getTeamStats(match.team_id_b),
      ]);

      const update: any = {};
      if (statsA) {
        update.form_points_a = statsA.form_points;
        update.home_goals_scored = statsA.home_goals_scored;
        update.home_goals_conceded = statsA.home_goals_conceded;
        update.clean_sheets_last5_a = statsA.clean_sheets_last5;
        update.failed_to_score_last5_a = statsA.failed_to_score_last5;
        update.over25_last5_pct_a = statsA.over25_last5_pct;
        update.btts_last5_pct_a = statsA.btts_last5_pct;
      }
      if (statsB) {
        update.form_points_b = statsB.form_points;
        update.away_goals_scored = statsB.home_goals_scored;
        update.away_goals_conceded = statsB.home_goals_conceded;
        update.clean_sheets_last5_b = statsB.clean_sheets_last5;
        update.failed_to_score_last5_b = statsB.failed_to_score_last5;
        update.over25_last5_pct_b = statsB.over25_last5_pct;
        update.btts_last5_pct_b = statsB.btts_last5_pct;
      }

      if (Object.keys(update).length > 0) {
        await supabase.from("predictions").update(update).eq("id", match.id);
        enriched++;
      } else {
        failed++;
      }

      // Respect free tier rate limit (10 req/min)
      await new Promise(resolve => setTimeout(resolve, 7000));
    } catch (err) {
      console.error(`Enrichment failed for ${match.match_name}`, err);
      failed++;
    }
  }

  return NextResponse.json({ success: true, processed: matches.length, enriched, failed });
}