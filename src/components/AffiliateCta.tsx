export default function AffiliateCta({ matchId, className = "" }: { matchId: string; className?: string }) {
  const affiliates = [
    {
      name: "1xBet",
      logo: "/1xbet.png",                         
      url: "https://1xbet.com.gh?bf=0192a5976e834_14577427477",   
    },
    {
      name: "Melbet",
      logo: "/melbet.png",
      url: "https://melbet-146133.top?bf=ddd533d626394_14577661311",
    },
  ];

  return (
    <div className={`mt-2 pt-2 border-t border-white/10 w-full ${className}`}>
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        {affiliates.map((aff) => (
          <a
            key={aff.name}
            href={aff.url}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-400/10 border border-gold-400/30 text-gold-400 text-xs sm:text-sm font-semibold hover:bg-gold-400/20 hover:border-gold-400/50 transition-all"
          >
            {/* Logo with a subtle dark circle background to mask non‑transparent edges */}
            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-white/10 border border-gold-400/30 p-0.5">
              <img
                src={aff.logo}
                alt={aff.name}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </span>
            Bet @ {aff.name}
          </a>
        ))}
      </div>
    </div>
  );
}