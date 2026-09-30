import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
export const metadata: Metadata = { title: "ClipFarm", description: "Post clips. Earn money." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e0e10" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body><SessionProvider>{children}</SessionProvider></body></html>);
}
