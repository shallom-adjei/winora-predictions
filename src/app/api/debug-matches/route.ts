import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  try {
    const today = new Date();
    const future = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dateFrom = today.toISOString().split("T")[0];
    const dateTo = future.toISOString().split("T")[0];

    const res = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=TIMED`,
      { headers: { "X-Auth-Token": apiKey } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `API error ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({
      dateRange: `${dateFrom} to ${dateTo}`,
      count: data.count || 0,
      matches: (data.matches || []).slice(0, 3).map((m: any) => ({
        id: m.id,
        match: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
        utcDate: m.utcDate,
        status: m.status,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}