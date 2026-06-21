import { useMemo } from "react";

const AFFILIATE_LINKS = [
  {
    name: "1xBet",
    logo: "https://betwinner.com/favicon.ico",   // use a tiny real favicon or a small SVG placeholder
    url: "https://1xbet.com.gh?bf=0192a5976e834_14577427477",    // replace with your real link
  },
  {
    name: "Melbet",
    logo: "https://betwinner.com/favicon.ico",
    url: "https://melbet-146133.top?bf=ddd533d626394_14577661311",
  },
];

export default function AffiliateCta({ matchId, className = "" }: { matchId: string; className?: string }) {
  // The links never change, so we can use a static array
  return (
    <div className={`mt-2 pt-2 border-t border-white/10 w-full ${className}`}>
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        {AFFILIATE_LINKS.map((link) => (
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
              loading="lazy"
            />
            Bet Now {link.name}
          </a>
        ))}
      </div>
    </div>
  );
}