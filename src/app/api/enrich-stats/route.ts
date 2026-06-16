import { NextRequest, NextResponse } from "next/server";

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_API_KEY;

// ----- Team name normalisation (extend as needed) -----
function normaliseTeamName(name: string): string {
  const map: Record<string, string> = {
    "Czechia": "Czech Republic",
    "Curaçao": "Curacao",
    "Congo DR": "DR Congo",
    "Cape Verde Islands": "Cape Verde",
    "Bosnia-Herzegovina": "Bosnia",
    "USA": "United States",
    "Korea Republic": "South Korea",
    "Ivory Coast": "Côte d'Ivoire",
    "North Korea": "Korea DPR",
    "St. Kitts & Nevis": "St. Kitts and Nevis",
    "Trinidad & Tobago": "Trinidad and Tobago",
    "Antigua & Barbuda": "Antigua and Barbuda",
    "Uzbekistan": "Uzbekistan",
    "Saudi Arabia": "Saudi Arabia",
    "United Arab Emirates": "UAE",
    "Korea DPR": "North Korea",
    "São Tomé and Príncipe": "Sao Tome and Principe",
    // Add more as you discover mismatches
  };
  return map[name] || name;
}

// ----- Try TheSportsDB first -----
async function getStatsFromTheSportsDB(teamName: string) {
  try {
    const normalised = normaliseTeamName(teamName);
    // Attempt exact search
    let res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(normalised)}`
    );
    if (!res.ok) return null;
    let data = await res.json();
    let team = data.teams?.[0];

    // If exact search fails, try a fuzzy search (search by name fragment)
    if (!team) {
      // Use the first word of the team name to broaden the search
      const firstWord = normalised.split(" ")[0];
      res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(firstWord)}`
      );
      if (!res.ok) return null;
      data = await res.json();
      team = data.teams?.find((t: any) =>
        t.strTeam.toLowerCase().includes(normalised.toLowerCase())
      );
    }

    if (!team?.idTeam) return null;

    const eventsRes = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${team.idTeam}`
    );
    if (!eventsRes.ok) return null;
    const eventsData = await eventsRes.json();
    const results = eventsData.results || [];
    if (results.length === 0) return null;

    return calculateStats(results, team.idTeam);
  } catch {
    return null;
  }
}

// ----- Fallback to football-data.org if team_id exists -----
async function getStatsFromFootballData(teamId: number) {
  if (!FOOTBALL_DATA_KEY || !teamId) return null;
  try {
    const res = await fetch(
      `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=5`,
      { headers: { "X-Auth-Token": FOOTBALL_DATA_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const matches = data.matches || [];
    if (matches.length === 0) return null;
    return calculateStatsFromFD(matches, teamId);
  } catch {
    return null;
  }
}

// ----- Common statistics calculator for TheSportsDB data -----
function calculateStats(results: any[], teamId: string) {
  let formPoints = 0;
  let homeGoals = 0, homeConceded = 0, homeCount = 0;
  let awayGoals = 0, awayConceded = 0, awayCount = 0;
  let cleanSheets = 0, failedToScore = 0;
  let over25Count = 0, bttsCount = 0;

  for (const match of results) {
    const isHome = match.idHomeTeam === teamId;
    const homeScore = parseInt(match.intHomeScore) || 0;
    const awayScore = parseInt(match.intAwayScore) || 0;

    if (isHome) {
      if (homeScore > awayScore) formPoints += 3;
      else if (homeScore === awayScore) formPoints += 1;
      homeGoals += homeScore;
      homeConceded += awayScore;
      homeCount++;
    } else {
      if (awayScore > homeScore) formPoints += 3;
      else if (awayScore === homeScore) formPoints += 1;
      awayGoals += awayScore;
      awayConceded += homeScore;
      awayCount++;
    }

    const teamScore = isHome ? homeScore : awayScore;
    const opponentScore = isHome ? awayScore : homeScore;
    if (opponentScore === 0) cleanSheets++;
    if (teamScore === 0) failedToScore++;

    const totalGoals = homeScore + awayScore;
    if (totalGoals > 2.5) over25Count++;
    if (homeScore > 0 && awayScore > 0) bttsCount++;
  }

  const total = results.length;
  return {
    form_points: formPoints,
    home_goals_scored: homeCount ? (homeGoals / homeCount).toFixed(1) : null,
    home_goals_conceded: homeCount ? (homeConceded / homeCount).toFixed(1) : null,
    away_goals_scored: awayCount ? (awayGoals / awayCount).toFixed(1) : null,
    away_goals_conceded: awayCount ? (awayConceded / awayCount).toFixed(1) : null,
    clean_sheets_last5: cleanSheets,
    failed_to_score_last5: failedToScore,
    over25_last5_pct: ((over25Count / total) * 100).toFixed(0),
    btts_last5_pct: ((bttsCount / total) * 100).toFixed(0),
  };
}

// ----- Common statistics calculator for football-data.org data -----
function calculateStatsFromFD(matches: any[], teamId: number) {
  let formPoints = 0;
  let homeGoals = 0, homeConceded = 0, homeCount = 0;
  let awayGoals = 0, awayConceded = 0, awayCount = 0;
  let cleanSheets = 0, failedToScore = 0;
  let over25Count = 0, bttsCount = 0;

  for (const m of matches) {
    const isHome = m.homeTeam.id === teamId;
    const homeScore = m.score.fullTime.home || 0;
    const awayScore = m.score.fullTime.away || 0;

    if (isHome) {
      if (m.score.winner === "HOME_TEAM") formPoints += 3;
      else if (m.score.winner === "DRAW") formPoints += 1;
      homeGoals += homeScore;
      homeConceded += awayScore;
      homeCount++;
    } else {
      if (m.score.winner === "AWAY_TEAM") formPoints += 3;
      else if (m.score.winner === "DRAW") formPoints += 1;
      awayGoals += awayScore;
      awayConceded += homeScore;
      awayCount++;
    }

    const teamScore = isHome ? homeScore : awayScore;
    const opponentScore = isHome ? awayScore : homeScore;
    if (opponentScore === 0) cleanSheets++;
    if (teamScore === 0) failedToScore++;

    const totalGoals = homeScore + awayScore;
    if (totalGoals > 2.5) over25Count++;
    if (homeScore > 0 && awayScore > 0) bttsCount++;
  }

  const total = matches.length;
  return {
    form_points: formPoints,
    home_goals_scored: homeCount ? (homeGoals / homeCount).toFixed(1) : null,
    home_goals_conceded: homeCount ? (homeConceded / homeCount).toFixed(1) : null,
    away_goals_scored: awayCount ? (awayGoals / awayCount).toFixed(1) : null,
    away_goals_conceded: awayCount ? (awayConceded / awayCount).toFixed(1) : null,
    clean_sheets_last5: cleanSheets,
    failed_to_score_last5: failedToScore,
    over25_last5_pct: ((over25Count / total) * 100).toFixed(0),
    btts_last5_pct: ((bttsCount / total) * 100).toFixed(0),
  };
}

// ----- Main enrichment endpoint -----
export async function POST(req: NextRequest) {
  const { supabase } = await import("@/lib/supabase");

  // Only process matches that are missing stats (form_points_a is null)
  const { data: matches } = await supabase
    .from("predictions")
    .select("*")
    .is("form_points_a", null)
    .limit(10);   // process 10 at a time

  if (!matches || matches.length === 0) {
    return NextResponse.json({ success: true, message: "All matches already have stats." });
  }

  let enriched = 0;
  let failed = 0;

  for (const match of matches) {
    try {
      let statsA = null, statsB = null;

      // Try TheSportsDB first
      statsA = await getStatsFromTheSportsDB(match.team_a);
      statsB = await getStatsFromTheSportsDB(match.team_b);

      // Fallback to football-data.org if team_id exists
      if (!statsA && match.team_id_a) statsA = await getStatsFromFootballData(match.team_id_a);
      if (!statsB && match.team_id_b) statsB = await getStatsFromFootballData(match.team_id_b);

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

      // Gentle delay
      await new Promise(r => setTimeout(r, 7000));
    } catch (err) {
      console.error(`Enrichment failed for ${match.match_name}`, err);
      failed++;
    }
  }

  return NextResponse.json({ success: true, processed: matches.length, enriched, failed });
}