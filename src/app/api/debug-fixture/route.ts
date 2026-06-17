import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_API_KEY;
  if (!FOOTBALL_DATA_KEY) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const fixtureId = 537410; // Ghana vs Panama
  const res = await fetch(
    `https://api.football-data.org/v4/matches/${fixtureId}`,
    { headers: { "X-Auth-Token": FOOTBALL_DATA_KEY } }
  );
  const data = await res.json();

  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    data,
  });
}