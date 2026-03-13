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
import { KeyboardAware } from "@/components/ui/KeyboardAware";
import { SwipeToBack } from "@/components/ui/SwipeToBack";

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
  interactiveWidget: "resizes-visual",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/logo.png" as="image" />
        {/* ─── Instant Splash: raw CSS that paints BEFORE any JS compiles ─── */}
        <style dangerouslySetInnerHTML={{
          __html: `
          #fp-splash{position:fixed;inset:0;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#052e16 0%,#064e3b 50%,#059669 100%);transition:opacity .35s ease-out}
          #fp-splash img{width:80px;height:80px;border-radius:20px;margin-bottom:16px;animation:fp-pulse 2s ease-in-out infinite}
          #fp-splash .fp-name{color:#fff;font-size:16px;font-weight:600;letter-spacing:1px;opacity:.9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
          #fp-splash .fp-spin{margin-top:24px;width:32px;height:32px;border-radius:50%;border:3px solid rgba(255,255,255,.3);border-top-color:#fff;animation:fp-spin .8s linear infinite}
          @keyframes fp-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.85;transform:scale(.97)}}
          @keyframes fp-spin{to{transform:rotate(360deg)}}
          #fp-splash.fp-hide{opacity:0;pointer-events:none}
        `}} />
      </head>
      <body
        className={cn("font-sans antialiased min-h-screen flex flex-col bg-white text-black")}
        suppressHydrationWarning
      >
        {/* ─── Branded Splash (raw HTML — renders before React/JS) ─── */}
        <div id="fp-splash" suppressHydrationWarning>
          <img src="/logo.png" alt="FairPrice" width={80} height={80} fetchPriority="high" decoding="sync" />
          <p className="fp-name">FairPrice</p>
          <div className="fp-spin" />
        </div>
        <SplashDismiss />
        <KeyboardAware />
        <SwipeToBack />
        <ClientImageFallback />
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
              <WaitlistModal />
            </CartProvider>
          </AuthProvider>
        </LocationProvider>
      </body>
    </html>
  );
}
