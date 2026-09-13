import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Hobby cap — fits in 60s

const ELO_CSV_URLS = [
  "https://cdn.jsdelivr.net/gh/xgabora/Club-Football-Match-Data@main/data/EloRatings.csv",
];

const LEAGUE_COUNTRY: Record<string, string[]> = {
  "Premier League": ["ENG"], "Championship": ["ENG"],
  "La Liga": ["ESP"], "Bundesliga": ["GER"],
  "Serie A": ["ITA"], "Ligue 1": ["FRA"],
  "Eredivisie": ["NED"], "Primeira Liga": ["POR"],
  "Scottish Premiership": ["SCO"],
  "UEFA Champions League": ["ENG","ESP","GER","ITA","FRA","NED","POR","SCO"],
  "UEFA Europa League": ["ENG","ESP","GER","ITA","FRA","NED","POR","SCO"],
};

async function fetchAndParseEloCsv() {
  for (const url of ELO_CSV_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 50000);
      const res = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
        headers: { "User-Agent": "Winora/1.0" },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;

      const text = await res.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const clean = (s: string) => s.trim().replace(/^"+|"+$/g, "");

      const latest = new Map<string, { country: string; elo: number; date: string }>();
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(",").map(clean);
        if (parts.length < 4) continue;
        const [date, club, country, eloStr] = parts;
        const elo = parseFloat(eloStr);
        if (!club || isNaN(elo) || !country) continue;
        const existing = latest.get(club);
        if (!existing || date > existing.date) {
          latest.set(club, { country, elo, date });
        }
      }

      return Array.from(latest.entries()).map(([name, v]) => ({
        name, country: v.country, elo: Math.round(v.elo),
      }));
    } catch { continue; }
  }
  throw new Error("All CSV sources failed");
}

export async function POST(req: Request) {
  // Auth: Vercel cron or manual with CRON_SECRET
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clubelo = await fetchAndParseEloCsv();

    const { data: upcoming, error: predErr } = await supabaseAdmin
      .from("predictions")
      .select("team_a, team_b, league")
      .or("match_status.neq.FINISHED,match_status.is.null");
    if (predErr) throw predErr;

    const teamSet = new Set<string>();
    const teamLeague = new Map<string, string>();
    for (const row of upcoming ?? []) {
      if (row.team_a) { teamSet.add(row.team_a); if (row.league) teamLeague.set(row.team_a, row.league); }
      if (row.team_b) { teamSet.add(row.team_b); if (row.league) teamLeague.set(row.team_b, row.league); }
    }
    const teams = Array.from(teamSet);

    const { bestMatch } = await import("@/lib/teamResolver");
    const resolved: any[] = [];
    const unresolved: string[] = [];

    for (const team of teams) {
      const league = teamLeague.get(team);
      const allowed = league ? LEAGUE_COUNTRY[league] : null;
      const pool = allowed ? clubelo.filter((c) => allowed.includes(c.country)) : clubelo;
      const match = bestMatch(team, pool, 0.55);
      if (!match) { unresolved.push(team); continue; }
      resolved.push({
        team_name: team,
        clubelo_name: match.candidate.name,
        elo: match.candidate.elo,
        country: match.candidate.country,
        match_score: Number(match.score.toFixed(3)),
        updated_at: new Date().toISOString(),
      });
    }

    for (let i = 0; i < resolved.length; i += 500) {
      const batch = resolved.slice(i, i + 500);
      const { error } = await supabaseAdmin
        .from("team_ratings")
        .upsert(batch, { onConflict: "team_name" });
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      resolved: resolved.length,
      unresolved_count: unresolved.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET for browser / Vercel cron (no auth check when no secret set)
export async function GET(req: Request) {
  return POST(req);
}