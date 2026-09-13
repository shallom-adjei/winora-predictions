import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // only works on Pro; Hobby will time out — see notes below

const ELO_CSV_URLS = [
  "https://cdn.jsdelivr.net/gh/xgabora/Club-Football-Match-Data@main/data/EloRatings.csv",
  "https://raw.githubusercontent.com/xgabora/Club-Football-Match-Data/main/data/EloRatings.csv",
];

export async function POST() {
  let lastError: Error | null = null;

  for (const url of ELO_CSV_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 200000);
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) { lastError = new Error(`HTTP ${res.status}`); continue; }

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
        if (!existing || date > existing.date) latest.set(club, { country, elo, date });
      }

      const rows = Array.from(latest.entries()).map(([club_name, v]) => ({
        club_name, country: v.country, elo: Math.round(v.elo),
      }));

      await supabaseAdmin.from("clubelo_cache").delete().neq("club_name", "");
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabaseAdmin.from("clubelo_cache").insert(rows.slice(i, i + 500));
        if (error) throw error;
      }

      return NextResponse.json({ success: true, clubs_cached: rows.length });
    } catch (err: any) {
      lastError = err;
    }
  }
  return NextResponse.json({ error: lastError?.message || "Failed" }, { status: 500 });
}

export async function GET() { return POST(); }