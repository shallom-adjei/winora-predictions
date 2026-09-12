import { NextResponse } from "next/server";
import { bestMatch } from "@/lib/teamResolver";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The Odds API sport keys → we only care about football
const SPORTS = [
  "soccer_epl",
  "soccer_spain_la_liga",
  "soccer_italy_serie_a",
  "soccer_germany_bundesliga",
  "soccer_france_ligue_one",
  "soccer_uefa_champs_league",
  "soccer_portugal_primeira_liga",
  "soccer_netherlands_eredivisie",
  "soccer_brazil_campeonato",
  "soccer_fifa_world_cup",
];

function removeVig(
  oH: number, oD: number, oA: number
): [number, number, number] {
  const rawH = 1 / oH, rawD = 1 / oD, rawA = 1 / oA;
  const total = rawH + rawD + rawA;
  return [rawH / total, rawD / total, rawA / total];
}

export async function GET() {
  const apiKey = process.env.THE_ODDS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing THE_ODDS_API_KEY" }, { status: 500 });

  const { supabase } = await import("@/lib/supabase");

  // Load all upcoming predictions once and index by team name
  const { data: upcoming } = await supabase
    .from("predictions")
    .select("id, team_a, team_b")
    .neq("match_status", "FINISHED");

  if (!upcoming || upcoming.length === 0) {
    return NextResponse.json({ success: true, message: "No upcoming matches" });
  }

  const candidates = upcoming.map((p: any) => ({
    name: `${p.team_a} vs ${p.team_b}`,
    id: p.id,
    team_a: p.team_a,
    team_b: p.team_b,
  }));

  let updated = 0;
  const errors: string[] = [];

  for (const sport of SPORTS) {
    try {
      const url =
        `https://api.the-odds-api.com/v4/sports/${sport}/odds` +
        `?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal`;

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        errors.push(`${sport}: HTTP ${res.status}`);
        continue;
      }

      const events = await res.json();
      if (!Array.isArray(events)) continue;

           for (const event of events) {
        const oddsKey = `${event.home_team} vs ${event.away_team}`;
        const match = bestMatch(oddsKey, candidates, 0.6);
        if (!match) continue;

        // Take first bookmaker, h2h market
        const book = event.bookmakers?.[0];
        const market = book?.markets?.find((m: any) => m.key === "h2h");
        if (!market) continue;

        const h = market.outcomes.find((o: any) => o.name === event.home_team);
        const d = market.outcomes.find((o: any) => o.name === "Draw");
        const a = market.outcomes.find((o: any) => o.name === event.away_team);
        if (!h || !d || !a) continue;

        const [probH, probD, probA] = removeVig(h.price, d.price, a.price);

        await supabase.from("match_odds").upsert({
          prediction_id: match.candidate.id,
          odds_home: h.price,
          odds_draw: d.price,
          odds_away: a.price,
          prob_home: Number(probH.toFixed(4)),
          prob_draw: Number(probD.toFixed(4)),
          prob_away: Number(probA.toFixed(4)),
          bookmaker: book.title || "unknown",
          updated_at: new Date().toISOString(),
        }, { onConflict: "prediction_id" });
        updated++;
      }

      await new Promise((r) => setTimeout(r, 1500));
    } catch (err: any) {
      errors.push(`${sport}: ${err.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    errors: errors.length ? errors : undefined,
  });
}