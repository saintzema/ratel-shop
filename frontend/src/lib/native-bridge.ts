/**
 * FairPrice — Capacitor Native Bridge
 * 
 * This module provides a unified interface for the web app to access
 * native device features when running inside Capacitor (iOS/Android).
 * All methods gracefully fall back to no-ops when running in a browser.
 * 
 * Usage in any component:
 *   import { nativeBridge } from "@/lib/native-bridge";
 *   await nativeBridge.hapticFeedback();
 *   await nativeBridge.setStatusBarColor("#059669");
 */

import { Capacitor } from "@capacitor/core";

// ─── Platform Detection ──────────────────────────────────────
export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === "ios";
export const isAndroid = Capacitor.getPlatform() === "android";
export const isWeb = Capacitor.getPlatform() === "web";

// ─── Lazy-loaded plugins (tree-shaken when not on native) ────
async function getStatusBar() {
    const { StatusBar } = await import("@capacitor/status-bar");
    return StatusBar;
}

async function getSplashScreen() {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    return SplashScreen;
}

async function getHaptics() {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
    return { Haptics, ImpactStyle, NotificationType };
}

async function getKeyboard() {
    const { Keyboard } = await import("@capacitor/keyboard");
    return Keyboard;
}

async function getPushNotifications() {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    return PushNotifications;
}

async function getBrowser() {
    const { Browser } = await import("@capacitor/browser");
    return Browser;
}

async function getApp() {
    const { App } = await import("@capacitor/app");
    return App;
}

// ─── Native Bridge ──────────────────────────────────────────
export const nativeBridge = {
    // ─── Status Bar ────────────────────────────────────────
    async setStatusBarColor(color: string) {
        if (!isNative) return;
        try {
            const StatusBar = await getStatusBar();
            await StatusBar.setBackgroundColor({ color });
        } catch { }
    },

    async setStatusBarLight() {
        if (!isNative) return;
        try {
            const StatusBar = await getStatusBar();
            await StatusBar.setStyle({ style: "LIGHT" as any });
        } catch { }
    },

    async setStatusBarDark() {
        if (!isNative) return;
        try {
            const StatusBar = await getStatusBar();
            await StatusBar.setStyle({ style: "DARK" as any });
        } catch { }
    },

    // ─── Haptics ───────────────────────────────────────────
    async hapticFeedback(style: "light" | "medium" | "heavy" = "light") {
        if (!isNative) return;
        try {
            const { Haptics, ImpactStyle } = await getHaptics();
            const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
            await Haptics.impact({ style: map[style] });
        } catch { }
    },

    async hapticSuccess() {
        if (!isNative) return;
        try {
            const { Haptics, NotificationType } = await getHaptics();
            await Haptics.notification({ type: NotificationType.Success });
        } catch { }
    },

    async hapticError() {
        if (!isNative) return;
        try {
            const { Haptics, NotificationType } = await getHaptics();
            await Haptics.notification({ type: NotificationType.Error });
        } catch { }
    },

    // ─── Splash Screen ─────────────────────────────────────
    async hideSplash() {
        if (!isNative) return;
        try {
            const SplashScreen = await getSplashScreen();
            await SplashScreen.hide();
        } catch { }
    },

    // ─── Keyboard ──────────────────────────────────────────
    async hideKeyboard() {
        if (!isNative) return;
        try {
            const Keyboard = await getKeyboard();
            await Keyboard.hide();
        } catch { }
    },

    // ─── Push Notifications ────────────────────────────────
    async registerPushNotifications(): Promise<string | null> {
        if (!isNative) return null;
        try {
            const PushNotifications = await getPushNotifications();
            const permission = await PushNotifications.requestPermissions();
            if (permission.receive === "granted") {
                await PushNotifications.register();
                return new Promise((resolve) => {
                    PushNotifications.addListener("registration", (token) => {
                        resolve(token.value);
                    });
                    // Timeout after 5 seconds
                    setTimeout(() => resolve(null), 5000);
                });
            }
        } catch { }
        return null;
    },

    // ─── In-App Browser ────────────────────────────────────
    async openUrl(url: string) {
        if (!isNative) {
            window.open(url, "_blank");
            return;
        }
        try {
            const Browser = await getBrowser();
            await Browser.open({ url, presentationStyle: "popover" as any });
        } catch {
            window.open(url, "_blank");
        }
    },

    // ─── App State ─────────────────────────────────────────
    async onAppStateChange(callback: (isActive: boolean) => void) {
        if (!isNative) return;
        try {
            const App = await getApp();
            App.addListener("appStateChange", ({ isActive }) => callback(isActive));
        } catch { }
    },

    async onBackButton(callback: () => void) {
        if (!isAndroid) return;
        try {
            const App = await getApp();
            App.addListener("backButton", callback);
        } catch { }
    },
};

export default nativeBridge;
