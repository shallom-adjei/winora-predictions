import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ---------- TheSportsDB live / finished score ----------
async function getScoreFromTheSportsDB(teamA: string, teamB: string, matchDate: string) {
  const queries = [`${teamA} vs ${teamB}`, `${teamB} vs ${teamA}`];

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=${encodeURIComponent(q)}`,
        { cache: "no-store" }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const events = data.event || [];

      // First try with exact date
      let target = events.find((e: any) => {
        return e.dateEvent === matchDate && isLiveOrFinished(e.strStatus);
      });
      // Fallback: ignore date
      if (!target) {
        target = events.find((e: any) => isLiveOrFinished(e.strStatus));
      }

      if (target) {
        const homeScore = parseInt(target.intHomeScore) || 0;
        const awayScore = parseInt(target.intAwayScore) || 0;
        const status =
          target.strStatus === "Match Finished" || target.strStatus === "FT"
            ? "FINISHED"
            : "LIVE";
        return { homeScore, awayScore, status };
      }
    } catch {
      // try next query
    }
  }
  return null;
}

function isLiveOrFinished(status: string): boolean {
  return [
    "Match Finished", "FT", "1st Half", "2nd Half", "Half Time", "1H", "2H"
  ].includes(status);
}

// ---------- Main cron handler ----------
export async function GET() {
  const { supabase } = await import("@/lib/supabase");
  const now = new Date();
  const nowISO = now.toISOString();

  // Get matches that have already started and are not finished
  const { data: matches } = await supabase
    .from("predictions")
    .select("id, team_a, team_b, kickoff_time, match_status, main_pick, actual_home_score, actual_away_score")
    .not("kickoff_time", "is", null)
    .neq("match_status", "FINISHED")
    .order("kickoff_time", { ascending: true })
    .limit(10);                            // small batch

  if (!matches || matches.length === 0) {
    return NextResponse.json({ updated: 0, message: "No live/pending matches" });
  }

  let updated = 0;

  for (const match of matches) {
    try {
      const kickoff = new Date(match.kickoff_time);
      const matchDate = kickoff.toISOString().split("T")[0];

      const tsdb = await getScoreFromTheSportsDB(match.team_a, match.team_b, matchDate);
      if (!tsdb) continue;   // not found, skip

      const { homeScore, awayScore, status } = tsdb;

      // Only update if something changed
      if (status !== match.match_status || homeScore !== match.actual_home_score || awayScore !== match.actual_away_score) {
        const updateData: any = {
          match_status: status,
          actual_home_score: homeScore,
          actual_away_score: awayScore,
        };

        if (status === "FINISHED") {
          const actualOutcome =
            homeScore > awayScore ? "Home Win" : homeScore === awayScore ? "Draw" : "Away Win";
          updateData.result = match.main_pick === actualOutcome ? "Win" : "Loss";
        }

        await supabase.from("predictions").update(updateData).eq("id", match.id);
        updated++;
      }
    } catch (err) {
      console.error("Failed to update", match.team_a, match.team_b, err);
    }
    await new Promise(r => setTimeout(r, 6000));   // gentle to API
  }

  console.log(`[cron] updated ${updated} matches`);
  return NextResponse.json({ updated });
}