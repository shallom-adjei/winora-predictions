import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface-primary text-white flex flex-col pb-24 lg:pb-0">
      <PublicHeader />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-12 w-full">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="space-y-6 text-gray-300 text-sm sm:text-base leading-relaxed">
          <p><strong className="text-white">Effective Date:</strong> June 2026</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">1. Information We Collect</h2>
          <p>
            Winora does not require user accounts. We collect only the email addresses
            voluntarily submitted through our early‑access waitlist. We do not collect
            personal data automatically.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">2. Cookies</h2>
          <p>
            Our website may use strictly necessary cookies to ensure proper functioning.
            We do not currently use tracking or advertising cookies. If this changes,
            this policy will be updated accordingly.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">3. How We Use Your Information</h2>
          <p>
            Email addresses submitted via the waitlist are used solely to notify you when
            VIP early access becomes available. We never share, sell, or rent your
            personal information.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">4. Data Security</h2>
          <p>
            We take reasonable precautions to protect your information. However, no method
            of transmission over the internet is 100% secure.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">5. Contact</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us via the{" "}
            <a href="/contact" className="text-gold-400 underline">Contact page</a>.
          </p>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}