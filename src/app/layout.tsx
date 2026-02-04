import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

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
  openGraph: {
    title: "Sentinela",
    description:
      "Crowdsourced emergency reporting — report disasters on a map, validated by the community, sent to local government.",
    url: "https://sentinela.help",
    siteName: "Sentinela",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentinela",
    description:
      "Crowdsourced emergency reporting — report disasters on a map, validated by the community.",
  },
  metadataBase: new URL("https://sentinela.help"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SiteHeader />
          <main className="relative min-h-dvh">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
