import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { supabase } = await import("@/lib/supabase");

  const { data: teamsData, error } = await supabase
    .from("predictions")
    .select("id, team_a, team_b, crest_a, crest_b");

  if (error || !teamsData) {
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
  }

  const teamSet = new Set<string>();
  for (const m of teamsData) {
    if (!m.crest_a) teamSet.add(m.team_a);
    if (!m.crest_b) teamSet.add(m.team_b);
  }

  const crestMap: Record<string, string> = {};
  for (const team of [...teamSet]) {   // <-- fix is here: spread the Set into an array
    try {
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(team)}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      const found = data.teams?.[0];
      if (found?.strBadge) crestMap[team] = found.strBadge;
    } catch { /* skip */ }
  }

  let updated = 0;
  for (const m of teamsData) {
    const updates: any = {};
    if (!m.crest_a && crestMap[m.team_a]) updates.crest_a = crestMap[m.team_a];
    if (!m.crest_b && crestMap[m.team_b]) updates.crest_b = crestMap[m.team_b];
    if (Object.keys(updates).length > 0) {
      await supabase.from("predictions").update(updates).eq("id", m.id);
      updated++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `Crests updated for ${updated} matches (searched ${teamSet.size} teams).`,
  });
}