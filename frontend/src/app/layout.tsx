import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ZivaChat } from "@/components/ziva/ZivaChat";
import { LocationProvider } from "@/context/LocationContext";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { MessageProvider } from "@/context/MessageContext";
import { FloatingCart } from "@/components/ui/FloatingCart";
import { NotificationProvider } from "@/components/ui/NotificationProvider";
import { FloatingNotification } from "@/components/ui/FloatingNotification";
import { MessageBox } from "@/components/messaging/MessageBox";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PwaManager } from "@/components/ui/PwaManager";
export const metadata: Metadata = {
  title: "FairPrice | Premium African E-Commerce",
  description: "Secure, reliable, and premium e-commerce platform for Africa with Escrow protection.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#052e16",
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
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        className={cn("font-sans antialiased min-h-screen flex flex-col bg-white text-black")}
        suppressHydrationWarning
      >
        <LocationProvider>
          <AuthProvider>
            <CartProvider>
              <FavoritesProvider>
                <MessageProvider>
                  <NotificationProvider>
                    {children}
                    <ZivaChat />
                    <FloatingNotification />
                    <MessageBox />
                  </NotificationProvider>
                  <MobileBottomNav />
                </MessageProvider>
              </FavoritesProvider>
              <FloatingCart />
              <PwaManager />
            </CartProvider>
          </AuthProvider>
        </LocationProvider>
      </body>
    </html>
  );
}
