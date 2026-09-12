import { NextResponse } from "next/server";
import { bestMatch } from "@/lib/teamResolver";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ClubEloRow {
  name: string;
  country: string;
  elo: number;
}

async function fetchClubElo(date: string): Promise<ClubEloRow[]> {
  const res = await fetch(`http://api.clubelo.com/${date}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`ClubElo HTTP ${res.status}`);

  const text = await res.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const rows: ClubEloRow[] = [];
  // header: Rank,Club,Country,Level,Elo,From,To
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].split(",");
    if (p.length < 5) continue;
    const name = p[1]?.trim();
    const country = p[2]?.trim() || "";
    const elo = parseInt(p[4]);
    if (!name || isNaN(elo)) continue;
    rows.push({ name, country, elo });
  }
  return rows;
}

export async function GET() {
  const { supabase } = await import("@/lib/supabase");
  const today = new Date().toISOString().split("T")[0];

  try {
    const clubelo = await fetchClubElo(today);
    if (clubelo.length === 0) {
      return NextResponse.json({ error: "ClubElo returned no data" }, { status: 502 });
    }

    // All distinct team names that appear in upcoming predictions
    const { data: upcoming, error: predErr } = await supabase
      .from("predictions")
      .select("team_a, team_b")
      .neq("match_status", "FINISHED");

    if (predErr) throw predErr;

    const teamSet = new Set<string>();
    for (const row of upcoming ?? []) {
      if (row.team_a) teamSet.add(row.team_a);
      if (row.team_b) teamSet.add(row.team_b);
    }
       const teams = Array.from(teamSet);

    if (teams.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No upcoming matches to resolve",
      });
    }

    // Candidates for the matcher (only need {name, ...})
    const candidates = clubelo;

    const resolved: any[] = [];
    const unresolved: string[] = [];

    for (const team of teams) {
      const match = bestMatch(team, candidates, 0.72);
      if (!match) {
        unresolved.push(team);
        continue;
      }
      resolved.push({
        team_name: team,
        clubelo_name: match.candidate.name,
        elo: match.candidate.elo,
        country: match.candidate.country || null,
        match_score: Number(match.score.toFixed(3)),
        updated_at: new Date().toISOString(),
      });
    }

    // Upsert resolved rows in batches
    let upserted = 0;
    for (let i = 0; i < resolved.length; i += 500) {
      const batch = resolved.slice(i, i + 500);
      const { error } = await supabase
        .from("team_ratings")
        .upsert(batch, { onConflict: "team_name" });
      if (error) console.error("[refresh-elo] upsert error", error);
      else upserted += batch.length;
    }

    return NextResponse.json({
      success: true,
      clubelo_total: clubelo.length,
      teams_in_our_db: teams.length,
      resolved: upserted,
      unresolved_count: unresolved.length,
      unresolved_sample: unresolved.slice(0, 20),
    });
  } catch (err: any) {
    console.error("[refresh-elo]", err);
    return NextResponse.json(
      { error: err.message || "Fetch failed" },
      { status: 500 }
    );
  }
}