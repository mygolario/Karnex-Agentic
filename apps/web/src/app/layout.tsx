import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Karnex — The AI Co-Founder for Solo Founders",
  description:
    "Karnex is a multi-agent AI platform that turns raw ideas into launched products with real revenue. Build and launch startups alone, without being alone.",
  keywords: ["AI", "startup", "co-founder", "agents", "SaaS", "solo founder", "indie hacker", "automation"],
  icons: {
    icon: "/icon.jpeg",
    apple: "/apple-icon.jpeg",
  },
  openGraph: {
    title: "Karnex — The AI Co-Founder for Solo Founders",
    description:
      "Karnex is a multi-agent AI platform that turns raw ideas into launched products with real revenue. Build and launch startups alone, without being alone.",
    images: [
      {
        url: "/opengraph-image.jpeg",
        width: 1200,
        height: 630,
        alt: "Karnex Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Karnex — The AI Co-Founder for Solo Founders",
    description:
      "Karnex is a multi-agent AI platform that turns raw ideas into launched products with real revenue. Build and launch startups alone, without being alone.",
    images: ["/twitter-image.jpeg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#07070f] font-sans text-white">
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
