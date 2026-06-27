import { NextResponse } from "next/server";
import { updateElo } from "@/lib/eloUtils";

export const dynamic = "force-dynamic";

// ----- Team name normalisation (same as enrich-stats) -----
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

// ---------- TheSportsDB fallback ----------
async function getScoreFromTheSportsDB(teamA: string, teamB: string, matchDate: string) {
  const normalA = normaliseTeamName(teamA);
  const normalB = normaliseTeamName(teamB);
  const queries = [`${normalA} vs ${normalB}`, `${normalB} vs ${normalA}`];

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=${encodeURIComponent(q)}`,
        { cache: "no-store" }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const events = data.event || [];
      const target = events.find((e: any) => {
        return e.dateEvent === matchDate && isLiveOrFinished(e.strStatus);
      });
      if (target) {
        const homeScore = parseInt(target.intHomeScore) || 0;
        const awayScore = parseInt(target.intAwayScore) || 0;
        const status = target.strStatus === "Match Finished" || target.strStatus === "FT" ? "FINISHED" : "LIVE";
        return { homeScore, awayScore, status };
      }
    } catch { /* skip */ }
  }
  return null;
}

function isLiveOrFinished(status: string): boolean {
  return ["Match Finished","FT","1st Half","2nd Half","Half Time","1H","2H"].includes(status);
}

// ---------- football-data.org primary ----------
async function getScoreFromFootballData(fixtureId: number) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://api.football-data.org/v4/matches/${fixtureId}`,
      { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const fixture = await res.json();
    const rawStatus = fixture.status;
    const homeScore = fixture.score?.fullTime?.home ?? null;
    const awayScore = fixture.score?.fullTime?.away ?? null;
    let newStatus = rawStatus;
    if (rawStatus === "IN_PLAY" || rawStatus === "PAUSED") newStatus = "LIVE";
    else if (rawStatus === "FINISHED") newStatus = "FINISHED";
    return { homeScore, awayScore, newStatus };
  } catch {
    return null;
  }
}

// ---------- Main cron handler ----------
export async function GET() {
  const { supabase } = await import("@/lib/supabase");
  const now = new Date();
  const nowISO = now.toISOString();

  const { data: matches } = await supabase
    .from("predictions")
        .select("id, fixture_id, team_a, team_b, kickoff_time, match_status, main_pick, actual_home_score, actual_away_score, sport, competition_id")
    .not("kickoff_time", "is", null)
    .lte("kickoff_time", nowISO)
    .neq("match_status", "FINISHED")
    .order("kickoff_time", { ascending: true })
    .limit(5);   // only 5 matches per run – far below 10 req/min

  if (!matches || matches.length === 0) {
    return NextResponse.json({ updated: 0, message: "No live/pending matches" });
  }

  let updated = 0;

  for (const match of matches) {
    try {
      let homeScore: number | null = null;
      let awayScore: number | null = null;
      let newStatus = match.match_status;

      // 1) football-data.org (if fixture_id exists)
      if (match.fixture_id) {
        const fd = await getScoreFromFootballData(match.fixture_id);
        if (fd) {
          homeScore = fd.homeScore;
          awayScore = fd.awayScore;
          newStatus = fd.newStatus;
        }
      }

      // 2) TheSportsDB fallback
      if (homeScore == null && match.kickoff_time) {
        const kickoff = new Date(match.kickoff_time);
        const matchDate = kickoff.toISOString().split("T")[0];
        const tsdb = await getScoreFromTheSportsDB(match.team_a, match.team_b, matchDate);
        if (tsdb) {
          homeScore = tsdb.homeScore;
          awayScore = tsdb.awayScore;
          newStatus = tsdb.status;
        }
      }

      // 3) Update if anything changed
      if (newStatus !== match.match_status || homeScore !== match.actual_home_score || awayScore !== match.actual_away_score) {
        const updateData: any = { match_status: newStatus };
        if (homeScore != null) updateData.actual_home_score = homeScore;
        if (awayScore != null) updateData.actual_away_score = awayScore;

        if (newStatus === "FINISHED" && homeScore != null && awayScore != null) {
          const actualOutcome = homeScore > awayScore ? "Home Win" : homeScore === awayScore ? "Draw" : "Away Win";
          updateData.result = match.main_pick === actualOutcome ? "Win" : "Loss";

                    // Update prediction_logs with actual outcomes
          const totalGoals = (homeScore ?? 0) + (awayScore ?? 0);
          const bothScored = (homeScore ?? 0) > 0 && (awayScore ?? 0) > 0;
          await supabase
            .from("prediction_logs")
            .update({
              actual_home_score: homeScore,
              actual_away_score: awayScore,
              result_home_win: homeScore > awayScore,
              result_draw: homeScore === awayScore,
              result_away_win: awayScore > homeScore,
              result_over25: totalGoals > 2.5,
              result_btts: bothScored,
            })
            .eq("prediction_id", match.id);

          // ----- Update Elo ratings -----
          try {
            // Fetch current Elo (default 1500)
            const { data: eloDataA } = await supabase
              .from("team_elos")
              .select("elo_rating")
              .eq("team_name", match.team_a)
              .maybeSingle();
            const { data: eloDataB } = await supabase
              .from("team_elos")
              .select("elo_rating")
              .eq("team_name", match.team_b)
              .maybeSingle();

            const currentEloA = eloDataA?.elo_rating ?? 1500;
            const currentEloB = eloDataB?.elo_rating ?? 1500;

            // Determine result from team A's perspective
            let resultPerspective: "Win" | "Loss" | "Draw";
            if (actualOutcome === "Home Win") resultPerspective = "Win";
            else if (actualOutcome === "Draw") resultPerspective = "Draw";
            else resultPerspective = "Loss";

            const competition = match.sport || "Unknown";
            const [newEloA, newEloB] = updateElo(currentEloA, currentEloB, resultPerspective, competition);

            // Upsert both
            await supabase.from("team_elos").upsert({
              team_name: match.team_a,
              elo_rating: newEloA,
              updated_at: new Date().toISOString(),
            });
            await supabase.from("team_elos").upsert({
              team_name: match.team_b,
              elo_rating: newEloB,
              updated_at: new Date().toISOString(),
            });
          } catch (eloErr) {
            console.error("Elo update failed for", match.team_a, match.team_b, eloErr);
          }
        }

        await supabase.from("predictions").update(updateData).eq("id", match.id);
        updated++;

      }
    } catch (err) {
      console.error("Failed to update fixture", match.fixture_id || match.team_a, err);
    }
    await new Promise(r => setTimeout(r, 6000));   // 6 seconds between calls
  }

  console.log(`[cron] updated ${updated} matches`);
  return NextResponse.json({ updated });
}