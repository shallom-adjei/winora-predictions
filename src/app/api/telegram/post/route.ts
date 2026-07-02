import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────
  const cookie = req.cookies.get("admin_token");
  if (!cookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channel = process.env.TELEGRAM_CHANNEL_USERNAME; // e.g. "@WinoraTips"
  if (!token || !channel) {
    return NextResponse.json(
      { error: "Telegram not configured" },
      { status: 500 }
    );
  }

  // ── Fetch upcoming predictions with edges ─────────────
  const { supabase } = await import("@/lib/supabase");
  const { data: matches } = await supabase
    .from("predictions")
    .select(
      "match_name, team_a, team_b, time, main_pick, prob_home, prob_draw, prob_away, expected_score, recommended_stake, risk_level, main_edge"
    )
    .neq("match_status", "FINISHED")
    .not("main_pick", "is", null)
    .not("main_edge", "is", null)
    .order("main_edge", { ascending: false })
    .limit(5);

  if (!matches || matches.length === 0) {
    return NextResponse.json(
      { error: "No predictions to post" },
      { status: 400 }
    );
  }

  // ── Build Telegram message (HTML) ─────────────────────
  const lines: string[] = [
    "<b>⚡ Top Confidence Picks</b>",
    "",
  ];

  for (const m of matches) {
    const teamA = m.team_a || "?";
    const teamB = m.team_b || "?";
    const time = m.time || "??:??";
    const pick = m.main_pick || "—";
    const edge = m.main_edge != null ? `Edge +${m.main_edge}%` : "";
    const probs = `1: ${m.prob_home ?? "?"}% · X: ${m.prob_draw ?? "?"}% · 2: ${m.prob_away ?? "?"}%`;
    const score = m.expected_score || "—";
    const stake = m.recommended_stake || "—";
    const risk = m.risk_level || "—";

    lines.push(`<b>${teamA} vs ${teamB}</b>  ${time}`);
    lines.push(`🔹 ${pick}  ${edge}`);
    lines.push(`${probs}`);
    lines.push(`Predicted Score: ${score} | Stake: ${stake} | Risk: ${risk}`);
    lines.push("");
  }

  lines.push(
    `<a href="https://winora-predictions-b29g.vercel.app/predictions">View all predictions →</a>`
  );

  const text = lines.join("\n");

  // ── Send to Telegram ──────────────────────────────────
  const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = new URLSearchParams();
  body.set("chat_id", channel);
  body.set("text", text);
  body.set("parse_mode", "HTML");
  body.set("disable_web_page_preview", "true");

  const tgRes = await fetch(tgUrl, { method: "POST", body });
  const tgData = await tgRes.json();

  if (!tgData.ok) {
    return NextResponse.json(
      { error: tgData.description || "Telegram API error" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message_id: tgData.result?.message_id,
    picks: matches.length,
  });
}