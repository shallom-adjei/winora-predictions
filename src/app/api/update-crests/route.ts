import { NextRequest, NextResponse } from "next/server";

// ----- Same name normalisation used in enrich-stats -----
function normaliseTeamName(name: string): string {
  const map: Record<string, string> = {
    "Czechia": "Czech Republic",
    "Curaçao": "Curacao",
    "Congo DR": "DR Congo",
    "Cape Verde Islands": "Cape Verde",
    "Bosnia-Herzegovina": "Bosnia",
    "USA": "United States",
    "Korea Republic": "South Korea",
    "Ivory Coast": "Côte d'Ivoire",
    "North Korea": "Korea DPR",
    "St. Kitts & Nevis": "St. Kitts and Nevis",
    "Trinidad & Tobago": "Trinidad and Tobago",
    "Antigua & Barbuda": "Antigua and Barbuda",
    "Saudi Arabia": "Saudi Arabia",
    "United Arab Emirates": "UAE",
    "Korea DPR": "North Korea",
    "São Tomé and Príncipe": "Sao Tome and Principe",
  };
  return map[name] || name;
}

export async function POST(req: NextRequest) {
  const { supabase } = await import("@/lib/supabase");

  // Get all distinct teams that need a better crest (null or not a TheSportsDB badge)
  const { data: teamsData, error } = await supabase
    .from("predictions")
    .select("id, team_a, team_b, crest_a, crest_b");

  if (error || !teamsData) {
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
  }

  const teamSet = new Set<string>();
  for (const m of teamsData) {
    if (!m.crest_a || !m.crest_a.includes("thesportsdb.com")) teamSet.add(m.team_a);
    if (!m.crest_b || !m.crest_b.includes("thesportsdb.com")) teamSet.add(m.team_b);
  }

  if (teamSet.size === 0) {
    return NextResponse.json({ success: true, message: "All crests already use TheSportsDB badges." });
  }

  const crestMap: Record<string, string> = {};
  for (const team of Array.from(teamSet)) {
    try {
      const normalised = normaliseTeamName(team);
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(normalised)}`
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
    if ((!m.crest_a || !m.crest_a.includes("thesportsdb.com")) && crestMap[m.team_a]) {
      updates.crest_a = crestMap[m.team_a];
    }
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