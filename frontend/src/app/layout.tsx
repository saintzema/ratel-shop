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
      <body
        className={cn("font-sans antialiased min-h-screen flex flex-col bg-white text-black")}
        suppressHydrationWarning
      >
        {/* ─── Branded Instant Loading Shell (shows before React hydrates) ─── */}
        <div
          id="fp-splash"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #052e16 0%, #064e3b 50%, #059669 100%)',
            transition: 'opacity 0.4s ease-out',
          }}
        >
          <img
            src="/logo.png"
            alt="FairPrice"
            width={80}
            height={80}
            style={{ borderRadius: 20, marginBottom: 16, animation: 'pulse 2s ease-in-out infinite' }}
          />
          <p style={{ color: 'white', fontSize: 16, fontWeight: 600, letterSpacing: 1, opacity: 0.9 }}>FairPrice</p>
          <div style={{ marginTop: 24, width: 32, height: 32, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(0.95); } }
          `}} />
        </div>
        <script dangerouslySetInnerHTML={{
          __html: `
          (function() {
            var check = setInterval(function() {
              if (document.querySelector('[data-app-ready]')) {
                var splash = document.getElementById('fp-splash');
                if (splash) { splash.style.opacity = '0'; setTimeout(function() { splash.remove(); }, 400); }
                clearInterval(check);
              }
            }, 100);
            setTimeout(function() {
              var splash = document.getElementById('fp-splash');
              if (splash) { splash.style.opacity = '0'; setTimeout(function() { splash.remove(); }, 400); }
            }, 8000);
          })();
        `}} />
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
