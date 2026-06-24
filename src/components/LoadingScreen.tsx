export default function LoadingScreen({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          {/* Gold spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-gold-400/30 border-t-gold-400 animate-spin" />
          {/* Winora logo or icon in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-gold-400">W I N O R A</span>
          </div>
        </div>
        <p className="text-gold-400 text-sm animate-pulse">{message}</p>
      </div>
    </div>
  );
}