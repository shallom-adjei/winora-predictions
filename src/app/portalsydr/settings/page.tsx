import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="p-6 text-white max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/portalsydr">
          <Button variant="ghost" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="rounded-2xl bg-[#0D0D0D] border border-white/5 p-8 text-center">
        <h2 className="text-xl font-semibold text-gold-400 mb-2">Configuration Panel</h2>
        <p className="text-gray-400 text-sm mb-6">
          Settings for data sources, odds providers, and platform preferences will appear here.
        </p>
        <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-white/5 rounded-lg px-4 py-2">
          Coming soon
        </div>
      </div>
    </div>
  );
}