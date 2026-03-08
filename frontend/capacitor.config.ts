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

  // ─── Server: Live URL Mode ──────────────────────────────
  // In production, the app loads from Vercel deployment
  // In development, it loads from localhost for hot reloading
  server: {
    url: IS_DEV ? "http://localhost:3000" : undefined,
    cleartext: IS_DEV, // Allow HTTP in dev (required for localhost)
    // Production loads from webDir static export OR you can set:
    // url: "https://fairprice-ten.vercel.app" for always-online mode
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
    backgroundColor: "#059669", // FairPrice emerald — matches splash
    allowsLinkPreview: true,
    scrollEnabled: true,
  },

  // ─── Android Configuration ──────────────────────────────
  android: {
    backgroundColor: "#059669",
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
      resize: "body",                   // Resize WebView when keyboard opens
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
