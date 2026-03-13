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
    // Production loads from webDir static export. Localhost only manually used for local testing.
    cleartext: IS_DEV, // Allow HTTP in dev (required for localhost)
    // url: "https://fairprice-ten.vercel.app" for always-online mode
    url: "https://fairprice-ten.vercel.app",
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
      launchShowDuration: 2000,
      backgroundColor: "#059669",       // FairPrice emerald
      showSpinner: true,
      spinnerColor: "#FFFFFF",
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",                   // White text on dark bar
      backgroundColor: "#059669",       // Android status bar color
    },
    Keyboard: {
      resize: KeyboardResize.Body,      // Resize WebView when keyboard opens
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
