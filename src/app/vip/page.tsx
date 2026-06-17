"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import PublicHeader from "@/components/PublicHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";

export default function VipPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: insertErr } = await supabase.from("waitlist").insert([{ email }]);
    setSubmitting(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    // 🎉 celebration
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    setSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col pb-24 lg:pb-0">
      <PublicHeader />
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl w-full text-center"
            >
              {/* Crown icon with spring animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 120 }}
                className="inline-flex h-20 w-20 rounded-2xl bg-gold-400/20 items-center justify-center mb-6"
              >
                <Crown className="h-10 w-10 text-gold-400" />
              </motion.div>

              <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight">
                Unlock <span className="text-gold-400">VIP Early Access</span>
              </h1>
              <p className="text-gray-400 text-lg sm:text-xl mb-8 max-w-md mx-auto">
                Join the inner circle. Get premium predictions, deep analysis, and exclusive tools before anyone else.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold-400/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-12 px-6 rounded-xl bg-gold-400 text-black font-semibold flex items-center gap-2 hover:bg-gold-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Get Early Access"}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
              {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="max-w-md w-full text-center bg-[#0D0D0D] border border-white/10 rounded-3xl p-8 sm:p-10"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
                className="mx-auto h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">You're In!</h2>
              <p className="text-gray-400 mb-6">
                Congratulations! You’ve secured your spot for early VIP access. We’ll notify you when the doors open.
              </p>
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300 font-semibold text-sm"
              >
                ← Back to Home
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <MobileBottomNav />
    </div>
  );
}