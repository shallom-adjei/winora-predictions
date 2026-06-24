export default function LoadingScreen({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="relative flex min-h-[50vh] items-center justify-center overflow-hidden bg-neutral-950">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-120%) rotate(12deg); opacity: 0; }
          20% { opacity: 1; }
          50% { opacity: 0.75; }
          100% { transform: translateX(120%) rotate(12deg); opacity: 0; }
        }
        @keyframes slowSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.10),transparent_55%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400/10 blur-3xl" />

      <div className="relative flex flex-col items-center gap-5">
        <div className="relative h-24 w-24" style={{ animation: "float 3.8s ease-in-out infinite" }}>
          {/* outer halo */}
          <div className="absolute inset-0 rounded-full border border-gold-400/10 bg-white/5 shadow-[0_0_40px_rgba(212,175,55,0.10)] backdrop-blur-sm" />

          {/* spinning premium ring */}
          <div
            className="absolute inset-2 rounded-full border border-gold-400/20"
            style={{
              animation: "slowSpin 1.9s linear infinite",
              borderTopColor: "rgba(212,175,55,0.95)",
              borderRightColor: "rgba(212,175,55,0.35)",
            }}
          />

          {/* inner core */}
          <div className="absolute inset-5 rounded-full bg-neutral-950/90 shadow-inner shadow-black/40" />

          {/* brand mark */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="relative text-[0.72rem] font-semibold tracking-[0.42em] text-gold-300">
              WINORA
              <span
                className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gradient-to-r from-transparent via-gold-300/70 to-transparent"
                style={{ animation: "shimmer 2.4s ease-in-out infinite" }}
              />
            </span>
          </div>
        </div>

        <div className="text-center" style={{ animation: "fadeUp 0.8s ease-out both" }}>
          <p className="text-sm font-medium tracking-wide text-gold-200/90">{message}</p>
          <div className="mt-2 h-px w-24 bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />
        </div>
      </div>
    </div>
  );
}