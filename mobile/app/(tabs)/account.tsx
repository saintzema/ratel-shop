import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useAuthStore } from "../../src/stores/authStore";

const API_BASE = __DEV__
    ? Platform.OS === "web" ? "http://localhost:3000" : "http://172.20.10.3:3000"
    : "https://fairprice-ten.vercel.app";

interface MenuItem {
    icon: string;
    label: string;
    subtitle?: string;
    action: () => void;
    color?: string;
}

export default function AccountScreen() {
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);

    const handleLogout = () => {
        if (Platform.OS === "web") {
            logout();
        } else {
            Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: logout },
            ]);
        }
    };

    const openInBrowser = async (path: string) => {
        if (Platform.OS === "web") {
            window.open(`${API_BASE}${path}`, "_blank");
        } else {
            await WebBrowser.openBrowserAsync(`${API_BASE}${path}`);
        }
    };

    // ─── Guest View ──────────────────────────────────────────
    if (!user) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.guestContent}>
                    <View style={styles.guestAvatarWrap}>
                        <Ionicons name="person" size={48} color="#D1D5DB" />
                    </View>
                    <Text style={styles.guestTitle}>Welcome to FairPrice</Text>
                    <Text style={styles.guestSubtitle}>Sign in to track orders, manage negotiations, and more</Text>
                    <TouchableOpacity
                        style={styles.signInBtn}
                        onPress={() => router.push("/auth/login")}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.signInBtnText}>Sign In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push("/auth/register")}>
                        <Text style={styles.registerLink}>
                            Don't have an account? <Text style={styles.registerLinkBold}>Register</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ─── Authenticated View ──────────────────────────────────
    const menuSections: { title: string; items: MenuItem[] }[] = [
        {
            title: "Shopping",
            items: [
                { icon: "receipt-outline", label: "My Orders", subtitle: "Track orders & returns", action: () => { } },
                { icon: "chatbubbles-outline", label: "Negotiations", subtitle: "Manage price negotiations", action: () => { } },
                { icon: "heart-outline", label: "Wishlist", subtitle: "Saved items", action: () => { } },
                { icon: "notifications-outline", label: "Notifications", subtitle: "Updates & alerts", action: () => { } },
            ],
        },
        {
            title: "Seller",
            items: [
                { icon: "storefront-outline", label: "Seller Dashboard", subtitle: "Manage your store", action: () => openInBrowser("/seller") },
                { icon: "add-circle-outline", label: "Become a Seller", subtitle: "Start selling on FairPrice", action: () => openInBrowser("/seller/onboard") },
            ],
        },
        {
            title: "Support",
            items: [
                { icon: "help-circle-outline", label: "Help Center", subtitle: "FAQs & support", action: () => { } },
                { icon: "settings-outline", label: "Settings", subtitle: "Account preferences", action: () => { } },
                { icon: "log-out-outline", label: "Sign Out", action: handleLogout, color: "#EF4444" },
            ],
        },
    ];

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitial}>
                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                        </Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{user.name}</Text>
                        <Text style={styles.profileEmail}>{user.email}</Text>
                    </View>
                    <TouchableOpacity style={styles.editBtn}>
                        <Ionicons name="create-outline" size={18} color="#059669" />
                    </TouchableOpacity>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Orders</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Reviews</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>₦0</Text>
                        <Text style={styles.statLabel}>Saved</Text>
                    </View>
                </View>

                {/* Menu Sections */}
                {menuSections.map((section) => (
                    <View key={section.title} style={styles.menuSection}>
                        <Text style={styles.menuSectionTitle}>{section.title}</Text>
                        <View style={styles.menuCard}>
                            {section.items.map((item, idx) => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={[
                                        styles.menuItem,
                                        idx < section.items.length - 1 && styles.menuItemBorder,
                                    ]}
                                    onPress={item.action}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={item.icon as any} size={20} color={item.color || "#374151"} />
                                    <View style={styles.menuItemBody}>
                                        <Text style={[styles.menuItemLabel, item.color && { color: item.color }]}>
                                            {item.label}
                                        </Text>
                                        {item.subtitle && (
                                            <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                                        )}
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                <Text style={styles.versionText}>FairPrice v1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    scrollContent: { paddingBottom: 100 },

    // Guest
    guestContent: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
    guestAvatarWrap: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: "#F3F4F6",
        justifyContent: "center", alignItems: "center", marginBottom: 20,
    },
    guestTitle: { fontSize: 22, fontWeight: "800", color: "#1F2937" },
    guestSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 6, textAlign: "center", lineHeight: 20 },
    signInBtn: {
        backgroundColor: "#059669", paddingHorizontal: 48, paddingVertical: 14,
        borderRadius: 14, marginTop: 28,
    },
    signInBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
    registerLink: { fontSize: 14, color: "#6B7280", marginTop: 16 },
    registerLinkBold: { fontWeight: "700", color: "#059669" },

    // Profile Header
    profileHeader: {
        flexDirection: "row", alignItems: "center", gap: 14,
        paddingHorizontal: 16, paddingVertical: 20, backgroundColor: "#FFF",
        borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
    },
    avatarCircle: {
        width: 52, height: 52, borderRadius: 26, backgroundColor: "#059669",
        justifyContent: "center", alignItems: "center",
    },
    avatarInitial: { fontSize: 22, fontWeight: "800", color: "#FFF" },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: "800", color: "#1F2937" },
    profileEmail: { fontSize: 13, color: "#6B7280", marginTop: 2 },
    editBtn: { padding: 8 },

    // Stats
    statsRow: {
        flexDirection: "row", backgroundColor: "#FFF",
        paddingVertical: 16, marginTop: 8, borderRadius: 14, marginHorizontal: 16,
        ...(Platform.OS === "ios" ? {
            shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 4,
        } : { elevation: 1 }),
    },
    statItem: { flex: 1, alignItems: "center" },
    statValue: { fontSize: 18, fontWeight: "900", color: "#1F2937" },
    statLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600", marginTop: 2 },
    statDivider: { width: 1, backgroundColor: "#F3F4F6" },

    // Menu
    menuSection: { marginTop: 20, paddingHorizontal: 16 },
    menuSectionTitle: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
    menuCard: {
        backgroundColor: "#FFF", borderRadius: 14, overflow: "hidden",
        ...(Platform.OS === "ios" ? {
            shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 4,
        } : { elevation: 1 }),
    },
    menuItem: {
        flexDirection: "row", alignItems: "center", gap: 14,
        paddingHorizontal: 16, paddingVertical: 14,
    },
    menuItemBorder: { borderBottomWidth: 0.5, borderBottomColor: "#F3F4F6" },
    menuItemBody: { flex: 1 },
    menuItemLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
    menuItemSubtitle: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },

    versionText: { textAlign: "center", fontSize: 11, color: "#D1D5DB", paddingVertical: 24 },
});
