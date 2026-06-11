import { NextRequest, NextResponse } from "next/server";

const WAIT_BETWEEN_REQUESTS = 8000; // 8 seconds to stay within 10 req/min

async function fetchWithRetry(url: string, options: any, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      // If rate limited, wait and retry
      if (res.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        continue;
      }
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  throw new Error('Failed after retries');
}

async function getTeamStats(teamId: number, apiKey: string) {
  try {
    const res = await fetchWithRetry(
      `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=5`,
      { headers: { "X-Auth-Token": apiKey } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const matches = data.matches || [];
    if (matches.length === 0) return null;

    const formPoints = matches.reduce((sum: number, m: any) => {
      if (m.score.winner === "HOME_TEAM" && m.homeTeam.id === teamId) return sum + 3;
      if (m.score.winner === "AWAY_TEAM" && m.awayTeam.id === teamId) return sum + 3;
      if (m.score.winner === "DRAW") return sum + 1;
      return sum;
    }, 0);

    const homeMatches = matches.filter((m: any) => m.homeTeam.id === teamId);
    const homeGoalsScored = homeMatches.length
      ? (homeMatches.reduce((s: number, m: any) => s + (m.score.fullTime.home || 0), 0) / homeMatches.length).toFixed(1)
      : null;
    const homeGoalsConceded = homeMatches.length
      ? (homeMatches.reduce((s: number, m: any) => s + (m.score.fullTime.away || 0), 0) / homeMatches.length).toFixed(1)
      : null;

    const cleanSheets = matches.filter((m: any) => {
      if (m.homeTeam.id === teamId) return m.score.fullTime.away === 0;
      else return m.score.fullTime.home === 0;
    }).length;
    const failedToScore = matches.filter((m: any) => {
      if (m.homeTeam.id === teamId) return m.score.fullTime.home === 0;
      else return m.score.fullTime.away === 0;
    }).length;

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
  } catch (err) {
    console.error(`Failed to get stats for team ${teamId}`, err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing FOOTBALL_DATA_API_KEY" }, { status: 500 });

  try {
    // 1. Fetch upcoming matches
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dateFrom = today.toISOString().split("T")[0];
    const dateTo = nextWeek.toISOString().split("T")[0];

    const fixturesRes = await fetchWithRetry(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`,
      { headers: { "X-Auth-Token": apiKey } }
    );

    if (!fixturesRes.ok) {
      const errorText = await fixturesRes.text();
      console.error(`Fixtures fetch failed: ${fixturesRes.status} ${errorText}`);
      return NextResponse.json({ error: `Fixtures fetch failed: ${fixturesRes.status}` }, { status: 502 });
    }

    const fixturesData = await fixturesRes.json();
    const fixtures = fixturesData.matches || [];
    console.log(`Fetched ${fixtures.length} fixtures`);

    const { supabase } = await import("@/lib/supabase");
    let inserted = 0;
    let enriched = 0;

    // 2. Process each match
    for (const m of fixtures) {
      // Check if already exists
      const { data: existing } = await supabase
        .from("predictions")
        .select("id")
        .eq("match_api_id", m.id)
        .limit(1);
      if (existing && existing.length > 0) continue;

      // Insert basic match info
      const { data: insertedRow, error: insertErr } = await supabase
        .from("predictions")
        .insert({
          sport: "Football",
          league: m.competition?.name || "Unknown",
          match_name: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
          team_a: m.homeTeam.name,
          team_b: m.awayTeam.name,
          time: new Date(m.utcDate).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          crest_a: m.homeTeam.crest || null,
          crest_b: m.awayTeam.crest || null,
          team_id_a: m.homeTeam.id,
          team_id_b: m.awayTeam.id,
          match_api_id: m.id,
          prediction: "",
          confidence: 70,
          is_premium: false,
        })
        .select();
      if (insertErr || !insertedRow) continue;
      inserted++;

      // 3. Enrich immediately
      await new Promise(resolve => setTimeout(resolve, 2000)); // small delay

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
        update.away_goals_scored = statsB.home_goals_scored;
        update.away_goals_conceded = statsB.home_goals_conceded;
        update.clean_sheets_last5_b = statsB.clean_sheets_last5;
        update.failed_to_score_last5_b = statsB.failed_to_score_last5;
        update.over25_last5_pct_b = statsB.over25_last5_pct;
        update.btts_last5_pct_b = statsB.btts_last5_pct;
      }

      if (Object.keys(update).length > 0) {
        await supabase.from("predictions").update(update).eq("id", insertedRow[0].id);
        enriched++;
      }

      // Wait to respect free tier limit
      await new Promise(resolve => setTimeout(resolve, WAIT_BETWEEN_REQUESTS));
    }

    return NextResponse.json({
      success: true,
      fetched: fixtures.length,
      inserted,
      enriched,
    });
  } catch (err: any) {
    console.error("Combined route error:", err.message || err);
    return NextResponse.json(
      { error: "Internal server error. Check Vercel logs." },
      { status: 500 }
    );
  }
}