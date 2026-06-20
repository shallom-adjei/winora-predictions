"use client";
import { useState } from "react";
import { Calendar } from "lucide-react";

interface DateFilterProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  showQuickButtons?: boolean;   // optional Today / Tomorrow
}

export default function DateFilter({ from, to, onChange, showQuickButtons = false }: DateFilterProps) {
  const [fromVal, setFromVal] = useState(from);
  const [toVal, setToVal] = useState(to);

  const apply = () => onChange(fromVal, toVal);
  const clear = () => {
    setFromVal("");
    setToVal("");
    onChange("", "");
  };

  const today = () => {
    const d = new Date().toISOString().split("T")[0];
    setFromVal(d);
    setToVal(d);
    onChange(d, d);
  };

  const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const dStr = d.toISOString().split("T")[0];
    setFromVal(dStr);
    setToVal(dStr);
    onChange(dStr, dStr);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-[#0D0D0D] border border-white/10 rounded-xl p-3 sm:p-4 mb-6">
      <Calendar className="h-4 w-4 text-gold-400 hidden sm:block" />

      {showQuickButtons && (
        <div className="flex gap-2 mr-2">
          <button
            onClick={today}
            className="bg-white/5 text-white border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gold-400/10 hover:border-gold-400/50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={tomorrow}
            className="bg-white/5 text-white border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gold-400/10 hover:border-gold-400/50 transition-colors"
          >
            Tomorrow
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">From</label>
        <input
          type="date"
          value={fromVal}
          onChange={(e) => setFromVal(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-400/50 w-36"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">To</label>
        <input
          type="date"
          value={toVal}
          onChange={(e) => setToVal(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-400/50 w-36"
        />
      </div>
      <button
        onClick={apply}
        className="bg-gold-400 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-500 transition-colors"
      >
        Apply
      </button>
      <button
        onClick={clear}
        className="text-gray-400 hover:text-white text-sm transition-colors"
      >
        Clear
      </button>
    </div>
  );
}