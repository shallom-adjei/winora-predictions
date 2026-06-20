import { NextRequest, NextResponse } from "next/server";

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_API_KEY;

// ----- Team name normalisation (extend as needed) -----
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

// ----- TheSportsDB: get up to `limit` recent finished matches -----
async function getStatsFromTheSportsDB(teamName: string, limit = 10) {
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

    // Limit to the most recent `limit` matches
    const recent = results.slice(0, limit);
    return {
      stats: calculateStats(recent, team.idTeam),
      matchCount: recent.length,
    };
  } catch {
    return null;
  }
}

// ----- football-data.org: get up to `limit` recent finished matches -----
async function getStatsFromFootballData(teamId: number, limit = 10) {
  if (!FOOTBALL_DATA_KEY || !teamId) return null;
  try {
    const res = await fetch(
      `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=${limit}`,
      { headers: { "X-Auth-Token": FOOTBALL_DATA_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const matches = data.matches || [];
    if (matches.length === 0) return null;
    return {
      stats: calculateStatsFromFD(matches, teamId),
      matchCount: matches.length,
    };
  } catch {
    return null;
  }
}

// ----- Long‑term competition history (World Cup) -----
async function getLongTermCompetitionStats(teamId: number, competitionId: number) {
  if (!FOOTBALL_DATA_KEY || !teamId || !competitionId) return null;
  try {
    const res = await fetch(
      `https://api.football-data.org/v4/teams/${teamId}/matches?competitions=${competitionId}&status=FINISHED&limit=10`,
      { headers: { "X-Auth-Token": FOOTBALL_DATA_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const matches = data.matches || [];
    if (matches.length < 2) return null;
    return {
      stats: calculateStatsFromFD(matches, teamId),
      matchCount: matches.length,
    };
  } catch {
    return null;
  }
}

// ----- Merge two stat objects (weighted by match count) -----
function mergeStats(statsA: any, countA: number, statsB: any, countB: number) {
  if (!statsA && !statsB) return null;
  if (!statsA) return { stats: statsB, matchCount: countB };
  if (!statsB) return { stats: statsA, matchCount: countA };

  const total = countA + countB;
  const merge = (key: string) => {
    const valA = Number(statsA[key]) || 0;
    const valB = Number(statsB[key]) || 0;
    return ((valA * countA + valB * countB) / total).toFixed(1);
  };

  return {
    stats: {
      form_points: Math.round((statsA.form_points * countA + statsB.form_points * countB) / total),
      home_goals_scored: merge("home_goals_scored"),
      home_goals_conceded: merge("home_goals_conceded"),
      away_goals_scored: merge("away_goals_scored"),
      away_goals_conceded: merge("away_goals_conceded"),
      clean_sheets_last5: Math.round((statsA.clean_sheets_last5 * countA + statsB.clean_sheets_last5 * countB) / total),
      failed_to_score_last5: Math.round((statsA.failed_to_score_last5 * countA + statsB.failed_to_score_last5 * countB) / total),
      over25_last5_pct: Math.round((Number(statsA.over25_last5_pct) * countA + Number(statsB.over25_last5_pct) * countB) / total),
      btts_last5_pct: Math.round((Number(statsA.btts_last5_pct) * countA + Number(statsB.btts_last5_pct) * countB) / total),
    },
    matchCount: total,
  };
}

// ----- TheSportsDB stat calculator (unchanged) -----
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

// ----- football-data.org stat calculator (unchanged) -----
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

// ----- H2H from football-data.org (competition-aware) -----
async function getH2H(teamIdA: number, teamIdB: number, competitionId: number) {
  if (!FOOTBALL_DATA_KEY || !teamIdA || !teamIdB) return null;
  try {
    let url = `https://api.football-data.org/v4/matches?homeTeamId=${teamIdA}&awayTeamId=${teamIdB}&competitionId=${competitionId}&limit=5`;
    let res = await fetch(url, { headers: { "X-Auth-Token": FOOTBALL_DATA_KEY } });
    if (!res.ok) return null;
    let data = await res.json();
    let matches = data.matches || [];

    if (matches.length === 0) {
      url = `https://api.football-data.org/v4/matches?homeTeamId=${teamIdA}&awayTeamId=${teamIdB}&limit=5`;
      res = await fetch(url, { headers: { "X-Auth-Token": FOOTBALL_DATA_KEY } });
      if (!res.ok) return null;
      data = await res.json();
      matches = data.matches || [];
    }

    if (matches.length === 0) return null;

    let homeWins = 0, draws = 0, awayWins = 0;
    let over25 = 0, btts = 0;
    for (const m of matches) {
      const homeGoals = m.score.fullTime.home ?? 0;
      const awayGoals = m.score.fullTime.away ?? 0;
      if (homeGoals > awayGoals) homeWins++;
      else if (homeGoals === awayGoals) draws++;
      else awayWins++;
      if (homeGoals + awayGoals > 2.5) over25++;
      if (homeGoals > 0 && awayGoals > 0) btts++;
    }
    const total = matches.length;
    return {
      h2h_home_wins: homeWins,
      h2h_draws: draws,
      h2h_away_wins: awayWins,
      h2h_over25_pct: Math.round((over25 / total) * 100),
      h2h_btts_pct: Math.round((btts / total) * 100),
    };
  } catch {
    return null;
  }
}

// ----- Standings -----
async function getStandings(competitionId: number) {
  if (!FOOTBALL_DATA_KEY || !competitionId) return null;
  try {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${competitionId}/standings`,
      { headers: { "X-Auth-Token": FOOTBALL_DATA_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const standings = data.standings?.[0]?.table;
    if (!standings) return null;
    const posMap: Record<string, number> = {};
    for (const entry of standings) {
      posMap[entry.team.name] = entry.position;
      if (entry.team.id) posMap[String(entry.team.id)] = entry.position;
    }
    return posMap;
  } catch {
    return null;
  }
}

// ----- Main enrichment endpoint -----
export async function POST(req: NextRequest) {
  const { supabase } = await import("@/lib/supabase");

  // Phase 1 – basic stats + H2H + standings (for matches where form_points_a is null)
  const { data: matches } = await supabase
    .from("predictions")
    .select("*")
    .is("form_points_a", null)
    .limit(10);

  if (matches && matches.length > 0) {
    let enriched = 0, failed = 0;

    for (const match of matches) {
      try {
        const update: any = {};

        // ----- Team A -----
        let statsA: any = null, countA = 0;
        const tsdbA = await getStatsFromTheSportsDB(match.team_a, 10);
        if (tsdbA) { statsA = tsdbA.stats; countA = tsdbA.matchCount; }

        let fdA = null;
        if (match.team_id_a) fdA = await getStatsFromFootballData(match.team_id_a, 10);
        if (fdA) {
          const merged = mergeStats(statsA, countA, fdA.stats, fdA.matchCount);
          if (merged) { statsA = merged.stats; countA = merged.matchCount; }
        }

        // Long‑term fallback if still < 8 matches
        if (countA < 8 && match.team_id_a && match.competition_id) {
          const longTermA = await getLongTermCompetitionStats(match.team_id_a, match.competition_id);
          if (longTermA) {
            const merged = mergeStats(statsA, countA, longTermA.stats, longTermA.matchCount);
            if (merged) { statsA = merged.stats; countA = merged.matchCount; }
          }
        }

        // ----- Team B -----
        let statsB: any = null, countB = 0;
        const tsdbB = await getStatsFromTheSportsDB(match.team_b, 10);
        if (tsdbB) { statsB = tsdbB.stats; countB = tsdbB.matchCount; }

        let fdB = null;
        if (match.team_id_b) fdB = await getStatsFromFootballData(match.team_id_b, 10);
        if (fdB) {
          const merged = mergeStats(statsB, countB, fdB.stats, fdB.matchCount);
          if (merged) { statsB = merged.stats; countB = merged.matchCount; }
        }

        if (countB < 8 && match.team_id_b && match.competition_id) {
          const longTermB = await getLongTermCompetitionStats(match.team_id_b, match.competition_id);
          if (longTermB) {
            const merged = mergeStats(statsB, countB, longTermB.stats, longTermB.matchCount);
            if (merged) { statsB = merged.stats; countB = merged.matchCount; }
          }
        }

        // Store stats
        if (statsA) {
          update.form_points_a = statsA.form_points;
          update.home_goals_scored = statsA.home_goals_scored;
          update.home_goals_conceded = statsA.home_goals_conceded;
          update.clean_sheets_last5_a = statsA.clean_sheets_last5;
          update.failed_to_score_last5_a = statsA.failed_to_score_last5;
          update.over25_last5_pct_a = statsA.over25_last5_pct;
          update.btts_last5_pct_a = statsA.btts_last5_pct;
          update.matches_used_a = countA;
        }
        if (statsB) {
          update.form_points_b = statsB.form_points;
          update.away_goals_scored = statsB.home_goals_scored;
          update.away_goals_conceded = statsB.home_goals_conceded;
          update.clean_sheets_last5_b = statsB.clean_sheets_last5;
          update.failed_to_score_last5_b = statsB.failed_to_score_last5;
          update.over25_last5_pct_b = statsB.over25_last5_pct;
          update.btts_last5_pct_b = statsB.btts_last5_pct;
          update.matches_used_b = countB;
        }

        // H2H
        if (match.team_id_a && match.team_id_b && match.competition_id) {
          const h2h = await getH2H(match.team_id_a, match.team_id_b, match.competition_id);
          if (h2h) {
            update.h2h_home_wins = h2h.h2h_home_wins;
            update.h2h_draws = h2h.h2h_draws;
            update.h2h_away_wins = h2h.h2h_away_wins;
            update.h2h_over25_pct = h2h.h2h_over25_pct;
            update.h2h_btts_pct = h2h.h2h_btts_pct;
          }
        }

        // Standings (league position)
        if (match.competition_id) {
          const posMap = await getStandings(match.competition_id);
          if (posMap) {
            const posA = posMap[match.team_a] || posMap[String(match.team_id_a)];
            const posB = posMap[match.team_b] || posMap[String(match.team_id_b)];
            if (posA) update.league_position_a = posA;
            if (posB) update.league_position_b = posB;
          }
        }

        if (Object.keys(update).length > 0) {
          await supabase.from("predictions").update(update).eq("id", match.id);
          enriched++;
        } else {
          failed++;
        }
        // 10‑second delay for safety (6 API calls per match max: 2 TSDB + 2 FD + long-term + H2H + standings)
        await new Promise(r => setTimeout(r, 10000));
      } catch (err) {
        console.error("Enrichment failed for", match.match_name, err);
        failed++;
      }
    }

    return NextResponse.json({ success: true, processed: matches.length, enriched, failed });
  }

  // Phase 2 – H2H and position only for matches that already have basic stats but lack H2H
  const { data: matchesNeedH2H } = await supabase
    .from("predictions")
    .select("*")
    .not("form_points_a", "is", null)
    .is("h2h_home_wins", null)
    .limit(10);

  if (!matchesNeedH2H || matchesNeedH2H.length === 0) {
    return NextResponse.json({ success: true, message: "All matches already have full stats." });
  }

  let updated = 0, skipped = 0;
  for (const match of matchesNeedH2H) {
    try {
      const updates: any = {};
      if (match.team_id_a && match.team_id_b && match.competition_id) {
        const h2h = await getH2H(match.team_id_a, match.team_id_b, match.competition_id);
        if (h2h) {
          updates.h2h_home_wins = h2h.h2h_home_wins;
          updates.h2h_draws = h2h.h2h_draws;
          updates.h2h_away_wins = h2h.h2h_away_wins;
          updates.h2h_over25_pct = h2h.h2h_over25_pct;
          updates.h2h_btts_pct = h2h.h2h_btts_pct;
        }
      }
      if (match.competition_id) {
        const posMap = await getStandings(match.competition_id);
        if (posMap) {
          const posA = posMap[match.team_a] || posMap[String(match.team_id_a)];
          const posB = posMap[match.team_b] || posMap[String(match.team_id_b)];
          if (posA) updates.league_position_a = posA;
          if (posB) updates.league_position_b = posB;
        }
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from("predictions").update(updates).eq("id", match.id);
        updated++;
      } else {
        skipped++;
      }
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error("H2H/Position enrichment failed", err);
      skipped++;
    }
  }
  return NextResponse.json({ success: true, processed: matchesNeedH2H.length, enrichedH2H: updated, skipped });
}