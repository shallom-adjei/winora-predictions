import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface-primary text-white flex flex-col">
      <PublicHeader />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gold-400">Login</h1>
          <p className="text-gray-400 mt-2">Coming soon.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}