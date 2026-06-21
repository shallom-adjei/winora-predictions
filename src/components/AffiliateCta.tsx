export default function AffiliateCta({ matchId, className = "" }: { matchId: string; className?: string }) {
  const affiliates: Array<{ name: string; logo: string; url: string; needsLightBg?: boolean }> = [
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
            className="flex items-center gap-2.5 pl-3 pr-4 py-1.5 rounded-lg bg-black/20 border border-gold-400/40 text-gold-400 text-xs sm:text-sm font-semibold hover:bg-black/30 hover:border-gold-400/60 transition-all"
          >
            {/* Conditionally add a light background for logos with black text */}
            <span
              className={`flex items-center justify-center rounded-full ${
                aff.needsLightBg
                  ? "bg-white/10 p-1"        // subtle light background for visibility
                  : ""
              }`}
            >
              <img
                src={aff.logo}
                alt={aff.name}
                className={`object-contain drop-shadow-[0_0_4px_rgba(212,175,55,0.4)] ${
                  aff.needsLightBg
                    ? "h-6 w-6 sm:h-8 sm:w-8"   // slightly smaller inside the background
                    : "h-8 w-8 sm:h-10 sm:w-10"
                }`}
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