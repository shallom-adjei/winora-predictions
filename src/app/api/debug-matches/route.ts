import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  const today = new Date();
  const future = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateFrom = today.toISOString().split("T")[0];
  const dateTo = future.toISOString().split("T")[0];

  const results: any = { dateRange: `${dateFrom} to ${dateTo}` };

  const statuses = ["SCHEDULED", "POSTPONED", "TIMED", "IN_PLAY"];
  for (const status of statuses) {
    const res = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=${status}`,
      { headers: { "X-Auth-Token": apiKey } }
    );
    const data = await res.json();
    results[status] = {
      ok: res.ok,
      status: res.status,
      count: data.count || 0,
      sample: data.matches?.slice(0, 2).map((m: any) => ({
        id: m.id,
        match: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
        utcDate: m.utcDate,
        status: m.status,
      })),
    };
  }

  return NextResponse.json(results);
}