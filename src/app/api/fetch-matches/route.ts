import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  try {
    const today = new Date();
    const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dateFrom = today.toISOString().split("T")[0];
    const dateTo = future.toISOString().split("T")[0];

    // Fetch both SCHEDULED and POSTPONED (World Cup matches may be tagged as POSTPONED until closer)
    const scheduled = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`,
      { headers: { "X-Auth-Token": apiKey } }
    );
    const postponed = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=POSTPONED`,
      { headers: { "X-Auth-Token": apiKey } }
    );

    let allMatches: any[] = [];

    if (scheduled.ok) {
      const data = await scheduled.json();
      if (data.matches) allMatches = allMatches.concat(data.matches);
    }
    if (postponed.ok) {
      const data = await postponed.json();
      if (data.matches) allMatches = allMatches.concat(data.matches);
    }

    // Remove duplicates by match ID
    const unique = new Map<number, any>();
    allMatches.forEach(m => unique.set(m.id, m));
    const matches = Array.from(unique.values());

    // Keep only truly upcoming matches
    const upcoming = matches.filter((m: any) => {
      const kickoff = new Date(m.utcDate);
      return kickoff > new Date();
    });

    const { supabase } = await import("@/lib/supabase");
    let inserted = 0;

    for (const m of upcoming) {
      const matchName = `${m.homeTeam.name} vs ${m.awayTeam.name}`;
      // Avoid duplicates by match_api_id
      const { data: existing } = await supabase
        .from("predictions")
        .select("id")
        .eq("match_api_id", m.id)
        .limit(1);
      if (existing && existing.length > 0) continue;

      const { error } = await supabase.from("predictions").insert({
        sport: "Football",
        league: m.competition?.name || "Unknown",
        match_name: matchName,
        team_a: m.homeTeam.name,
        team_b: m.awayTeam.name,
        time: new Date(m.utcDate).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        crest_a: m.homeTeam.crest || null,
        crest_b: m.awayTeam.crest || null,
        team_id_a: m.homeTeam.id,
        team_id_b: m.awayTeam.id,
        match_api_id: m.id,
        kickoff_time: m.utcDate,
        prediction: "",
        confidence: 70,
        is_premium: false,
      });
      if (!error) inserted++;
    }

    return NextResponse.json({
      success: true,
      fetched: upcoming.length,
      inserted,
      enriched: 0,
    });
  } catch (err: any) {
    console.error("Fetch matches error:", err.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}