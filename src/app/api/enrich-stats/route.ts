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

function removeDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cleanTeamName(name: string): string {
  return removeDiacritics(name)
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
    .replace(/\bClub\b/gi, "")
    .replace(/\bDe\b/gi, "")
    .replace(/\bDel\b/gi, "")
    .replace(/\bLa\b/gi, "")
    .replace(/\bEl\b/gi, "")
    .replace(/\bLos\b/gi, "")
    .replace(/\bLe\b/gi, "")
    .replace(/\bIl\b/gi, "")
    .replace(/\bDella\b/gi, "")
    .replace(/\bDas\b/gi, "")
    .replace(/\bDos\b/gi, "")
    .replace(/\bDa\b/gi, "")
    .replace(/\bDo\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}


function seasonString(offset: number = 0): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1 = Jan, 12 = Dec
  // Most European club seasons start in July/August
  const baseStartYear = month >= 7 ? year : year - 1;
  const startYear = baseStartYear + offset;
  return `${startYear}-${startYear + 1}`;
}

async function getStatsFromTheSportsDB(teamName: string, leagueHint?: string) {
  try {
          const normalised = normaliseTeamName(teamName);
    const cleaned = cleanTeamName(normalised);

    // Build several possible queries, from most complete to most generic
    const queries = [
      cleaned,
      normalised,
      cleaned.split(" ").slice(0, 2).join(" "),          // first two words
      cleaned.split(" ")[0],                              // just city/first name
      cleaned.replace(/^(the|los|le|el|il|la|cf|sc|fc|afc|ss|rc|ac|ca)\s+/i, ""),
    ];

    const uniqueQueries = queries
      .map(q => q.trim())
      .filter((q, i, arr) => q.length > 0 && arr.indexOf(q) === i);

    let team: any = null;

    for (const q of uniqueQueries) {
      try {
        const res = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(q)}`
        );
        if (!res.ok) {
          console.log(`[enrich] search failed ${res.status} for "${q}"`);
          continue;
        }
        const data = await res.json();
        const candidates: any[] = data.teams || [];
        if (candidates.length === 0) continue;

        // Try to match by league hint (e.g. "Premier League", "La Liga")
        if (leagueHint) {
          const hint = leagueHint.toLowerCase();
          const matched = candidates.find((t) =>
            t.strLeague?.toLowerCase().includes(hint) ||
            hint.includes(t.strLeague?.toLowerCase() || "____")
          );
          if (matched) {
            team = matched;
            break;
          }
        }

        // Otherwise prefer English/Soccer teams with a valid idTeam
        const soccerTeam = candidates.find(
          (t) => t.strSport === "Soccer" && t.idTeam
        );
        team = soccerTeam || candidates[0];
        break;
      } catch (err) {
        console.log(`[enrich] search error for "${q}"`, err);
      }
    }

       if (!team?.idTeam) {
      console.log(
        `[enrich] no team match for "${teamName}" (league: ${leagueHint || "n/a"})`
      );
      return null;
    }

    // 1) Get last 5 events
    const lastRes = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${team.idTeam}`
    );
    let allResults: any[] = [];
    if (lastRes.ok) {
      const lastData = await lastRes.json();
      allResults = lastData.results || [];
    }

    // 2) Fetch additional matches from current + previous seasons
    const seasonsToTry = [0, -1, -2]; 

    for (const offset of seasonsToTry) {
      if (allResults.length >= 15) break;

      const season = seasonString(offset);
      try {
        const seasonRes = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${team.idTeam}&s=${season}`
        );
        if (!seasonRes.ok) continue;

        const seasonData = await seasonRes.json();
        const seasonEvents = seasonData.events || [];
        const seen = new Set(allResults.map((e: any) => e.idEvent));

        for (const event of seasonEvents) {
          if (event.idEvent && !seen.has(event.idEvent)) {
            allResults.push(event);
            seen.add(event.idEvent);
          }
        }
      } catch (err) {
        console.log(`[enrich] season fetch failed for "${teamName}" (${season})`, err);
      }

      // Small delay between season fetches to respect rate limits
      await new Promise(r => setTimeout(r, 500));
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
       if (recent.length === 0) {
      console.log(
        `[enrich] no finished matches for "${teamName}" (team ${team.idTeam})`
      );
      return null;
    }

    // Build raw match data for Dixon‑Coles
    const rawMatches = recent.map((match: any) => {
     const isHome = String(match.idHomeTeam) === String(team.idTeam);
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

// ----- Main enrichment endpoint (TheSportsDB only, never fails) -----
export async function POST(req: NextRequest) {
  const { supabase } = await import("@/lib/supabase");

  const { data: matches } = await supabase
    .from("predictions")
    .select("*")
    .or("form_points_a.is.null,form_points_b.is.null")
    .lt("enrichment_attempts", 3)
    .order("enrichment_attempts", { ascending: true })
    .limit(10);

  if (!matches || matches.length === 0) {
    return NextResponse.json({ success: true, message: "All matches already have full stats." });
  }

  let enriched = 0;

  for (const match of matches) {
    try {
      const update: any = {};

          // Team A
      const leagueHint = match.league || undefined;
      const tsdbA = await getStatsFromTheSportsDB(match.team_a, leagueHint);
      if (tsdbA) {
        update.form_points_a = tsdbA.stats.form_points;
        update.home_goals_scored = tsdbA.stats.home_goals_scored;
        update.home_goals_conceded = tsdbA.stats.home_goals_conceded;
        update.clean_sheets_last5_a = tsdbA.stats.clean_sheets_last5;
        update.failed_to_score_last5_a = tsdbA.stats.failed_to_score_last5;
        update.over25_last5_pct_a = tsdbA.stats.over25_last5_pct;
        update.btts_last5_pct_a = tsdbA.stats.btts_last5_pct;
        update.matches_used_a = tsdbA.matchCount;
      }

            // Team B
      const tsdbB = await getStatsFromTheSportsDB(match.team_b, leagueHint);
      if (tsdbB) {
        update.form_points_b = tsdbB.stats.form_points;
        update.away_goals_scored = tsdbB.stats.away_goals_scored;
        update.away_goals_conceded = tsdbB.stats.away_goals_conceded;
        update.clean_sheets_last5_b = tsdbB.stats.clean_sheets_last5;
        update.failed_to_score_last5_b = tsdbB.stats.failed_to_score_last5;
        update.over25_last5_pct_b = tsdbB.stats.over25_last5_pct;
        update.btts_last5_pct_b = tsdbB.stats.btts_last5_pct;
        update.matches_used_b = tsdbB.matchCount;
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

      update.enrichment_attempts = (match.enrichment_attempts || 0) + 1;
      await supabase.from("predictions").update(update).eq("id", match.id);
      enriched++;
      await new Promise(r => setTimeout(r, 6000));
    }  catch (err) {
      console.error("Enrichment error for", match.match_name, err);
    }
  }

  return NextResponse.json({ success: true, processed: matches.length, enriched });
}