import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  const today = new Date();
  const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dateFrom = today.toISOString().split("T")[0];
  const dateTo = future.toISOString().split("T")[0];

  try {
    const [timedRes, scheduledRes, inplayRes] = await Promise.all([
      fetch(`https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=TIMED`, {
        headers: { "X-Auth-Token": apiKey },
      }),
      fetch(`https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`, {
        headers: { "X-Auth-Token": apiKey },
      }),
      fetch(`https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=IN_PLAY`, {
        headers: { "X-Auth-Token": apiKey },
      }),
    ]);

    const timedData = await timedRes.json();
    const scheduledData = await scheduledRes.json();
    const inplayData = await inplayRes.json();

    const result: any = {
      dateRange: `${dateFrom} to ${dateTo}`,
      timed: {
        ok: timedRes.ok,
        status: timedRes.status,
        count: timedData.count,
        matches: timedData.matches?.slice(0, 3).map((m: any) => ({
          id: m.id,
          match: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
          utcDate: m.utcDate,
          status: m.status,
        })),
      },
      scheduled: {
        ok: scheduledRes.ok,
        status: scheduledRes.status,
        count: scheduledData.count,
        matches: scheduledData.matches?.slice(0, 3).map((m: any) => ({
          id: m.id,
          match: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
          utcDate: m.utcDate,
          status: m.status,
        })),
      },
      inplay: {
        ok: inplayRes.ok,
        status: inplayRes.status,
        count: inplayData.count,
        matches: inplayData.matches?.slice(0, 3).map((m: any) => ({
          id: m.id,
          match: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
          utcDate: m.utcDate,
          status: m.status,
        })),
      },
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}