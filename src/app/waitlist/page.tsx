"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Crown, Mail, ArrowRight, CheckCircle } from "lucide-react";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { error } = await supabase.from("waitlist").insert({ email });
    if (error) {
      if (error.code === "23505") {
        setError("This email is already on the waitlist.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <PublicHeader />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {!submitted ? (
            <>
              <Crown className="h-12 w-12 text-gold-400 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Join the Waitlist</h1>
              <p className="text-gray-400 mb-6">
                Be the first to know when Winora VIP launches — and get free prediction alerts starting now.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-3">
                  <Mail className="h-5 w-5 text-gray-500 mr-2" />
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-transparent flex-1 text-white placeholder-gray-500 outline-none"
                  />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button type="submit" className="w-full rounded-xl bg-gold-400 text-black font-semibold hover:bg-gold-500 py-3">
                  Get Early Access <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="space-y-4">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
              <h1 className="text-3xl font-bold">You're on the list!</h1>
              <p className="text-gray-400">
                We'll email you when VIP launches — and you'll start receiving prediction alerts immediately.
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}