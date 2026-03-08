import { useState, useEffect } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    ActivityIndicator, StyleSheet, Dimensions, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../src/api/client";
import { Product } from "../../src/types";
import { formatPrice, getDiscountPercent } from "../../src/utils";
import { useCartStore } from "../../src/stores/cartStore";

const { width } = Dimensions.get("window");

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState(0);
    const addItem = useCartStore((s) => s.addItem);

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const p = await api.getProduct(id);
                setProduct(p);
            } catch (err) {
                console.warn("Failed to load product:", err);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    if (loading) {
        return (
            <SafeAreaView style={styles.loadWrap}>
                <ActivityIndicator size="large" color="#059669" />
            </SafeAreaView>
        );
    }

    if (!product) {
        return (
            <SafeAreaView style={styles.loadWrap}>
                <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
                <Text style={styles.errorText}>Product not found</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backLink}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const discount = getDiscountPercent(product.original_price || 0, product.price);
    const allImages = [product.image_url, ...(product.images || [])].filter(Boolean);

    const handleAddToCart = () => {
        addItem(product, quantity);
        Alert.alert("Added to Cart", `${product.name} (x${quantity}) added!`, [
            { text: "Continue Shopping", style: "cancel" },
            { text: "View Cart", onPress: () => router.push("/cart" as any) },
        ]);
    };

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Back Button */}
                <SafeAreaView edges={["top"]} style={styles.navOverlay}>
                    <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={22} color="#1F2937" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navBtn} onPress={() => router.push("/cart" as any)}>
                        <Ionicons name="bag-handle-outline" size={22} color="#1F2937" />
                    </TouchableOpacity>
                </SafeAreaView>

                {/* Image Carousel */}
                <ScrollView
                    horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                    style={styles.imageCarousel}
                    onMomentumScrollEnd={(e) => {
                        const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                        setSelectedImage(idx);
                    }}
                >
                    {allImages.map((img, idx) => (
                        <Image
                            key={idx}
                            source={{ uri: img }}
                            style={styles.mainImage}
                            resizeMode="cover"
                        />
                    ))}
                </ScrollView>

                {/* Image Dots */}
                {allImages.length > 1 && (
                    <View style={styles.dotsRow}>
                        {allImages.map((_, idx) => (
                            <View
                                key={idx}
                                style={[styles.dot, selectedImage === idx && styles.dotActive]}
                            />
                        ))}
                    </View>
                )}

                {/* Product Info */}
                <View style={styles.infoSection}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.sellerName}>by {product.seller_name}</Text>

                    {/* Rating */}
                    <View style={styles.ratingRow}>
                        {[...Array(5)].map((_, i) => (
                            <Ionicons
                                key={i}
                                name={i < Math.round(product.avg_rating) ? "star" : "star-outline"}
                                size={16}
                                color="#FBBF24"
                            />
                        ))}
                        <Text style={styles.ratingText}>
                            {product.avg_rating.toFixed(1)} ({product.review_count} reviews)
                        </Text>
                    </View>

                    {/* Price */}
                    <View style={styles.priceSection}>
                        <Text style={styles.price}>{formatPrice(product.price * quantity)}</Text>
                        {discount > 0 && (
                            <View style={styles.discountRow}>
                                <Text style={styles.origPrice}>
                                    {formatPrice((product.original_price || 0) * quantity)}
                                </Text>
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>-{discount}% OFF</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Quantity */}
                    <View style={styles.qtySection}>
                        <Text style={styles.qtyLabel}>Quantity</Text>
                        <View style={styles.qtyControls}>
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                            >
                                <Ionicons name="remove" size={18} color="#374151" />
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{quantity}</Text>
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
                            >
                                <Ionicons name="add" size={18} color="#374151" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Stock Status */}
                    <View style={styles.stockRow}>
                        <Ionicons
                            name={product.stock > 0 ? "checkmark-circle" : "close-circle"}
                            size={16}
                            color={product.stock > 0 ? "#10B981" : "#EF4444"}
                        />
                        <Text style={[styles.stockText, { color: product.stock > 0 ? "#10B981" : "#EF4444" }]}>
                            {product.stock > 0 ? `In Stock (${product.stock} left)` : "Out of Stock"}
                        </Text>
                    </View>

                    {/* Free Shipping */}
                    <View style={styles.shippingRow}>
                        <Ionicons name="car-outline" size={16} color="#059669" />
                        <Text style={styles.shippingText}>Free shipping with online payment</Text>
                    </View>

                    {/* Description */}
                    <View style={styles.descSection}>
                        <Text style={styles.descTitle}>Description</Text>
                        <Text style={styles.descBody}>{product.description}</Text>
                    </View>

                    {/* Highlights */}
                    {product.highlights && product.highlights.length > 0 && (
                        <View style={styles.descSection}>
                            <Text style={styles.descTitle}>Highlights</Text>
                            {product.highlights.map((h, i) => (
                                <View key={i} style={styles.highlightRow}>
                                    <Ionicons name="checkmark" size={14} color="#059669" />
                                    <Text style={styles.highlightText}>{h}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Specs */}
                    {product.specs && Object.keys(product.specs).length > 0 && (
                        <View style={styles.descSection}>
                            <Text style={styles.descTitle}>Specifications</Text>
                            {Object.entries(product.specs).map(([key, val]) => (
                                <View key={key} style={styles.specRow}>
                                    <Text style={styles.specKey}>{key}</Text>
                                    <Text style={styles.specVal}>{val}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Bottom CTA */}
            <SafeAreaView edges={["bottom"]} style={styles.bottomBar}>
                <View style={styles.bottomPrice}>
                    <Text style={styles.bottomPriceLabel}>Total</Text>
                    <Text style={styles.bottomPriceValue}>{formatPrice(product.price * quantity)}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.addToCartBtn, product.stock <= 0 && { opacity: 0.5 }]}
                    onPress={handleAddToCart}
                    disabled={product.stock <= 0}
                >
                    <Ionicons name="bag-add" size={20} color="#FFF" />
                    <Text style={styles.addToCartText}>Add to Cart</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFF" },
    scrollContent: { paddingBottom: 100 },
    loadWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
    errorText: { fontSize: 16, color: "#6B7280" },
    backLink: { fontSize: 14, fontWeight: "700", color: "#059669", marginTop: 8 },
    navOverlay: {
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        flexDirection: "row", justifyContent: "space-between",
        paddingHorizontal: 16, paddingTop: 8,
    },
    navBtn: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)",
        justifyContent: "center", alignItems: "center",
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    },
    imageCarousel: { width, height: width, backgroundColor: "#F9FAFB" },
    mainImage: { width, height: width },
    dotsRow: {
        flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: 12,
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D1D5DB" },
    dotActive: { backgroundColor: "#059669", width: 18 },
    infoSection: { paddingHorizontal: 16, paddingTop: 8 },
    productName: { fontSize: 20, fontWeight: "800", color: "#1F2937", lineHeight: 26 },
    sellerName: { fontSize: 13, color: "#6B7280", marginTop: 4 },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
    ratingText: { fontSize: 12, color: "#6B7280", marginLeft: 4 },
    priceSection: { marginTop: 16 },
    price: { fontSize: 28, fontWeight: "900", color: "#059669" },
    discountRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
    origPrice: { fontSize: 15, color: "#9CA3AF", textDecorationLine: "line-through" },
    discountBadge: { backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    discountText: { fontSize: 12, fontWeight: "800", color: "#DC2626" },
    qtySection: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F3F4F6",
    },
    qtyLabel: { fontSize: 15, fontWeight: "600", color: "#374151" },
    qtyControls: { flexDirection: "row", alignItems: "center", gap: 12 },
    qtyBtn: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: "#F3F4F6",
        justifyContent: "center", alignItems: "center",
    },
    qtyText: { fontSize: 16, fontWeight: "700", color: "#1F2937", minWidth: 24, textAlign: "center" },
    stockRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
    stockText: { fontSize: 13, fontWeight: "600" },
    shippingRow: {
        flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12,
        backgroundColor: "#ECFDF5", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    },
    shippingText: { fontSize: 13, fontWeight: "600", color: "#047857" },
    descSection: { marginTop: 24 },
    descTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 8 },
    descBody: { fontSize: 14, color: "#4B5563", lineHeight: 22 },
    highlightRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    highlightText: { fontSize: 14, color: "#4B5563" },
    specRow: {
        flexDirection: "row", justifyContent: "space-between", paddingVertical: 8,
        borderBottomWidth: 0.5, borderBottomColor: "#F3F4F6",
    },
    specKey: { fontSize: 13, color: "#6B7280", flex: 1 },
    specVal: { fontSize: 13, fontWeight: "600", color: "#1F2937", flex: 1, textAlign: "right" },
    bottomBar: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
        backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#F3F4F6",
        shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12,
    },
    bottomPrice: {},
    bottomPriceLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
    bottomPriceValue: { fontSize: 20, fontWeight: "900", color: "#1F2937" },
    addToCartBtn: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "#059669", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
    },
    addToCartText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});
