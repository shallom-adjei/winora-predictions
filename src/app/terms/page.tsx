import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface-primary text-white flex flex-col pb-24 lg:pb-0">
      <PublicHeader />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-12 w-full">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Terms of Service</h1>
        <div className="space-y-6 text-gray-300 text-sm sm:text-base leading-relaxed">
          <p><strong className="text-white">Effective Date:</strong> June 2026</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing Winora, you agree to be bound by these Terms of Service. If you
            do not agree with any part of the terms, please do not use our website.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">2. Informational Purposes Only</h2>
          <p>
            Winora provides sports predictions and analysis for informational and
            entertainment purposes only. We do not guarantee the accuracy of any
            prediction, and we are not responsible for any financial decisions made based
            on our content. Betting involves risk – please gamble responsibly.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">3. Intellectual Property</h2>
          <p>
            All content, logos, and data on this site are the property of Winora Sports
            Intelligence. Unauthorised reproduction or distribution is prohibited.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">4. Affiliate Links</h2>
          <p>
            Our website contains affiliate links to betting partners. We may earn a
            commission when you click on these links and register with the partner
            site. This does not affect the price you pay. We are not responsible for
            the content or practices of third‑party websites.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">5. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Changes will be
            effective immediately upon posting. Continued use of the site constitutes
            acceptance of the updated terms.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">6. Contact</h2>
          <p>
            For any questions regarding these Terms, please visit our{" "}
            <a href="/contact" className="text-gold-400 underline">Contact page</a>.
          </p>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}