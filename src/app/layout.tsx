import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import {
  OrganizationJsonLd,
  WebSiteJsonLd,
} from "@/components/seo/json-ld";

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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sentinela",
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
      <head>
        {/* Theme color for browser UI */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#09090b" />

        {/* DNS Prefetch for external APIs */}
        <link rel="dns-prefetch" href="https://earthquake.usgs.gov" />
        <link rel="dns-prefetch" href="https://firms.modaps.eosdis.nasa.gov" />
        <link rel="dns-prefetch" href="https://api.ipma.pt" />
        <link rel="dns-prefetch" href="https://services.swpc.noaa.gov" />
        <link rel="dns-prefetch" href="https://opensky-network.org" />
        <link rel="dns-prefetch" href="https://api.openweathermap.org" />
        <link rel="dns-prefetch" href="https://aqicn.org" />
        <link rel="dns-prefetch" href="https://api.mapbox.com" />

        {/* Preconnect to critical resources */}
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* JSON-LD Structured Data - valid anywhere in document */}
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
