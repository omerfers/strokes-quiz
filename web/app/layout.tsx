import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "The Strokes — Song Quiz",
  description:
    "A five-second clip, a title to guess, fifteen rounds. How well do you know The Strokes?",
  openGraph: {
    title: "The Strokes — Song Quiz",
    description: "A five-second clip, a title to guess, fifteen rounds.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0909",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
