import { KeyboardResize } from "@capacitor/keyboard";
import type { CapacitorConfig } from "@capacitor/cli";

// ─── FairPrice Capacitor Configuration ─────────────────────
// Production: loads from Vercel deployment
// Development: loads from local Next.js dev server
// This approach gives 100% visual parity with the web app while
// enabling native features (push notifications, haptics, etc.)
// ────────────────────────────────────────────────────────────

// Opt-IN dev server, not opt-out.
//
// This used to be `process.env.NODE_ENV !== "production"`, which is a trap for
// native builds: `npx cap sync` runs as its own CLI invocation, and nothing in
// CI (Codemagic) or a plain local `cap sync` sets NODE_ENV. So every release
// build silently generated capacitor.config.json with url=http://localhost:3000,
// and the shipped app booted the splash, asked WKWebView/WebView to load a
// server on the *phone's* own localhost, found nothing, and sat on a white
// screen forever. That shipped to both TestFlight and Play closed testing.
//
// Now the production URL is the default and you have to explicitly ask for the
// dev server, so the worst case for a misconfigured build is "points at prod"
// rather than "points at nothing".
//
// For local development against a device/simulator:
//   CAP_DEV_SERVER=http://192.168.1.100:3000 npx cap sync ios
//   (or CAP_DEV_SERVER=1 for the http://localhost:3000 default, simulator only)
const DEV_SERVER = process.env.CAP_DEV_SERVER;
const DEV_SERVER_URL = DEV_SERVER === "1" ? "http://localhost:3000" : DEV_SERVER;

const config: CapacitorConfig = {
  // NOTE: iOS and Android now have DIFFERENT identifiers. iOS is
  // ai.fairprice.app — the existing App Store Connect app record ("FairPrice
  // Shopping with AI", Apple ID 6760352736) is bound to this bundle ID, even
  // though com.fairprice.app is ALSO a registered Identifier — using
  // com.fairprice.app would orphan the existing App Store Connect listing.
  // Android is com.fairprice.ng — com.fairprice.app was separately claimed on
  // Google Play by an untraceable prior registration, so Android moved to
  // .ng instead (set directly in android/app/build.gradle's applicationId,
  // not derived from this field).
  // Capacitor's config schema only supports one appId, and it only matters
  // for scaffolding a brand-new native project anyway — both native projects
  // already exist and read their real identifier from their own project
  // files, so this value just tracks iOS as the "primary" one.
  appId: "ai.fairprice.app",
  appName: "FairPrice",
  webDir: "out", // Static fallback — used for offline/initial load

  server: {
    // Defaults to production. See the DEV_SERVER note at the top of this file —
    // pointing a release build at localhost is what caused the white-screen-
    // after-splash on both TestFlight and Play, so that now requires explicitly
    // setting CAP_DEV_SERVER rather than merely failing to set NODE_ENV.
    url: DEV_SERVER_URL || "https://www.fairprice.ng",
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
    // MUST stay true. This was false to suppress overscroll rubber-banding, but
    // scrollEnabled governs the WKWebView's scroll view outright — with it off,
    // the shipped app could not scroll vertically AT ALL (reported: "pages only
    // move sideways"). Rubber-banding is a cosmetic nitpick; not being able to
    // scroll makes the app unusable. If the bounce is worth removing later, do it
    // in CSS (overscroll-behavior), never by disabling scrolling.
    scrollEnabled: true,
  },

  // ─── Android Configuration ──────────────────────────────
  android: {
    backgroundColor: "#FFFFFF",
    allowMixedContent: true, // Allow HTTP resources in WebView
    captureInput: true,      // Prevents keyboard issues
    webContentsDebuggingEnabled: !!DEV_SERVER_URL, // WebView debug in dev only
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
      // Mirrors the web loading screen: white ground, centred FairPrice mark, green
      // spinner beneath. androidScaleType was CENTER_CROP, which zooms the splash
      // image to fill and crops the logo's edges on tall phones — CENTER keeps the
      // mark whole and centred, which is what the web loader looks like.
      launchAutoHide: true,
      // 3s was longer than the WebView needs and left the user staring at a static
      // screen after the app was already ready underneath.
      launchShowDuration: 1200,
      launchFadeOutDuration: 300,
      backgroundColor: "#FFFFFF",
      showSpinner: true,
      spinnerColor: "#059669",
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      androidScaleType: "CENTER",
      splashFullScreen: false,
      splashImmersive: false,
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
