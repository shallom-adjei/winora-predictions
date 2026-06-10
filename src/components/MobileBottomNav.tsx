"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, TrendingUp, BarChart3, FileText, User } from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Predictions", href: "/predictions", icon: TrendingUp },
  { label: "Results", href: "/results", icon: BarChart3 },
  { label: "Blog", href: "/blog", icon: FileText },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[90px] bg-[#050505] border-t border-white/5 flex items-center justify-around z-50">
      {navItems.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || (href === "/" && pathname === "");
        return (
          <Link
            key={label}
            href={href}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive ? "text-gold-400" : "text-gray-600"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}