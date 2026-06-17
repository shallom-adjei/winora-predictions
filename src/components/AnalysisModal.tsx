"use client";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: {
    home: string;
    away: string;
    prediction: string;
    analysis: string;
    fullReport?: any;
  } | null;
}

export function AnalysisModal({ isOpen, onClose, match }: AnalysisModalProps) {
  if (!isOpen || !match) return null;
  const report = match.fullReport;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0D0D0D] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gold-400">Full Analysis</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-gray-400 mb-1">{match.home} vs {match.away}</p>
        <p className="text-lg font-semibold text-white mb-4">Prediction: {match.prediction}</p>

        {report ? (
  <div className="space-y-3 text-sm text-gray-300">
    {report.expected_score && (
      <div className="flex gap-2">
        <span className="text-gold-400 font-semibold">Predicted Score:</span>
        <span>{report.expected_score}</span>
      </div>
    )}
    <div className="grid grid-cols-2 gap-2">
      <div>
        <span className="text-gold-400 font-semibold">Main Pick:</span>
        <br />
        {report.main_pick}
      </div>
      <div>
        <span className="text-gold-400 font-semibold">Safe Pick:</span>
        <br />
        {report.safe_pick}
      </div>
      <div>
        <span className="text-gold-400 font-semibold">Goals Pick:</span>
        <br />
        {report.goals_pick}
      </div>
      <div>
        <span className="text-gold-400 font-semibold">BTTS Pick:</span>
        <br />
        {report.btts_pick}
      </div>
    </div>
    <div className="flex gap-4">
      <div>
        <span className="text-gold-400 font-semibold">Confidence:</span> {report.confidence_score}%
      </div>
      <div>
        <span className="text-gold-400 font-semibold">Risk:</span> {report.risk_level}
      </div>
      <div>
        <span className="text-gold-400 font-semibold">Stake:</span> {report.recommended_stake}
      </div>
    </div>
    {report.analysis && (
      <div className="mt-3 pt-3 border-t border-white/10">
        <p className="text-white leading-relaxed">{report.analysis}</p>
      </div>
    )}
  </div>
) : (
  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{match.analysis}</p>
)}
      </motion.div>
    </div>
  );
}