import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Gestion AETV — Achats, Ventes & Stock",
  description:
    "Application de gestion commerciale : achats, ventes, stock, clients et rapports.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-100 font-sans text-zinc-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}