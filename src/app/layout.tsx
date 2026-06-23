import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClientWrapper } from "@/components/ClientWrapper";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Winora – Sports Intelligence",
  description: "Premium data-driven sports predictions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google AdSense verification */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2828532403069223"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
  <ClientWrapper>{children}</ClientWrapper>
</body>
    </html>
  );
}