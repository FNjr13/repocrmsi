import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SI CRM | CRM Inmobiliario",
  description: "Plataforma de Ventas y Marketing para proyectos inmobiliarios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>{children}</body>
    </html>
  );
}
