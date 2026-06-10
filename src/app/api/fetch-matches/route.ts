import { NextRequest, NextResponse } from "next/server";

// ----- Tiny delay to stay within 10 req/min -----
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ----- Fetch team stats (last 5 matches) -----
async function getTeamStats(teamId: number, apiKey: string) {
  const res = await fetch(
    `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=5`,
    { headers: { "X-Auth-Token": apiKey } }
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

  // Over 2.5 & BTTS percentages
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
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  const today = new Date();
  const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dateFrom = today.toISOString().split("T")[0];
  const dateTo = future.toISOString().split("T")[0];

  try {
    // 1. Fetch all scheduled matches (global endpoint)
    const res = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`,
      { headers: { "X-Auth-Token": apiKey } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Football API error: ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    const matches = data.matches || [];
    console.log(`Fetched ${matches.length} matches`);

    const { supabase } = await import("@/lib/supabase");
    let inserted = 0;
    let enriched = 0;
    let skipped = 0;

    for (const m of matches) {
      // Skip if already stored
      const { data: existing } = await supabase
        .from("predictions")
        .select("id")
        .eq("match_api_id", m.id)
        .limit(1);
      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      // 2. Insert basic match info
      const { data: insertedRow, error: insertErr } = await supabase
        .from("predictions")
        .insert({
          sport: "Football",
          league: m.competition?.name || "Unknown",
          country: m.area?.name || null,
          match_name: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
          team_a: m.homeTeam.name,
          team_b: m.awayTeam.name,
          time: new Date(m.utcDate).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          kickoff_time: m.utcDate,
          crest_a: m.homeTeam.crest || null,
          crest_b: m.awayTeam.crest || null,
          team_id_a: m.homeTeam.id,
          team_id_b: m.awayTeam.id,
          match_api_id: m.id,
          status: m.status,
          matchday: m.matchday,
          season: m.season?.startDate || null,
          competition_code: m.competition?.code || null,
          prediction: "",
          confidence: 70,
          is_premium: false,
        })
        .select();

      if (insertErr || !insertedRow) {
        console.error(`Insert failed for ${m.homeTeam.name} vs ${m.awayTeam.name}`);
        continue;
      }
      inserted++;

      // 3. Enrich immediately (fetch stats for both teams)
      await wait(3500); // respect free tier limit (~10 req/min)

      const newMatch = insertedRow[0];
      const [statsA, statsB] = await Promise.all([
        getTeamStats(m.homeTeam.id, apiKey),
        getTeamStats(m.awayTeam.id, apiKey),
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
        // For away team, we store the same fields under "away_*" columns
        update.away_goals_scored = statsB.home_goals_scored;
        update.away_goals_conceded = statsB.home_goals_conceded;
        update.clean_sheets_last5_b = statsB.clean_sheets_last5;
        update.failed_to_score_last5_b = statsB.failed_to_score_last5;
        update.over25_last5_pct_b = statsB.over25_last5_pct;
        update.btts_last5_pct_b = statsB.btts_last5_pct;
      }

      if (Object.keys(update).length > 0) {
        await supabase.from("predictions").update(update).eq("id", newMatch.id);
        enriched++;
      }
    }

    return NextResponse.json({
      success: true,
      fetched: matches.length,
      inserted,
      enriched,
      skipped,
    });
  } catch (err) {
    console.error("Combined route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}