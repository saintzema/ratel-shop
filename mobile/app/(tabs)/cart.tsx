import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "../../src/stores/cartStore";
import { useAuthStore } from "../../src/stores/authStore";
import { formatPrice, getDiscountPercent } from "../../src/utils";

export default function CartScreen() {
    const items = useCartStore((s) => s.items);
    const updateQuantity = useCartStore((s) => s.updateQuantity);
    const removeItem = useCartStore((s) => s.removeItem);
    const getTotal = useCartStore((s) => s.getTotal);
    const getItemCount = useCartStore((s) => s.getItemCount);
    const user = useAuthStore((s) => s.user);

    const total = getTotal();
    const count = getItemCount();

    // Calculate savings
    const savings = items.reduce((sum, item) => {
        const orig = item.product.original_price;
        if (orig && orig > item.product.price) {
            return sum + (orig - item.product.price) * item.quantity;
        }
        return sum;
    }, 0);

    // Free delivery threshold
    const FREE_DELIVERY_THRESHOLD = 20000;
    const deliveryCost = total >= FREE_DELIVERY_THRESHOLD ? 0 : 2500;
    const totalSavings = savings + (deliveryCost === 0 ? 2500 : 0);

    if (items.length === 0) {
        return (
            <SafeAreaView style={styles.emptyContainer}>
                <View style={styles.emptyContent}>
                    <View style={styles.emptyIconWrap}>
                        <Ionicons name="bag-outline" size={56} color="#D1D5DB" />
                    </View>
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptySubtitle}>Browse our catalog and find amazing deals</Text>
                    <TouchableOpacity
                        style={styles.shopNowBtn}
                        onPress={() => router.push("/(tabs)" as any)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="bag-handle" size={18} color="#FFF" />
                        <Text style={styles.shopNowBtnText}>Start Shopping</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Shopping Cart</Text>
                <Text style={styles.headerCount}>{count} item{count !== 1 ? "s" : ""}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Savings Banner */}
                {totalSavings > 0 && (
                    <View style={styles.savingsBanner}>
                        <Ionicons name="pricetag" size={16} color="#059669" />
                        <Text style={styles.savingsText}>You save: <Text style={styles.savingsAmount}>{formatPrice(totalSavings)}</Text></Text>
                    </View>
                )}

                {/* Cart Items */}
                {items.map((item) => {
                    const p = item.product;
                    const discount = getDiscountPercent(p.original_price || 0, p.price);
                    return (
                        <View key={p.id} style={styles.cartItem}>
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => router.push(`/product/${p.id}`)}
                            >
                                <Image source={{ uri: p.image_url }} style={styles.cartItemImage} resizeMode="cover" />
                            </TouchableOpacity>
                            <View style={styles.cartItemBody}>
                                <Text numberOfLines={2} style={styles.cartItemName}>{p.name}</Text>
                                <View style={styles.cartItemPriceRow}>
                                    <Text style={styles.cartItemPrice}>{formatPrice(p.price)}</Text>
                                    {discount > 0 && (
                                        <View style={styles.cartDiscountBadge}>
                                            <Text style={styles.cartDiscountText}>-{discount}%</Text>
                                        </View>
                                    )}
                                </View>
                                {p.original_price && p.original_price > p.price && (
                                    <Text style={styles.cartOrigPrice}>{formatPrice(p.original_price)}</Text>
                                )}
                                <View style={styles.cartItemActions}>
                                    <View style={styles.qtyControls}>
                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() => updateQuantity(p.id, item.quantity - 1)}
                                        >
                                            <Ionicons name="remove" size={14} color="#374151" />
                                        </TouchableOpacity>
                                        <Text style={styles.qtyText}>{item.quantity}</Text>
                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() => updateQuantity(p.id, item.quantity + 1)}
                                        >
                                            <Ionicons name="add" size={14} color="#374151" />
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity onPress={() => removeItem(p.id)} style={styles.removeBtn}>
                                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    );
                })}

                {/* Order Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Order Summary</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal ({count} items)</Text>
                        <Text style={styles.summaryValue}>{formatPrice(total)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Delivery</Text>
                        <Text style={[styles.summaryValue, deliveryCost === 0 && { color: "#059669" }]}>
                            {deliveryCost === 0 ? "FREE" : formatPrice(deliveryCost)}
                        </Text>
                    </View>
                    {savings > 0 && (
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Product Savings</Text>
                            <Text style={[styles.summaryValue, { color: "#059669" }]}>-{formatPrice(savings)}</Text>
                        </View>
                    )}
                    {deliveryCost === 0 && (
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Delivery Savings</Text>
                            <Text style={[styles.summaryValue, { color: "#059669" }]}>-{formatPrice(2500)}</Text>
                        </View>
                    )}
                    <View style={[styles.summaryRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>{formatPrice(total + deliveryCost)}</Text>
                    </View>
                    {totalSavings > 0 && (
                        <View style={styles.totalSavingsRow}>
                            <Ionicons name="checkmark-circle" size={14} color="#059669" />
                            <Text style={styles.totalSavingsText}>You save {formatPrice(totalSavings)} on this order!</Text>
                        </View>
                    )}
                </View>

                {/* Free delivery nudge */}
                {deliveryCost > 0 && (
                    <View style={styles.freeDeliveryNudge}>
                        <Ionicons name="car-outline" size={16} color="#059669" />
                        <Text style={styles.nudgeText}>
                            Add {formatPrice(FREE_DELIVERY_THRESHOLD - total)} more for <Text style={{ fontWeight: "800" }}>FREE delivery</Text>
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Bottom Checkout Bar */}
            <View style={styles.bottomBar}>
                <View>
                    <Text style={styles.bottomTotalLabel}>Total</Text>
                    <Text style={styles.bottomTotalValue}>{formatPrice(total + deliveryCost)}</Text>
                </View>
                <TouchableOpacity
                    style={styles.checkoutBtn}
                    onPress={() => {
                        if (!user) {
                            router.push("/auth/login");
                        } else {
                            router.push("/(tabs)" as any);
                        }
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="lock-closed" size={16} color="#FFF" />
                    <Text style={styles.checkoutBtnText}>
                        {user ? "Proceed to Checkout" : "Sign In to Checkout"}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    emptyContainer: { flex: 1, backgroundColor: "#FFF" },
    emptyContent: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
    emptyIconWrap: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: "#F9FAFB",
        justifyContent: "center", alignItems: "center", marginBottom: 16,
    },
    emptyTitle: { fontSize: 20, fontWeight: "800", color: "#1F2937" },
    emptySubtitle: { fontSize: 14, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
    shopNowBtn: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "#059669", paddingHorizontal: 28, paddingVertical: 14,
        borderRadius: 14, marginTop: 24,
    },
    shopNowBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },

    header: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "baseline",
        paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#FFF",
        borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
    },
    headerTitle: { fontSize: 20, fontWeight: "800", color: "#1F2937" },
    headerCount: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
    scrollContent: { padding: 16, paddingBottom: 120 },

    savingsBanner: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "#ECFDF5", paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 12, marginBottom: 12,
    },
    savingsText: { fontSize: 13, color: "#065F46", fontWeight: "600" },
    savingsAmount: { fontWeight: "900", color: "#059669" },

    cartItem: {
        flexDirection: "row", gap: 12,
        backgroundColor: "#FFF", padding: 12, borderRadius: 14, marginBottom: 8,
        ...(Platform.OS === "ios" ? {
            shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 4,
        } : { elevation: 1 }),
    },
    cartItemImage: { width: 90, height: 90, borderRadius: 10, backgroundColor: "#F9FAFB" },
    cartItemBody: { flex: 1 },
    cartItemName: { fontSize: 13, fontWeight: "600", color: "#1F2937", lineHeight: 17 },
    cartItemPriceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    cartItemPrice: { fontSize: 16, fontWeight: "900", color: "#1F2937" },
    cartDiscountBadge: { backgroundColor: "#FEE2E2", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
    cartDiscountText: { fontSize: 10, fontWeight: "800", color: "#DC2626" },
    cartOrigPrice: { fontSize: 11, color: "#9CA3AF", textDecorationLine: "line-through" },
    cartItemActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
    qtyControls: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F3F4F6", borderRadius: 10, padding: 2 },
    qtyBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center" },
    qtyText: { fontSize: 14, fontWeight: "700", color: "#1F2937", minWidth: 20, textAlign: "center" },
    removeBtn: { padding: 6 },

    summaryCard: {
        backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginTop: 8,
        ...(Platform.OS === "ios" ? {
            shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 4,
        } : { elevation: 1 }),
    },
    summaryTitle: { fontSize: 16, fontWeight: "800", color: "#1F2937", marginBottom: 12 },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
    summaryLabel: { fontSize: 13, color: "#6B7280" },
    summaryValue: { fontSize: 13, fontWeight: "700", color: "#1F2937" },
    totalRow: { borderTopWidth: 1, borderTopColor: "#F3F4F6", marginTop: 8, paddingTop: 12 },
    totalLabel: { fontSize: 15, fontWeight: "800", color: "#1F2937" },
    totalValue: { fontSize: 18, fontWeight: "900", color: "#1F2937" },
    totalSavingsRow: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "#ECFDF5", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12,
    },
    totalSavingsText: { fontSize: 12, fontWeight: "600", color: "#065F46" },

    freeDeliveryNudge: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "#FFF7ED", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 8,
    },
    nudgeText: { fontSize: 12, color: "#92400E", fontWeight: "500", flex: 1 },

    bottomBar: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#F3F4F6",
        ...(Platform.OS === "ios" ? {
            shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08, shadowRadius: 12,
        } : { elevation: 8 }),
    },
    bottomTotalLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
    bottomTotalValue: { fontSize: 20, fontWeight: "900", color: "#1F2937" },
    checkoutBtn: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "#059669", paddingHorizontal: 22, paddingVertical: 14, borderRadius: 14,
    },
    checkoutBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});
