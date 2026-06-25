import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  const today = new Date();
  const future = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateFrom = today.toISOString().split("T")[0];
  const dateTo = future.toISOString().split("T")[0];

  const statuses = ["SCHEDULED", "POSTPONED", "TIMED", "IN_PLAY"];
  const results: any = { dateRange: `${dateFrom} to ${dateTo}` };

  for (const status of statuses) {
    try {
      const res = await fetch(
        `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=${status}`,
        { headers: { "X-Auth-Token": apiKey } }
      );
      if (!res.ok) {
        results[status] = { ok: false, status: res.status };
        continue;
      }
      const data = await res.json();
      results[status] = {
        ok: true,
        status: res.status,
        count: data.count || 0,
        matches: (data.matches || []).slice(0, 3).map((m: any) => ({
          id: m.id,
          match: `${m.homeTeam?.name} vs ${m.awayTeam?.name}`,
          utcDate: m.utcDate,
          status: m.status,
        })),
      };
    } catch (err: any) {
      results[status] = { error: err.message };
    }
  }

  return NextResponse.json(results);
}