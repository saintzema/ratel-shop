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
    // This was hardcoded to localhost:3000 for BOTH dev and "production"
    // builds — IS_DEV was computed above but never actually applied here.
    // Any release build made before this fix would install and show a blank/
    // broken screen on a real device, since the device has nothing listening
    // on its own localhost:3000. Now genuinely branches on IS_DEV.
    //
    // Local dev on a physical device/simulator: temporarily override this to
    // your machine's LAN IP (e.g. http://192.168.1.100:3000) or
    // http://localhost:3000 for the simulator only — never commit that
    // override, it must always be the production URL by the time anyone
    // runs a release build.
    url: IS_DEV ? "http://localhost:3000" : "https://www.fairprice.ng",
    allowNavigation: [
      "www.fairprice.ng",
      "fairprice.ng",
      "fairprice-ten.vercel.app", // staging/legacy alias — harmless to keep allowlisted
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
      // Real values live in android/keystore.properties (gitignored) and are read
      // directly by android/app/build.gradle for `./gradlew bundleRelease`. These
      // env-var reads only matter if you build via `npx cap build android` instead —
      // never hardcode secrets here, this file is committed to git.
      releaseType: "AAB",
      keystorePath: process.env.ANDROID_KEYSTORE_PATH || "android/keystore/fairprice-release.jks",
      keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD,
      keystoreAlias: process.env.ANDROID_KEYSTORE_ALIAS || "fairprice",
      keystoreAliasPassword: process.env.ANDROID_KEYSTORE_ALIAS_PASSWORD,
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
