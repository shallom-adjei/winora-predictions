import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const LEAGUE_COUNTRY: Record<string, string[]> = {
  "Premier League": ["ENG"],
  "Championship": ["ENG"],
  "Primera Division": ["ESP"],
  "Bundesliga": ["GER"],
  "Serie A": ["ITA"],
  "Ligue 1": ["FRA"],
  "Eredivisie": ["NED"],
  "Primeira Liga": ["POR"],
  "Scottish Premiership": ["SCO"],
  "UEFA Champions League": ["ENG","ESP","GER","ITA","FRA","NED","POR","SCO"],
  "UEFA Europa League": ["ENG","ESP","GER","ITA","FRA","NED","POR","SCO"],
};

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    const { data: cached, error: cacheErr } = await supabaseAdmin
      .from("clubelo_cache")
      .select("club_name, country, elo");

    if (cacheErr) throw cacheErr;
    if (!cached || cached.length === 0) {
      return NextResponse.json({
        error: "ClubElo cache is empty. Cron must run first.",
        hint: "Call POST /api/cron-refresh-clubelo once, or wait for the daily cron.",
      }, { status: 400 });
    }

    const clubelo = cached.map((r) => ({ name: r.club_name, country: r.country, elo: r.elo }));

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

    let upserted = 0;
    for (let i = 0; i < resolved.length; i += 500) {
      const { error } = await supabaseAdmin
        .from("team_ratings")
        .upsert(resolved.slice(i, i + 500), { onConflict: "team_name" });
      if (error) throw error;
      upserted += Math.min(500, resolved.length - i);
    }

    return NextResponse.json({
      success: true,
      clubelo_cached: clubelo.length,
      teams_in_our_db: teams.length,
      resolved: upserted,
      unresolved_count: unresolved.length,
      unresolved_sample: unresolved.slice(0, 20),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}