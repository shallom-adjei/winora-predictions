import { NextRequest, NextResponse } from "next/server";

// Helper to add days to a date
function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

// Rate‑limit helper
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  const today = new Date();
  const dateFrom = formatDate(today);
  const dateTo = formatDate(addDays(today, 7));   // look ahead 7 days

  // Your available competitions – exactly as in your dashboard
  const competitions = [
    "WC",   // FIFA World Cup
    "CL",   // UEFA Champions League
    "BL1",  // Bundesliga
    "DED",  // Eredivisie
    "BSA",  // Campeonato Brasileiro Série A
    "PD",   // Primera Division (La Liga)
    "FL1",  // Ligue 1
    "ELC",  // Championship
    "PPL",  // Primeira Liga
    "EC",   // European Championship
    "SA",   // Serie A
    "PL",   // Premier League
  ];

  const allMatches: any[] = [];

  // Fetch matches competition by competition
  for (const comp of competitions) {
    await wait(200);   // respect rate limits (10 req/min free tier)
    try {
      const res = await fetch(
        `https://api.football-data.org/v4/competitions/${comp}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`,
        { headers: { "X-Auth-Token": apiKey } }
      );
      if (!res.ok) {
        console.log(`Skipped ${comp} (status ${res.status})`);
        continue;
      }
      const data = await res.json();
      console.log(`${comp}: ${data.matches?.length || 0} matches`);
      if (data.matches) allMatches.push(...data.matches);
    } catch (err) {
      console.error(`Error fetching ${comp}:`, err);
    }
  }

  const { supabase } = await import("@/lib/supabase");
  let inserted = 0;

  for (const m of allMatches) {
    const matchName = `${m.homeTeam.name} vs ${m.awayTeam.name}`;
    const { data: existing } = await supabase
      .from("predictions")
      .select("id")
      .eq("match_name", matchName)
      .limit(1);
    if (existing && existing.length > 0) continue;

    await supabase.from("predictions").insert({
      sport: m.competition?.name || "Football",
      match_name: matchName,
      team_a: m.homeTeam.name,
      team_b: m.awayTeam.name,
      time: new Date(m.utcDate).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      crest_a: m.homeTeam.crest || null,
      crest_b: m.awayTeam.crest || null,
      team_id_a: m.homeTeam.id,
      team_id_b: m.awayTeam.id,
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
    enriched: 0,
  });
}