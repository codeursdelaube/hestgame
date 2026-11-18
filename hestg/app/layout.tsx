/**
 * app/layout.tsx
 * Layout racine de l'application HESTGame
 */
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "HESTGame – Octobre Rose & Novembre Bleu",
  description:
    "Application de tirage au sort de l'événement Octobre Rose & Novembre Bleu – HEST Lomé, Togo",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#D81B7A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
