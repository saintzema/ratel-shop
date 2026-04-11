import { KeyboardResize } from "@capacitor/keyboard";
import type { CapacitorConfig } from "@capacitor/cli";

// ─── FairPrice Capacitor Configuration ─────────────────────
// Production: loads from Vercel deployment
// Development: loads from local Next.js dev server
// This approach gives 100% visual parity with the web app while
// enabling native features (push notifications, haptics, etc.)
// ────────────────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV !== "production";

const config: CapacitorConfig = {
  appId: "com.fairprice.app",
  appName: "FairPrice",
  webDir: "out", // Static fallback — used for offline/initial load

  server: {
    // Development: point to your local machine (e.g., http://192.168.1.100:3000)
    // Simulator: use http://localhost:3000
    // Production: https://fairprice-ten.vercel.app
    url: "http://localhost:3000",
    allowNavigation: [
      "fairprice-ten.vercel.app",
      "*.vercel.app",
      "localhost:3000",
      "*.paystack.co",         // Payment gateway
      "paystack.com",
      "checkout.paystack.com",
    ],
  },

  // ─── iOS Configuration ──────────────────────────────────
  ios: {
    scheme: "FairPrice",
    contentInset: "automatic",
    preferredContentMode: "mobile",
    backgroundColor: "#FFFFFF", // White — prevents green flash while WebView loads
    allowsLinkPreview: true,
    scrollEnabled: false, // Prevents iOS webview overscroll rubber-banding
  },

  // ─── Android Configuration ──────────────────────────────
  android: {
    backgroundColor: "#FFFFFF",
    allowMixedContent: true, // Allow HTTP resources in WebView
    captureInput: true,      // Prevents keyboard issues
    webContentsDebuggingEnabled: IS_DEV, // WebView debug in dev only
    buildOptions: {
      keystorePath: undefined, // Set when signing for Play Store
      keystoreAlias: undefined,
    },
  },

  // ─── Plugin Configuration ──────────────────────────────
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 3000,
      backgroundColor: "#FFFFFF",       // White background to match app
      showSpinner: true,
      spinnerColor: "#059669",          // Green spinner
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",                    // Dark text on white bar
      backgroundColor: "#FFFFFF",       // White status bar
    },
    Keyboard: {
      resize: KeyboardResize.None,     // Use manual resizing (bottom: var(--kb-height)) for 100% control
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#059669",
    },
  },
};

export default config;
