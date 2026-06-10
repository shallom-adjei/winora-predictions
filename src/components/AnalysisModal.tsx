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
          <div className="space-y-4 text-sm text-gray-300">
            {report.confidence_score && (
              <div className="flex gap-2">
                <span className="text-gold-400 font-semibold">Confidence:</span>
                <span>{report.confidence_score}</span>
              </div>
            )}
            {report.risk_level && (
              <div className="flex gap-2">
                <span className="text-gold-400 font-semibold">Risk Level:</span>
                <span>{report.risk_level}</span>
              </div>
            )}
            {report.recommended_stake && (
              <div className="flex gap-2">
                <span className="text-gold-400 font-semibold">Stake:</span>
                <span>{report.recommended_stake}</span>
              </div>
            )}
            {report.alternative_prediction && (
              <div className="flex gap-2">
                <span className="text-gold-400 font-semibold">Alternative:</span>
                <span>{report.alternative_prediction}</span>
              </div>
            )}

            {report.key_factors?.length > 0 && (
              <div>
                <h4 className="text-gold-400 font-semibold mb-1">Key Factors</h4>
                <ul className="list-disc list-inside space-y-1">
                  {report.key_factors.map((f: string, i: number) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
            {report.strengths?.length > 0 && (
              <div>
                <h4 className="text-gold-400 font-semibold mb-1">Strengths</h4>
                <ul className="list-disc list-inside space-y-1">
                  {report.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {report.concerns?.length > 0 && (
              <div>
                <h4 className="text-gold-400 font-semibold mb-1">Concerns</h4>
                <ul className="list-disc list-inside space-y-1">
                  {report.concerns.map((c: string, i: number) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
            {report.analysis && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-gray-300 leading-relaxed">{report.analysis}</p>
              </div>
            )}
            {report.final_verdict && (
              <div className="mt-2">
                <span className="text-gold-400 font-semibold">Verdict:</span> {report.final_verdict}
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