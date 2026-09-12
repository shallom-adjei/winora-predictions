import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ClubEloRow {
  name: string;
  country: string;
  elo: number;
}

// Static mirror of the full ClubElo dataset. More reliable than api.clubelo.com.
const ELO_CSV_URL =
  "https://huggingface.co/datasets/xgabora/club-football-match-data/resolve/main/EloRatings.csv";

async function fetchEloCsv(): Promise<ClubEloRow[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(ELO_CSV_URL, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Elo CSV HTTP ${res.status}`);

    const text = await res.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) throw new Error("Elo CSV is empty");

    // Parse header to find column indexes
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const dateIdx = header.indexOf("date");
    const clubIdx = header.indexOf("club");
    const countryIdx = header.indexOf("country");
    const eloIdx = header.indexOf("elo");

    if (clubIdx === -1 || eloIdx === -1) {
      throw new Error(`Unexpected CSV header: ${lines[0]}`);
    }

    // The CSV contains historical snapshots. Keep only the LATEST row per club.
    const latest = new Map<string, { date: string; country: string; elo: number }>();

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (parts.length <= Math.max(clubIdx, eloIdx)) continue;

      const club = parts[clubIdx]?.trim();
      const elo = parseFloat(parts[eloIdx]);
      const date = dateIdx >= 0 ? parts[dateIdx]?.trim() : "";
      const country = countryIdx >= 0 ? parts[countryIdx]?.trim() : "";

      if (!club || isNaN(elo)) continue;

      const existing = latest.get(club);
      if (!existing || date > existing.date) {
        latest.set(club, { date, country, elo });
      }
    }

    const rows: ClubEloRow[] = [];
    for (const [club, { country, elo }] of latest.entries()) {
      rows.push({ name: club, country, elo: Math.round(elo) });
    }
    return rows;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const { supabase } = await import("@/lib/supabase");

  try {
    const clubelo = await fetchEloCsv();
    if (clubelo.length === 0) {
      return NextResponse.json({ error: "Elo CSV returned no data" }, { status: 502 });
    }

    // Load all distinct team names in upcoming matches
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

    // Resolve each team via the fuzzy matcher
    const { bestMatch } = await import("@/lib/teamResolver");
    const candidates = clubelo.map((c) => ({ name: c.name, country: c.country, elo: c.elo }));

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