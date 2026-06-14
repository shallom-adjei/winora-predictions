import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  try {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dateFrom = today.toISOString().split("T")[0];
    const dateTo = nextWeek.toISOString().split("T")[0];

    const url = `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`;

    const res = await fetch(url, {
      headers: { "X-Auth-Token": apiKey },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Football API error:", res.status, errorText);
      return NextResponse.json(
        { error: `Football API error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const matches = data.matches || [];

    const { supabase } = await import("@/lib/supabase");
    let inserted = 0;

    for (const m of matches) {
      // Check duplicate
      const { data: existing } = await supabase
        .from("predictions")
        .select("id")
        .eq("match_api_id", m.id)
        .limit(1);
      if (existing && existing.length > 0) continue;

      const { error: insertErr } = await supabase.from("predictions").insert({
        sport: "Football",
        match_name: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
        team_a: m.homeTeam.name,
        team_b: m.awayTeam.name,
        time: new Date(m.utcDate).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        crest_a: m.homeTeam.crest || null,
        crest_b: m.awayTeam.crest || null,
        team_id_a: m.homeTeam.id,
        team_id_b: m.awayTeam.id,
        match_api_id: m.id,
        prediction: "",
        confidence: 70,
        is_premium: false,
      });

      if (!insertErr) inserted++;
      else console.error(`Insert error for ${m.homeTeam.name} vs ${m.awayTeam.name}:`, insertErr.message);
    }

    return NextResponse.json({
      success: true,
      fetched: matches.length,
      inserted,
    });
  } catch (err: any) {
    console.error("Fetch matches error:", err.message || err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}