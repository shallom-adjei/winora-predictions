"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BulkAddPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length === 0) {
      toast.error("Paste at least one match.");
      return;
    }

    setLoading(true);
    let inserted = 0;
    for (const line of lines) {
      // Expected format: Team A vs Team B | Time | Sport (optional)
      const parts = line.split("|");
      const matchInfo = parts[0].trim();
      const time = parts[1]?.trim() || "TBD";
      const sport = parts[2]?.trim() || "Football";

      const teams = matchInfo.split(" vs ");
      if (teams.length !== 2) continue;
      const team_a = teams[0].trim();
      const team_b = teams[1].trim();
      const match_name = `${team_a} vs ${team_b}`;

      const { error } = await supabase.from("predictions").insert({
        sport,
        match_name,
        team_a,
        team_b,
        time,
        prediction: "",
        confidence: 70,
        is_premium: false,
      });
      if (!error) inserted++;
    }
    toast.success(`Inserted ${inserted} matches.`);
    setLoading(false);
    setText("");
  };

  return (
    <div className="p-6 text-white max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/portal‑sydr____">
          <Button variant="ghost" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Bulk Add Matches</h1>
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Paste matches in the format: <code className="bg-white/10 px-1 rounded">Home Team vs Away Team | Time | Sport</code>
        <br />Example: <code className="bg-white/10 px-1 rounded">Brazil vs Argentina | 19:00 | Football</code>
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste matches here, one per line..."
        rows={12}
        className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 resize-none"
      />

      <Button onClick={handleSubmit} disabled={loading} className="mt-4 bg-gold-400 text-black hover:bg-gold-500">
        {loading ? "Adding..." : "Add Matches"}
      </Button>
    </div>
  );
}