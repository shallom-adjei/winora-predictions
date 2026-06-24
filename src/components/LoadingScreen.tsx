export default function LoadingScreen({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="relative flex min-h-[50vh] items-center justify-center overflow-hidden bg-neutral-950">
      <style>{`
        @keyframes slowSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(1.08); opacity: 0.45; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes sweep {
          0% { transform: translateX(-120%) rotate(12deg); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateX(120%) rotate(12deg); opacity: 0; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative flex flex-col items-center gap-5" style={{ animation: "float 3.5s ease-in-out infinite" }}>
        <div className="relative h-24 w-24">
          <div
            className="absolute inset-0 rounded-full bg-gold-400/10 blur-2xl"
            style={{ animation: "pulseGlow 2.8s ease-in-out infinite" }}
          />

          <div className="absolute inset-0 rounded-full border border-gold-400/15 bg-white/5 backdrop-blur-sm" />

          <div
            className="absolute inset-2 rounded-full border-2 border-gold-400/25"
            style={{
              animation: "slowSpin 2.2s linear infinite",
              borderTopColor: "rgba(212,175,55,0.95)",
              borderRightColor: "rgba(212,175,55,0.45)",
            }}
          />

          <div className="absolute inset-5 rounded-full bg-neutral-950 shadow-inner shadow-black/50" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gold-300/40 bg-gold-400/10">
              <div className="absolute h-px w-8 bg-gold-300/70" />
              <div className="absolute h-8 w-px bg-gold-300/70" />
              <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-300" />
            </div>
          </div>

          <div
            className="absolute inset-y-3 left-1/2 w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-transparent via-gold-300/70 to-transparent"
            style={{ animation: "sweep 2.6s ease-in-out infinite" }}
          />
        </div>

        <div className="text-center">
          <p className="text-sm font-medium tracking-[0.2em] text-gold-200">{message}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.35em] text-white/35">
            Analyzing 
          </p>
        </div>
      </div>
    </div>
  );
}