"use client";
import { useState } from "react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { supabase } from "@/lib/supabase";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: insertError } = await supabase
      .from("contact_messages")
      .insert([form]);

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess(true);
      setForm({ name: "", email: "", message: "" });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col pb-24 lg:pb-0">
      <PublicHeader />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-20 w-full">
        <h1 className="text-3xl sm:text-5xl font-bold mb-8">
          Contact <span className="text-gold-400">Us</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left – Info */}
          <div className="space-y-4 text-gray-300 text-sm sm:text-base">
            <p>
              Got a question, suggestion, or just want to say hello? Fill in the form
              and we'll get back to you as soon as possible.
            </p>
            <p>
              You can also email us directly at{" "}
              <a href="mailto:hello@winora.com" className="text-gold-400 underline">
                hello@winora.com
              </a>
            </p>
          </div>

          {/* Right – Form */}
          <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 sm:p-8">
            {success ? (
              <div className="text-center text-green-400 font-semibold">
                Thank you! Your message has been sent.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  required
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold-400/50 transition-colors"
                />
                <input
                  type="email"
                  required
                  placeholder="Your email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold-400/50 transition-colors"
                />
                <textarea
                  required
                  rows={5}
                  placeholder="Your message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold-400/50 transition-colors resize-none"
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-xl bg-gold-400 text-black font-semibold hover:bg-gold-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}