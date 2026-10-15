import type { Metadata, Viewport } from "next";
import MetaPixel from "@/components/MetaPixel";
import TikTokPixel from "@/components/TikTokPixel";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auxílio-acidente do INSS | BMZ Advogados",
  description:
    "Sofreu um acidente e ficou com sequela? Responda 5 perguntas rápidas e descubra em 1 minuto se você tem direito a um benefício do INSS.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#011232",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <TikTokPixel />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <MetaPixel />
      </body>
    </html>
  );
}
