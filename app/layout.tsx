import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liquor POS - Multi-Tenant",
  description: "Multi-tenant liquor point of sale system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
