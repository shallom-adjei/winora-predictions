import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// football-data.org numeric competition IDs → human names (for display only)
const COMPETITIONS = [2000, 2001, 2013, 2014, 2015, 2016, 2017, 2018, 2019,
                     2020, 2021, 2002, 2003];

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  const { supabase } = await import("@/lib/supabase");

  // Only fetch standings for competitions that actually have upcoming matches
  const { data: comps } = await supabase
    .from("predictions")
    .select("competition_id")
    .neq("match_status", "FINISHED")
    .not("competition_id", "is", null);

  const uniqueComps: number[] = Array.from(
    new Set((comps ?? []).map((c: any) => c.competition_id))
  ).filter((id) => COMPETITIONS.includes(id));

  if (uniqueComps.length === 0) {
    return NextResponse.json({ success: true, message: "No competitions to update" });
  }

  let updated = 0;
  const errors: string[] = [];

  for (const compId of uniqueComps) {
    try {
      const res = await fetch(
        `https://api.football-data.org/v4/competitions/${compId}/standings`,
        { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
      );

      if (!res.ok) {
        errors.push(`comp ${compId}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const table =
        data.standings?.find((s: any) => s.type === "TOTAL")?.table ?? [];

      const rows = table.map((entry: any) => ({
        team_id: entry.team.id,
        competition_id: compId,
        team_name: entry.team.name,
        position: entry.position,
        points: entry.points,
        played_games: entry.playedGames,
        updated_at: new Date().toISOString(),
      }));

      if (rows.length > 0) {
        const { error } = await supabase
          .from("team_standings")
          .upsert(rows, { onConflict: "team_id,competition_id" });
        if (error) errors.push(`comp ${compId} upsert: ${error.message}`);
        else updated += rows.length;
      }

      await new Promise((r) => setTimeout(r, 6000)); // respect 10 req/min
    } catch (err: any) {
      errors.push(`comp ${compId}: ${err.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    competitions: uniqueComps.length,
    teams_updated: updated,
    errors: errors.length ? errors : undefined,
  });
}