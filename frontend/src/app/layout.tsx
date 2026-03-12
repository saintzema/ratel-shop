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
import { ClientImageFallback } from "@/components/ui/ClientImageFallback";
import { WaitlistModal } from "@/components/modals/WaitlistModal";
import { SplashDismiss } from "@/components/ui/SplashDismiss";

export const metadata: Metadata = {
  title: "FairPrice | Premium African E-Commerce",
  description: "Secure, reliable, and premium e-commerce platform for Africa with Escrow protection.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
    shortcut: "/favicon.ico",
  },
};

export const viewport = {
  themeColor: "#052e16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        className={cn("font-sans antialiased h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col bg-white text-black overscroll-none")}
        suppressHydrationWarning
      >
        {/* ─── Branded Instant Loading Shell (shows before React hydrates) ─── */}
        <div
          id="fp-splash"
          suppressHydrationWarning
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gradient-to-br from-[#052e16] via-[#064e3b] to-[#059669] transition-opacity duration-300 ease-out"
        >
          <img
            src="/logo.png"
            alt="FairPrice"
            width={80}
            height={80}
            className="rounded-[20px] mb-4 animate-[pulse_2s_ease-in-out_infinite]"
          />
          <p className="text-white text-base font-semibold tracking-[1px] opacity-90">FairPrice</p>
          <div className="mt-6 w-8 h-8 rounded-full border-[3px] border-white/30 border-t-white animate-[spin_0.8s_linear_infinite]" />
        </div>
        <SplashDismiss />
        <ClientImageFallback />
        <LocationProvider>
          <AuthProvider>
            <CartProvider>
              <FavoritesProvider>
                <MessageProvider>
                  <NotificationProvider>
                    <main className="flex-1 overflow-y-auto w-full relative">
                      {children}
                    </main>
                    <ZivaChat />
                    <FloatingNotification />
                    <MessageBox />
                  </NotificationProvider>
                  <MobileBottomNav />
                </MessageProvider>
              </FavoritesProvider>
              <FloatingCart />
              <PwaManager />
              <WaitlistModal />
            </CartProvider>
          </AuthProvider>
        </LocationProvider>
      </body>
    </html>
  );
}
