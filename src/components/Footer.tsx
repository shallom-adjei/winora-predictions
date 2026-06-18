import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#050505] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          {/* Products */}
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-4">Products</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <Link href="/predictions" className="hover:text-white transition-colors">
                  Predictions
                </Link>
              </li>
              <li>
                <Link href="/results" className="hover:text-white transition-colors">
                  Results
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>

          {/* Follow Us */}
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-4">Follow Us</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Telegram
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Instagram
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Twitter
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  YouTube
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between border-t border-white/5 pt-8">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <img
              src="/winora-logo.png"
              alt="Winora"
              className="h-8 w-auto"
            />
            <span className="text-sm text-gray-500">
              Smarter predictions. Better results.
            </span>
          </div>
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} Winora Sports Intelligence. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}