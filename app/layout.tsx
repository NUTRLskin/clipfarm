import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Clip Farm — Get paid to clip streamers", template: "%s · Clip Farm" },
  description: "Pick a streamer's contract, press Farm, post to TikTok. Every verified view pays you. All in one tab.",
  applicationName: "Clip Farm",
  openGraph: { title: "Clip Farm — Get paid to clip streamers", description: "Pick a contract. Press Farm. Post. Get paid.", type: "website" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0A0A0C" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body><SessionProvider>{children}</SessionProvider></body>
    </html>
  );
}
