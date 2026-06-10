import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const today = new Date().toISOString().split("T")[0];
  const endDate = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  // League IDs for TheSportsDB (free tier)
  const leagueIds = [
    4328, // English Premier League
    4335, // Spanish La Liga
    4331, // German Bundesliga
    4332, // Italian Serie A
    4334, // French Ligue 1
    4330, // Dutch Eredivisie
    4480, // Portuguese Primeira Liga
    4344, // Brazilian Serie A
  ];

  const allMatches: any[] = [];

  for (const leagueId of leagueIds) {
    try {
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${leagueId}&s=2025-2026`
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.events) {
        const upcoming = data.events.filter(
          (e: any) => e.dateEvent >= today && e.dateEvent <= endDate
        );
        allMatches.push(...upcoming);
      }
    } catch (err) {
      console.error(`Failed to fetch league ${leagueId}`, err);
    }
  }

  const { supabase } = await import("@/lib/supabase");
  let inserted = 0;

  for (const m of allMatches) {
    const matchName = `${m.strHomeTeam} vs ${m.strAwayTeam}`;
    const { data: existing } = await supabase
      .from("predictions")
      .select("id")
      .eq("match_name", matchName)
      .limit(1);
    if (existing && existing.length > 0) continue;

    await supabase.from("predictions").insert({
      sport: "Football",
      match_name: matchName,
      team_a: m.strHomeTeam,
      team_b: m.strAwayTeam,
      time: m.strTime || "TBD",
      team_id_a: null,
      team_id_b: null,
      prediction: "",
      confidence: 70,
      is_premium: false,
    });
    inserted++;
  }

  return NextResponse.json({
    success: true,
    fetched: allMatches.length,
    inserted,
    // add enriched field to keep the toast happy
    enriched: 0,
  });
}