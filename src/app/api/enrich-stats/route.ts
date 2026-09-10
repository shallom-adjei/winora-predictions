import { NextRequest, NextResponse } from "next/server";
import { computeDixonColes, computeDixonColesHomeAway } from "@/lib/statsUtils";

// ============================================================
// Stats fetch from football-data.org
// Uses team_id_a / team_id_b which are already stored on every prediction
// Free tier: 10 requests per minute → 2 requests per match + 6s delay each
// ============================================================
async function getStatsFromFootballData(
  teamId: number | string | null,
  apiKey: string
) {
  if (!teamId) return null;

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/teams/${teamId}/matches?limit=20`,
      {
        headers: { "X-Auth-Token": apiKey },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.log(`[enrich] football-data ${res.status} for team ${teamId}`);
      return null;
    }

    const data = await res.json();
    const allMatches = data.matches || [];

    // Keep only finished matches with valid scores, sort newest first, take 10
    const finished = allMatches
      .filter(
        (m: any) =>
          m.status === "FINISHED" &&
          m.score?.fullTime?.home != null &&
          m.score?.fullTime?.away != null
      )
      .sort((a: any, b: any) =>
        (b.utcDate || "").localeCompare(a.utcDate || "")
      )
      .slice(0, 10);

    if (finished.length === 0) return null;

    // Adapt to the same shape calculateStats expects (TheSportsDB shape)
    const adapted = finished.map((m: any) => ({
      idEvent: String(m.id),
      dateEvent: (m.utcDate || "").split("T")[0],
      idHomeTeam: String(m.homeTeam?.id ?? ""),
      idAwayTeam: String(m.awayTeam?.id ?? ""),
      intHomeScore: String(m.score.fullTime.home),
      intAwayScore: String(m.score.fullTime.away),
    }));

    // Raw match data for Dixon-Coles
    const rawMatches = adapted.map((m: any) => {
      const isHome = String(m.idHomeTeam) === String(teamId);
      return {
        goalsFor: isHome ? Number(m.intHomeScore) : Number(m.intAwayScore),
        goalsAgainst: isHome ? Number(m.intAwayScore) : Number(m.intHomeScore),
        home: isHome,
      };
    });

    return {
      stats: calculateStats(adapted, String(teamId)),
      matchCount: adapted.length,
      rawMatches,
    };
  } catch (err) {
    console.log(`[enrich] football-data fetch error for team ${teamId}`, err);
    return null;
  }
}

// ============================================================
// Aggregate stats from a list of matches (unchanged logic)
// ============================================================
function calculateStats(results: any[], teamId: string) {
  let formPoints = 0;
  let homeGoals = 0, homeConceded = 0, homeCount = 0;
  let awayGoals = 0, awayConceded = 0, awayCount = 0;
  let cleanSheets = 0, failedToScore = 0;
  let over25Count = 0, bttsCount = 0;

  for (const match of results) {
    const isHome = String(match.idHomeTeam) === String(teamId);
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

// ============================================================
// Main enrichment endpoint
// ============================================================
export async function POST(req: NextRequest) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing FOOTBALL_DATA_API_KEY" },
      { status: 500 }
    );
  }

  const { supabase } = await import("@/lib/supabase");

  const { data: matches } = await supabase
    .from("predictions")
    .select("*")
    .or("form_points_a.is.null,form_points_b.is.null")
    .lt("enrichment_attempts", 3)
    .order("enrichment_attempts", { ascending: true })
    .limit(10);

  if (!matches || matches.length === 0) {
    return NextResponse.json({
      success: true,
      message: "All matches already have full stats.",
    });
  }

  let enriched = 0;

  for (const match of matches) {
    try {
      const update: any = {};

      // Team A — home side
      const statsA = await getStatsFromFootballData(match.team_id_a, apiKey);
      if (statsA) {
        update.form_points_a = statsA.stats.form_points;
        update.home_goals_scored = statsA.stats.home_goals_scored;
        update.home_goals_conceded = statsA.stats.home_goals_conceded;
        update.clean_sheets_last5_a = statsA.stats.clean_sheets_last5;
        update.failed_to_score_last5_a = statsA.stats.failed_to_score_last5;
        update.over25_last5_pct_a = statsA.stats.over25_last5_pct;
        update.btts_last5_pct_a = statsA.stats.btts_last5_pct;
        update.matches_used_a = statsA.matchCount;
      }
      await new Promise((r) => setTimeout(r, 6000)); // rate limit

      // Team B — away side
      const statsB = await getStatsFromFootballData(match.team_id_b, apiKey);
      if (statsB) {
        update.form_points_b = statsB.stats.form_points;
        update.away_goals_scored = statsB.stats.away_goals_scored;
        update.away_goals_conceded = statsB.stats.away_goals_conceded;
        update.clean_sheets_last5_b = statsB.stats.clean_sheets_last5;
        update.failed_to_score_last5_b = statsB.stats.failed_to_score_last5;
        update.over25_last5_pct_b = statsB.stats.over25_last5_pct;
        update.btts_last5_pct_b = statsB.stats.btts_last5_pct;
        update.matches_used_b = statsB.matchCount;
      }
      await new Promise((r) => setTimeout(r, 6000)); // rate limit

      // Dixon-Coles
      if (statsA?.rawMatches && statsB?.rawMatches) {
        const dc = computeDixonColes(statsA.rawMatches, statsB.rawMatches);
        update.att_a = dc.attA;
        update.def_a = dc.defA;
        update.att_b = dc.attB;
        update.def_b = dc.defB;

        const homeMatchesA = statsA.rawMatches.filter((m: any) => m.home === true);
        const awayMatchesB = statsB.rawMatches.filter((m: any) => m.home === false);
        const dcHA = computeDixonColesHomeAway(homeMatchesA, awayMatchesB);
        update.att_home_a = dcHA.attHomeA;
        update.def_home_a = dcHA.defHomeA;
        update.att_away_b = dcHA.attAwayB;
        update.def_away_b = dcHA.defAwayB;
      }

      update.enrichment_attempts = (match.enrichment_attempts || 0) + 1;
      await supabase.from("predictions").update(update).eq("id", match.id);
      enriched++;
    } catch (err) {
      console.error("Enrichment error for", match.match_name, err);
    }
  }

  return NextResponse.json({
    success: true,
    processed: matches.length,
    enriched,
  });
}