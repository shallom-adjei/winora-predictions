"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { usePathname } from "next/navigation";

export default function PublicHeader() {
  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Predictions", href: "/predictions" },
    { name: "Results", href: "/results" },
    { name: "About Us", href: "/#about" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/#contact" },
  ];
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 h-20 border-b border-white/5 bg-black/80 backdrop-blur-lg">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <img src="/winora-logo.png" alt="Winora" className="h-8 sm:h-10 w-auto" />
          <span className="text-xl font-bold tracking-[4px] text-white">WINORA</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-12">
          {navLinks.map((link) => {
  // Determine if the link is active
  let isActive = false;
  if (link.href === "/") {
    isActive = pathname === "/";
  } else if (link.href.startsWith("/#")) {
    // hash links are never "active" in the navbar
    isActive = false;
  } else {
    isActive = pathname === link.href;
  }

  return (
    <Link
      key={link.name}
      href={link.href}
      className={`relative text-sm font-medium transition-colors ${
        isActive ? "text-white" : "text-gray-400 hover:text-white"
      } group`}
    >
      {link.name}
      {/* Active underline – only visible when on the exact page */}
      {isActive && (
        <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-gold-400" />
      )}
      {/* Hover underline for non‑active links */}
      {!isActive && (
        <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-gold-400 group-hover:w-full transition-all" />
      )}
    </Link>
  );
})}
        </nav>

        {/* Desktop buttons */}
        <div className="hidden lg:flex items-center gap-3">
         <Button className="h-12 rounded-xl bg-gold-400 px-7 text-sm font-semibold text-black hover:bg-gold-500 gap-2" asChild>
  <Link href="/waitlist">
    <Crown className="h-4 w-4" /> Get Early Access
  </Link>
</Button>
        </div>
      </div>
    </header>
  );
}