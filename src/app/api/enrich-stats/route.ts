import { NextRequest, NextResponse } from "next/server";

// Expanded name normalisation for common mismatches
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
    "St. Vincent & Grenadines": "St. Vincent and the Grenadines",
    "Trinidad & Tobago": "Trinidad and Tobago",
    "Antigua & Barbuda": "Antigua and Barbuda",
    // Add any others as needed
  };
  return map[name] || name;
}

async function getTeamStatsTheSportsDB(teamName: string) {
  try {
    const normalised = normaliseTeamName(teamName);
    const searchRes = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(normalised)}`
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const team = searchData.teams?.[0];
    if (!team?.idTeam) return null;

    const eventsRes = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${team.idTeam}`
    );
    if (!eventsRes.ok) return null;
    const eventsData = await eventsRes.json();
    const results = eventsData.results || [];
    if (results.length === 0) return null;

    let formPoints = 0;
    let homeGoals = 0, homeConceded = 0, homeCount = 0;
    let awayGoals = 0, awayConceded = 0, awayCount = 0;
    let cleanSheets = 0, failedToScore = 0;
    let over25Count = 0, bttsCount = 0;

    for (const match of results) {
      const isHome = match.idHomeTeam === team.idTeam;
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
  } catch (err) {
    console.error("TheSportsDB stats error for", teamName, err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { supabase } = await import("@/lib/supabase");

  // Process up to 15 matches at a time
  const { data: matches } = await supabase
    .from("predictions")
    .select("*")
    .is("form_points_a", null)
    .not("team_id_a", "is", null)
    .not("team_id_b", "is", null)
    .limit(15);

  if (!matches || matches.length === 0) {
    return NextResponse.json({ success: true, message: "All matches already have stats." });
  }

  let enriched = 0;
  let failed = 0;

  for (const match of matches) {
    try {
      const [statsA, statsB] = await Promise.all([
        getTeamStatsTheSportsDB(match.team_a),
        getTeamStatsTheSportsDB(match.team_b),
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

      // Longer delay to stay safe
      await new Promise(r => setTimeout(r, 4000));
    } catch (err) {
      console.error(`Enrichment failed for ${match.match_name}`, err);
      failed++;
    }
  }

  return NextResponse.json({ success: true, processed: matches.length, enriched, failed });
}