interface AdBannerProps {
  variant?: "banner" | "inline" | "sidebar";
  className?: string;
}

export default function AdBanner({ variant = "banner", className = "" }: AdBannerProps) {
  const heightClass =
    variant === "sidebar" ? "h-40" : variant === "inline" ? "h-14 sm:h-16" : "h-16 sm:h-20";

  return (
    <div
      className={`relative ${heightClass} bg-[#0D0D0D] border border-white/10 rounded-xl flex items-center justify-center overflow-hidden group transition-colors hover:border-gold-400/30 ${className}`}
    >
      {/* Subtle gold shimmer on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {/* "Sponsored" badge – tiny, elegant */}
      <span className="absolute top-2 right-3 text-[10px] uppercase tracking-wider text-gray-600">
        Sponsored
      </span>

      {/* Placeholder text – replace with your ad code later */}
      <span className="text-gray-500 text-xs sm:text-sm font-medium tracking-wide">
        Advertisement
      </span>
    </div>
  );
}