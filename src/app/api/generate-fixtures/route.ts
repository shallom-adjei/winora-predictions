import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateStr = nextWeek.toISOString().split("T")[0];

  const prompt = `Generate a list of 30 upcoming real football matches that are scheduled to be played between tomorrow (${new Date(today.getTime() + 86400000).toISOString().split("T")[0]}) and ${dateStr}. Use only matches from the following leagues: English Premier League, Spanish La Liga, Italian Serie A, German Bundesliga, French Ligue 1, Dutch Eredivisie, Portuguese Primeira Liga,world cup, and Brazilian Serie A. Also include any UEFA Champions League matches if applicable.

For each match, output exactly one line in the format:
  Home Team vs Away Team | HH:MM | Football

Only output the list, no extra commentary. Example:
  Manchester City vs Arsenal | 17:30 | Football
  Barcelona vs Real Madrid | 20:00 | Football`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_tokens: 800,   // increased for longer list
      }),
    });

    const data = await res.json();
    const fixturesText = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ fixtures: fixturesText });
  } catch (err) {
    console.error("Fixture generation error:", err);
    return NextResponse.json({ error: "Failed to generate fixtures" }, { status: 500 });
  }
}