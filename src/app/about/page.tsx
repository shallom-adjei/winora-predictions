"use client";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col pb-24 lg:pb-0">
      <PublicHeader />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-20 w-full">
        <h1 className="text-3xl sm:text-5xl font-bold mb-8">
          About <span className="text-gold-400">Winora</span>
        </h1>

        <div className="space-y-6 text-gray-300 leading-relaxed text-sm sm:text-base">
          <p>
            Winora is a data‑driven sports prediction platform built for fans who want
            smarter insights, not just luck. We combine advanced statistical models with
            real‑time data to deliver accurate, transparent, and professional match previews.
          </p>

          <p>
            Our engine analyses form, head‑to‑head history, league standings, and over 20
            other performance indicators to produce a complete match profile – including
            expected score, main pick, safe pick, goals, and BTTS predictions – all with
            clear confidence ratings and risk levels.
          </p>

          <p>
            Winora was created to make premium‑style analysis accessible to everyone.
            No subscriptions. No paywalls. Just reliable, data‑backed predictions that
            help you understand the game better.
          </p>

          <p className="text-gold-400 font-semibold">
            Smarter predictions. Better results.
          </p>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}