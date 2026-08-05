import type { Metadata } from "next";
import { Nunito, Lora, Great_Vibes } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const greatVibes = Great_Vibes({
  weight: "400",
  variable: "--font-script",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nuestra Boda - Lista de Regalos",
  description: "Lista de regalos para nuestra boda",
  // Necesario para que iOS permita instalar el sitio y, con eso, recibir Web Push.
  appleWebApp: {
    capable: true,
    title: "Melissa & Julio",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${nunito.variable} ${lora.variable} ${greatVibes.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
