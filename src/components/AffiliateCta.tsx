interface AffiliateCtaProps {
  matchId: string;
  className?: string;
}

export default function AffiliateCta({ matchId, className = "" }: AffiliateCtaProps) {
  // ---------- REPLACE THESE WITH YOUR REAL LINKS ----------
  const links = [
    {
      name: "1xBet",
      logo: "https://1xbet.com/logo.png",        // replace with actual logo URL
      url: "https://1xbet.com/?affiliate=YOURID", // replace with your affiliate link
    },
    {
      name: "BetWinner",
      logo: "https://betwinner.com/logo.png",     // replace with actual logo URL
      url: "https://betwinner.com/?affiliate=YOURID", // replace with your affiliate link
    },
  ];

  return (
    <div className={`mt-2 pt-2 border-t border-white/10 ${className}`}>
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold-400/10 border border-gold-400/30 text-gold-400 text-xs font-semibold hover:bg-gold-400/20 hover:border-gold-400/50 transition-all"
          >
            <img
              src={link.logo}
              alt={link.name}
              className="h-4 w-auto opacity-90"
            />
            Bet @ {link.name}
          </a>
        ))}
      </div>
    </div>
  );
}