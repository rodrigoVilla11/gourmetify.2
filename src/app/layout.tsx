import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gourmetify - Gestión de stock para negocios gastronómicos",
  description: "Gourmetify es una aplicación de gestión de stock diseñada para negocios gastronómicos. Permite a los usuarios llevar un control detallado de sus ingredientes, proveedores, recetas y ventas, facilitando la toma de decisiones informadas y optimizando la operación del negocio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased bg-gray-50`}>
        {children}
      </body>
    </html>
  );
}
