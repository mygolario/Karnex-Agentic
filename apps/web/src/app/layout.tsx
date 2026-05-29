import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Karnex — Your AI Co-Founder",
  description:
    "Karnex is an agentic AI platform that builds your startup alongside you. From idea validation to execution, your AI co-founder handles it.",
  keywords: ["AI", "startup", "co-founder", "agents", "SaaS", "solo founder"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#07070f] font-sans text-white">
        {children}
      </body>
    </html>
  );
}
