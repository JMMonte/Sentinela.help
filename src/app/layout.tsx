import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sentinela",
    template: "%s | Sentinela",
  },
  description:
    "Crowdsourced emergency reporting — report disasters, fires, floods, and emergencies on a map. Community-validated alerts sent to local government.",
  keywords: [
    "emergency reporting",
    "disaster reporting",
    "crowdsourced alerts",
    "flood report",
    "fire report",
    "community safety",
    "incident map",
  ],
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Sentinela",
    description:
      "Crowdsourced emergency reporting — report disasters on a map, validated by the community, sent to local government.",
    url: "https://sentinela.help",
    siteName: "Sentinela",
    type: "website",
    images: [
      {
        url: "/og_share.png",
        width: 1200,
        height: 630,
        alt: "Sentinela - Crowdsourced Emergency Reporting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentinela",
    description:
      "Crowdsourced emergency reporting — report disasters on a map, validated by the community.",
    images: ["/og_share.png"],
  },
  metadataBase: new URL("https://sentinela.help"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
