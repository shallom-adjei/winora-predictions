import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminProfilePage() {
  return (
    <div className="p-6 text-white max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/portalsydr">
          <Button variant="ghost" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      <div className="rounded-2xl bg-[#0D0D0D] border border-white/5 p-8 max-w-md mx-auto text-center">
        <div className="h-20 w-20 rounded-full bg-gray-700 mx-auto mb-4 flex items-center justify-center text-3xl font-bold">
          A
        </div>
        <h2 className="text-xl font-semibold">Admin Shallom</h2>
        <p className="text-sm text-gray-400 mt-1">admin@winora.com</p>
        <p className="text-xs text-gray-500 mt-4">
          Profile management and password change will be available when authentication is enabled.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 text-xs text-gray-500 bg-white/5 rounded-lg px-4 py-2">
          Coming soon
        </div>
      </div>
    </div>
  );
}
