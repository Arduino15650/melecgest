import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MELECGEST — Magasin électrique",
  description: "Gestion du matériel électrique, inventaire et mouvements de stock.",
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
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
