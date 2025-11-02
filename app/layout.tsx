import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "sonner";
import PWAInstaller from "@/components/PWAInstaller";

export const metadata: Metadata = {
  title: "Liquor POS - Multi-Tenant",
  description: "Multi-tenant liquor point of sale system with inventory, sales, and customer management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Liquor POS",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon-192x192.svg",
    apple: "/icon-192x192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Navbar />
        {children}
        <Toaster position="top-right" richColors />
        <PWAInstaller />
      </body>
    </html>
  );
}
