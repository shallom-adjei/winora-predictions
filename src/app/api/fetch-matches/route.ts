import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // 1. Check for API key
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.error("FOOTBALL_DATA_API_KEY is not set");
    return NextResponse.json(
      { error: "Server configuration error: API key missing" },
      { status: 500 }
    );
  }

  try {
    // 2. Build a safe, 7‑day window
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dateFrom = today.toISOString().split("T")[0];
    const dateTo = nextWeek.toISOString().split("T")[0];

    const url = `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`;
    console.log("Fetching:", url);

    // 3. Call the global endpoint
    const res = await fetch(url, {
      headers: { "X-Auth-Token": apiKey },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Football API error ${res.status}: ${errorText}`);
      return NextResponse.json(
        { error: `Football API responded with ${res.status}: ${errorText}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const matches = data.matches || [];
    console.log(`Matches found: ${matches.length}`);

    // 4. Insert into Supabase (skip duplicates by match_api_id)
    const { supabase } = await import("@/lib/supabase");
    let inserted = 0;
    const rows = [];

    for (const m of matches) {
      const { data: existing } = await supabase
        .from("predictions")
        .select("id")
        .eq("match_api_id", m.id)
        .limit(1);
      if (existing && existing.length > 0) continue;

      rows.push({
        sport: "Football",
        league: m.competition?.name || "Unknown",
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
    }

    if (rows.length > 0) {
      const { error } = await supabase.from("predictions").insert(rows);
      if (error) {
        console.error("Supabase insert error:", error.message);
        return NextResponse.json({ error: "Database insert failed" }, { status: 500 });
      }
      inserted = rows.length;
    }

    return NextResponse.json({
      success: true,
      fetched: matches.length,
      inserted,
      enriched: 0,   // enrichment will be handled separately later
    });
  } catch (err: any) {
    console.error("Unhandled fetch error:", err.message || err);
    return NextResponse.json(
      { error: "Internal server error. Check Vercel logs for details." },
      { status: 500 }
    );
  }
}