import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Three Body Lab — mapping the three-body chaos boundary",
  description:
    "An accessible research laboratory mapping where the planar gravitational three-body problem crosses from stable to chaotic, with a live simulator, twin-trajectory divergence view, and a frozen Lyapunov-exponent registry.",
  applicationName: "Three Body Lab",
  keywords: [
    "three-body problem",
    "chaos theory",
    "Lyapunov exponent",
    "celestial mechanics",
    "figure-eight orbit",
    "Lagrange point",
    "Euler collinear",
    "computational physics",
    "reproducible research",
    "web accessibility",
  ],
  openGraph: {
    title: "Three Body Lab",
    description:
      "Where does the three-body problem cross from stable to chaotic? A live simulator, a twin-trajectory divergence view, and a frozen, reproducible Lyapunov-exponent sweep.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Three Body Lab",
    description:
      "A reproducible laboratory mapping the chaos/stability boundary of the planar three-body problem.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
