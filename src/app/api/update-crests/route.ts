import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { supabase } = await import("@/lib/supabase");

  // Fetch all matches where crest is missing OR is a flag from football-data.org
  const { data: teamsData, error } = await supabase
    .from("predictions")
    .select("id, team_a, team_b, crest_a, crest_b");

  if (error || !teamsData) {
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
  }

  // Collect unique teams that need a better crest
  const teamSet = new Set<string>();
  for (const m of teamsData) {
    const crestA = m.crest_a;
    const crestB = m.crest_b;
    // If crest is null OR it's not already a TheSportsDB badge, we'll update it
    if (!crestA || !crestA.includes("thesportsdb.com")) teamSet.add(m.team_a);
    if (!crestB || !crestB.includes("thesportsdb.com")) teamSet.add(m.team_b);
  }

  if (teamSet.size === 0) {
    return NextResponse.json({ success: true, message: "All crests already use TheSportsDB badges." });
  }

  const crestMap: Record<string, string> = {};
  for (const team of Array.from(teamSet)) {
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
    // Update crest_a if it's missing or not a TheSportsDB badge
    if ((!m.crest_a || !m.crest_a.includes("thesportsdb.com")) && crestMap[m.team_a]) {
      updates.crest_a = crestMap[m.team_a];
    }
    // Update crest_b if it's missing or not a TheSportsDB badge
    if ((!m.crest_b || !m.crest_b.includes("thesportsdb.com")) && crestMap[m.team_b]) {
      updates.crest_b = crestMap[m.team_b];
    }
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