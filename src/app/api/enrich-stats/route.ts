import { NextRequest, NextResponse } from "next/server";
import { computeDixonColes, computeDixonColesHomeAway } from "@/lib/statsUtils";

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

function cleanTeamName(name: string): string {
  const cleaned = name
    .replace(/\bFC\b/gi, "")
    .replace(/\bAFC\b/gi, "")
    .replace(/\bCF\b/gi, "")
    .replace(/\bSC\b/gi, "")
    .replace(/\bAC\b/gi, "")
    .replace(/\bAS\b/gi, "")
    .replace(/\bCD\b/gi, "")
    .replace(/\bCA\b/gi, "")
    .replace(/\bRC\b/gi, "")
    .replace(/\bSS\b/gi, "")
    .replace(/\bUS\b/gi, "")
    .replace(/\bDFB\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

// Helper to compute the current season string for TheSportsDB
function currentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1‑12
  // Most European seasons start in July/August
  const startYear = month >= 7 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

async function getStatsFromTheSportsDB(teamName: string) {
  try {
        const normalised = normaliseTeamName(teamName);
    const cleaned = cleanTeamName(normalised);

    // Try different search queries: original, cleaned, first word, and common variations
    const searchQueries = [
      normalised,
      cleaned,
      cleaned.split(" ")[0],
      normalised.split(" ")[0],
      cleaned.replace(/^(the|los|le|el|il|la|cf|sc|fc|afc|ss|rc|ac|ca)\s+/i, ""),
    ];
        const uniqueQueries = searchQueries
      .map(q => q.trim())
      .filter((q, i, arr) => q.length > 0 && arr.indexOf(q) === i);

    let team: any = null;
    for (const query of uniqueQueries) {
      if (!query) continue;
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(query)}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      const candidates = data.teams || [];
      if (candidates.length > 0) {
        // Score candidates by similarity to original name
        const originalLower = normalised.toLowerCase();
        team = candidates.find((t: any) =>
          t.strTeam.toLowerCase() === originalLower ||
          t.strTeam.toLowerCase().includes(originalLower.split(" ")[0]) ||
          cleanTeamName(t.strTeam).toLowerCase() === cleaned.toLowerCase()
        ) || candidates[0];
        break;
      }
    }

    if (!team?.idTeam) return null;

    // 1) Get last 5 events
    const lastRes = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${team.idTeam}`
    );
    let allResults: any[] = [];
    if (lastRes.ok) {
      const lastData = await lastRes.json();
      allResults = lastData.results || [];
    }

    // 2) If we don't have 10 finished matches yet, fetch the current season
    if (allResults.length < 10) {
      const season = currentSeason();
      const seasonRes = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${team.idTeam}&s=${season}`
      );
      if (seasonRes.ok) {
        const seasonData = await seasonRes.json();
        const seasonEvents = seasonData.events || [];
        // Merge and deduplicate by idEvent
        const seen = new Set(allResults.map((e: any) => e.idEvent));
        for (const event of seasonEvents) {
          if (!seen.has(event.idEvent)) {
            allResults.push(event);
            seen.add(event.idEvent);
          }
        }
      }
    }

    // Keep only finished matches with valid scores, sort by date descending, and take first 10
    const finished = allResults
      .filter((e: any) => {
        const homeScore = parseInt(e.intHomeScore);
        const awayScore = parseInt(e.intAwayScore);
        return !isNaN(homeScore) && !isNaN(awayScore) && e.dateEvent;
      })
      .sort((a: any, b: any) => b.dateEvent.localeCompare(a.dateEvent));

    const recent = finished.slice(0, 10);
    if (recent.length === 0) return null;

    // Build raw match data for Dixon‑Coles
    const rawMatches = recent.map((match: any) => {
      const isHome = match.idHomeTeam === team.idTeam;
      const goalsFor = isHome
        ? parseInt(match.intHomeScore) || 0
        : parseInt(match.intAwayScore) || 0;
      const goalsAgainst = isHome
        ? parseInt(match.intAwayScore) || 0
        : parseInt(match.intHomeScore) || 0;
      return { goalsFor, goalsAgainst, home: isHome };
    });

    return {
      stats: calculateStats(recent, team.idTeam),
      matchCount: recent.length,
      rawMatches,
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

      // ----- Compute Dixon‑Coles if we have raw match data for both teams -----
      if (tsdbA?.rawMatches && tsdbB?.rawMatches) {
        const dc = computeDixonColes(tsdbA.rawMatches, tsdbB.rawMatches);
        update.att_a = dc.attA;
        update.def_a = dc.defA;
        update.att_b = dc.attB;
        update.def_b = dc.defB;
      }

            // ----- Compute home/away Dixon‑Coles -----
      if (tsdbA?.rawMatches && tsdbB?.rawMatches) {
        const homeMatchesA = tsdbA.rawMatches.filter((m: any) => m.home === true);
        const awayMatchesB = tsdbB.rawMatches.filter((m: any) => m.home === false);
        const dcHA = computeDixonColesHomeAway(homeMatchesA, awayMatchesB);
        update.att_home_a = dcHA.attHomeA;
        update.def_home_a = dcHA.defHomeA;
        update.att_away_b = dcHA.attAwayB;
        update.def_away_b = dcHA.defAwayB;
      }

      await supabase.from("predictions").update(update).eq("id", match.id);
      enriched++;
      await new Promise(r => setTimeout(r, 6000));
    }  catch (err) {
      console.error("Enrichment error for", match.match_name, err);
    }
  }

  return NextResponse.json({ success: true, processed: matches.length, enriched });
}