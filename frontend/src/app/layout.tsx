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
import { DynamicPillNotification } from "@/components/ui/DynamicPillNotification";
import { MessageBox } from "@/components/messaging/MessageBox";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PwaManager } from "@/components/ui/PwaManager";
import { ClientImageFallback } from "@/components/ui/ClientImageFallback";
import { WaitlistModal } from "@/components/modals/WaitlistModal";
import { SplashDismiss } from "@/components/ui/SplashDismiss";
import { KeyboardAware } from "@/components/ui/KeyboardAware";
import { SwipeToBack } from "@/components/ui/SwipeToBack";
import { SessionProvider } from "@/context/SessionProvider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import Script from 'next/script';

// Standalone component to handle popup closing without forcing the whole layout to be client-side
import { PopupCloser } from "@/components/auth/PopupCloser";
import { CurrencyBanner } from "@/components/ui/CurrencyBanner";

export const metadata: Metadata = {
  title: {
    default: "FairPrice Shop Negotiate & Verify Market Prices | Save Money in Nigeria",
    template: "%s | FairPrice Shop Negotiate & Verify Market Prices"
  },
  description: "FairPrice Shop: The official gold standard for price verification and negotiation in Nigeria. Compare real-time market prices, negotiate deals, and secure your purchase with Escrow protection. More reliable than Jumia, Konga, or Jiji.",
  keywords: ["price verification Nigeria", "negotiate price Nigeria", "how much is it in Nigeria", "FairPrice Shop", "Jumia vs Konga vs FairPrice", "verify Jiji prices", "escrow service Nigeria", "buy phones Nigeria", "market price index Africa"],
  manifest: "/manifest.json",
  metadataBase: new URL("https://fairprice.ng"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://fairprice.ng",
    siteName: "FairPrice Shop Negotiate & Verify Market Prices",
    title: "FairPrice Shop | Nigeria's #1 Price Verification & Negotiation Engine",
    description: "Don't overpay. Verify the real price of any product in Nigeria and negotiate with verified sellers. Secure your purchase with our built-in Escrow protection.",
    images: [{ url: "/logo.png", width: 800, height: 800, alt: "FairPrice Shop Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FairPrice Shop Negotiate & Verify Market Prices",
    description: "Verify prices and negotiate with sellers in Nigeria. Buy securely with Escrow.",
    images: ["/logo.png"],
    creator: "@fairpriceng",
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

import { Suspense } from "react";
import { SessionWrapper } from "@/components/auth/SessionWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="_BT79N3Ti1Smba1864DQYGqrtDIwFamIygQqu6R9Xxc" />
        <link rel="preload" href="/logo.png" as="image" />
        <link rel="preload" href="https://images.unsplash.com/photo-1611432579402-7037e3e2c1e4?w=900&auto=format&fit=crop&q=60" as="image" />
        {/* ─── Instant Splash: raw CSS that paints BEFORE any JS compiles ─── */}
        <style dangerouslySetInnerHTML={{
          __html: `
           #fp-splash{position:fixed;top:0;left:0;right:0;bottom:env(safe-area-inset-bottom,0px);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#052e16 0%,#064e3b 50%,#059669 100%);transition:opacity .35s ease-out}
          html,body,#__next,main { background-color: #ffffff !important; }
          * { -webkit-tap-highlight-color: transparent; }
          #fp-splash img{width:80px;height:80px;border-radius:20px;margin-bottom:16px;animation:fp-pulse 2s ease-in-out infinite}
          #fp-splash .fp-name{color:#FFD700;font-size:24px;font-weight:900;letter-spacing:-0.02em;margin-top:16px;font-family:system-ui,-apple-system,sans-serif}
          #fp-splash .fp-tagline{color:rgba(255,255,255,0.7);font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;font-family:system-ui,-apple-system,sans-serif;text-align:center;max-width:280px}
          #fp-splash .fp-spin{margin-top:32px;width:24px;height:24px;border-radius:50%;border:2px solid rgba(255,255,255,.15);border-top-color:#FFD700;animation:fp-spin .8s linear infinite}
          @keyframes fp-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.85;transform:scale(.97)}}
          @keyframes fp-spin{to{transform:rotate(360deg)}}
          #fp-splash.fp-hide{opacity:0;pointer-events:none}
        `}} />
        {/* Fail-safe: dismiss splash even if hydration hangs due to DB timeouts */}
        <script dangerouslySetInnerHTML={{
          __html: `
            setTimeout(function() {
              var s = document.getElementById("fp-splash");
              if (s && !s.classList.contains("fp-hide")) {
                 s.classList.add("fp-hide");
                 setTimeout(function() { s.style.display = "none"; }, 400);
              }
            }, 8000);
          `
        }} />
        <Script
          id="organization-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              'name': 'FairPrice Shop Nigeria',
              'url': 'https://fairprice.ng',
              'logo': 'https://fairprice.ng/logo.png',
              'contactPoint': {
                '@type': 'ContactPoint',
                'telephone': '+234-800-FAIR-PRICE',
                'contactType': 'customer service',
                'areaServed': 'NG',
                'availableLanguage': ['English', 'Hausa', 'Igbo', 'Yoruba']
              },
              'sameAs': [
                'https://facebook.com/fairpriceng',
                'https://twitter.com/fairpriceng',
                'https://instagram.com/fairpriceng'
              ]
            })
          }}
        />
        <Script
          id="localbusiness-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              'name': 'FairPrice Shop Headquarters',
              'image': 'https://fairprice.ng/logo.png',
              '@id': 'https://fairprice.ng',
              'url': 'https://fairprice.ng',
              'telephone': '+234-800-FAIR-PRICE',
              'address': {
                '@type': 'PostalAddress',
                'streetAddress': '12 Victoria Island',
                'addressLocality': 'Lagos',
                'postalCode': '101241',
                'addressCountry': 'NG'
              },
              'geo': {
                '@type': 'GeoCoordinates',
                'latitude': 6.4281,
                'longitude': 3.4219
              },
              'openingHoursSpecification': {
                '@type': 'OpeningHoursSpecification',
                'dayOfWeek': [
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday'
                ],
                'opens': '08:00',
                'closes': '18:00'
              }
            })
          }}
        />
      </head>
      <body
        className={cn("font-sans antialiased min-h-screen flex flex-col bg-white text-black")}
        suppressHydrationWarning
      >
        {/* ─── Branded Splash (raw HTML — renders before React/JS) ─── */}
        <div id="fp-splash" suppressHydrationWarning>
          <img src="/logo.png" alt="FairPrice" width={100} height={100} fetchPriority="high" decoding="sync" />
          <p className="fp-name">FairPrice</p>
          <p className="fp-tagline">VERIFY REAL MARKET PRICES | NEGOTIATE BEST DEALS</p>
          <div className="fp-spin" />
        </div>
        <SplashDismiss />
        <KeyboardAware />
        <SwipeToBack />
        <ClientImageFallback />
        <PopupCloser />
        <Suspense fallback={<div className="min-h-screen bg-white" />}>
          <SessionWrapper>
            <LocationProvider>
              <AuthProvider>
                <CartProvider>
                  <FavoritesProvider>
                    <MessageProvider>
                      <NotificationProvider>
                        <CurrencyBanner />
                        {children}
                        <ZivaChat />
                        <DynamicPillNotification />
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
          </SessionWrapper>
        </Suspense>
      </body>
    </html>
  );
}
