import { Suspense } from "react";
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
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import { SessionWrapper } from "@/components/auth/SessionWrapper";
import Script from 'next/script';
import { Analytics } from "@vercel/analytics/next";

// Standalone component to handle popup closing without forcing the whole layout to be client-side
import { PopupCloser } from "@/components/auth/PopupCloser";
import { CurrencyBanner } from "@/components/ui/CurrencyBanner";
import { FloatingWhatsApp } from "@/components/ui/FloatingWhatsApp";

export const metadata: Metadata = {
  title: {
    default: "FairPrice Shop Negotiate & Verify Market Prices | Save Money in Nigeria",
    template: "%s | FairPrice Shop Negotiate & Verify Market Prices"
  },
  description: "FairPrice Shop: The official gold standard for price verification, negotiation, and secure selling in Nigeria. Buy or sell products with real-time market prices, negotiate deals, and secure transactions with Escrow protection. The smartest way to trade in Nigeria.",
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
    title: "FairPrice Shop | Nigeria's #1 Price Verification & Negotiation Marketplace",
    description: "Don't overpay or undersell. Verify real market prices, negotiate the best deals, or start selling to millions of buyers in Nigeria. Secure transactions with built-in Escrow protection.",
    images: [{ url: "/logo.png", width: 800, height: 800, alt: "FairPrice Shop Logo" }],  
  },
  twitter: {
    card: "summary_large_image",
    title: "FairPrice Shop Negotiate & Verify Market Prices",
    description: "Verify prices, negotiate deals, and sell securely in Nigeria. Trade with confidence using FairPrice Escrow.",
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
};

import { GlobalErrorBoundary } from "@/components/ui/GlobalErrorBoundary";

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
        {/* ─── Instant Splash: raw CSS ─── */}
        <style dangerouslySetInnerHTML={{
          __html: `
           #fp-splash{position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#ffffff;transition:opacity .4s ease-out;pointer-events:all}
          #fp-splash .logo-container{width:100px;height:100px;border-radius:24px;background:#ffffff;padding:12px;box-shadow:0 12px 30px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04);animation:fp-pulse 2s ease-in-out infinite}
          #fp-splash img{width:100%;height:100%;object-fit:cover;scale:1.1;border-radius:12px}
          #fp-splash .fp-name{color:#111827;font-size:26px;font-weight:900;letter-spacing:-0.03em;margin-top:24px;font-family:system-ui,-apple-system,sans-serif;}
          #fp-splash .fp-tagline{color:#6B7280;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin-top:8px;font-family:system-ui,-apple-system,sans-serif;text-align:center;max-width:300px;}
          #fp-splash .fp-spin{margin-top:40px;width:24px;height:24px;border-radius:50%;border:3px solid #f3f4f6;border-top-color:#10b981;animation:fp-spin .8s linear infinite}
          @keyframes fp-pulse{0%,100%{transform:scale(1);box-shadow:0 12px 30px rgba(0,0,0,0.08)}50%{transform:scale(0.97);box-shadow:0 8px 20px rgba(0,0,0,0.04)}}
          @keyframes fp-spin{to{transform:rotate(360deg)}}
          #fp-splash.fp-hide{opacity:0;pointer-events:none}
        `}} />
        {/* Fail-safe script: Hardens against iOS White/Green Screen hangs */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var hideSplash = function() {
                var s = document.getElementById("fp-splash");
                if (s && !s.classList.contains("fp-hide")) {
                   s.classList.add("fp-hide");
                   setTimeout(function() { s.style.display = "none"; }, 500);
                }
              };
              // Auto-dismiss if ANY fatal JS error occurs during boot
              window.onerror = function() { hideSplash(); };
              window.onunhandledrejection = function() { hideSplash(); };
              // Timeout fail-safes (3s, 6s)
              setTimeout(hideSplash, 3000);
              setTimeout(hideSplash, 6000);
            })();
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
                'telephone': '+234-816-281-6305',
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
              'telephone': '+234-816-281-6305',
              'address': {
                '@type': 'PostalAddress',
                'streetAddress': '12 New Market Road',
                'addressLocality': 'Onitsha',
                'addressRegion': 'Anambra State',
                'postalCode': '430213',
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
          <div className="logo-container">
            <img src="/logo.png" alt="FairPrice" width={100} height={100} fetchPriority="high" decoding="sync" />
          </div>
          <p className="fp-name">FairPrice</p>
          <p className="fp-tagline">VERIFY REAL MARKET PRICES | NEGOTIATE BEST DEALS</p>
          <div className="fp-spin" />
        </div>
        
        <GlobalErrorBoundary>
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
                          <FloatingWhatsApp />
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
          <Analytics />
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
