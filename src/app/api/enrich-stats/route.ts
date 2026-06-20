import { NextRequest, NextResponse } from "next/server";

// ----- Team name normalisation -----
function normaliseTeamName(name: string): string {
  const map: Record<string, string> = {
    "Czechia": "Czech Republic", "Curaçao": "Curacao", "Congo DR": "DR Congo",
    "Cape Verde Islands": "Cape Verde", "Bosnia-Herzegovina": "Bosnia",
    "USA": "United States", "Korea Republic": "South Korea", "Ivory Coast": "Côte d'Ivoire",
    "North Korea": "Korea DPR", "St. Kitts & Nevis": "St. Kitts and Nevis",
    "Trinidad & Tobago": "Trinidad and Tobago", "Antigua & Barbuda": "Antigua and Barbuda",
    "Uzbekistan": "Uzbekistan", "Saudi Arabia": "Saudi Arabia",
    "United Arab Emirates": "UAE", "Korea DPR": "North Korea",
    "São Tomé and Príncipe": "Sao Tome and Principe",
  };
  return map[name] || name;
}

// ----- TheSportsDB stats (up to 10 matches) -----
async function getStatsFromTheSportsDB(teamName: string) {
  try {
    const normalised = normaliseTeamName(teamName);
    let res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(normalised)}`
    );
    if (!res.ok) return null;
    let data = await res.json();
    let team = data.teams?.[0];

    if (!team) {
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

    const recent = results.slice(0, 10);
    return {
      stats: calculateStats(recent, team.idTeam),
      matchCount: recent.length,
    };
  } catch {
    return null;
  }
}

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

// ----- Main enrichment endpoint (TheSportsDB only, never fails) -----
export async function POST(req: NextRequest) {
  const { supabase } = await import("@/lib/supabase");

  const { data: matches } = await supabase
    .from("predictions")
    .select("*")
    .is("form_points_a", null)
    .limit(10);

  if (!matches || matches.length === 0) {
    return NextResponse.json({ success: true, message: "All matches already have full stats." });
  }

  let enriched = 0;

  for (const match of matches) {
    try {
      const update: any = {};

      // Team A
      const tsdbA = await getStatsFromTheSportsDB(match.team_a);
      if (tsdbA) {
        update.form_points_a = tsdbA.stats.form_points;
        update.home_goals_scored = tsdbA.stats.home_goals_scored;
        update.home_goals_conceded = tsdbA.stats.home_goals_conceded;
        update.clean_sheets_last5_a = tsdbA.stats.clean_sheets_last5;
        update.failed_to_score_last5_a = tsdbA.stats.failed_to_score_last5;
        update.over25_last5_pct_a = tsdbA.stats.over25_last5_pct;
        update.btts_last5_pct_a = tsdbA.stats.btts_last5_pct;
        update.matches_used_a = tsdbA.matchCount;
      } else {
        // No stats found – still mark as processed so it doesn't loop forever
        update.form_points_a = 0;
        update.matches_used_a = 0;
      }

      // Team B
      const tsdbB = await getStatsFromTheSportsDB(match.team_b);
      if (tsdbB) {
        update.form_points_b = tsdbB.stats.form_points;
        update.away_goals_scored = tsdbB.stats.home_goals_scored;
        update.away_goals_conceded = tsdbB.stats.home_goals_conceded;
        update.clean_sheets_last5_b = tsdbB.stats.clean_sheets_last5;
        update.failed_to_score_last5_b = tsdbB.stats.failed_to_score_last5;
        update.over25_last5_pct_b = tsdbB.stats.over25_last5_pct;
        update.btts_last5_pct_b = tsdbB.stats.btts_last5_pct;
        update.matches_used_b = tsdbB.matchCount;
      } else {
        update.form_points_b = 0;
        update.matches_used_b = 0;
      }

      await supabase.from("predictions").update(update).eq("id", match.id);
      enriched++;
      await new Promise(r => setTimeout(r, 6000));
    } catch (err) {
      console.error("Enrichment error for", match.match_name, err);
      // Still mark as processed to avoid endless loop
      await supabase.from("predictions").update({ form_points_a: 0, form_points_b: 0 }).eq("id", match.id);
    }
  }

  return NextResponse.json({ success: true, processed: matches.length, enriched });
}