"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/portal‑sydr____-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Invalid password");
        return;
      }

      // Login successful – redirect using multiple methods
      const data = await res.json().catch(() => ({}));
      console.log("Login success, redirecting...");

      // 1) Try Next.js router (works if middleware allows)
      router.push("/portal‑sydr____");

      // 2) Fallback: after a short delay, force a full page navigation
      setTimeout(() => {
        window.location.href = "/portal‑sydr____";
      }, 1500);

    } catch (err) {
      setError("Network error. Please check your connection.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Lock className="h-12 w-12 text-gold-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Admin Access</h1>
          <p className="text-gray-400 mt-2">Enter your password to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gold-400/50"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gold-400 text-black font-semibold hover:bg-gold-500 py-3"
          >
            {loading ? "Checking..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
