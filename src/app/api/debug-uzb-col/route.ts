import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const queries = [
    "Uzbekistan vs Colombia",
    "Colombia vs Uzbekistan",
  ];
  const results: any = {};

  for (const q of queries) {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=${encodeURIComponent(q)}`
    );
    const data = await res.json();
    results[q] = {
      count: data.event?.length || 0,
      sample: data.event?.slice(0, 3).map((e: any) => ({
        name: e.strEvent,
        date: e.dateEvent,
        status: e.strStatus,
        home: e.intHomeScore,
        away: e.intAwayScore,
      })),
    };
  }

  return NextResponse.json(results);
}