import { useState, useEffect, useCallback } from "react";
import {
    View, Text, TextInput, TouchableOpacity, Image,
    FlatList, ActivityIndicator, StyleSheet, Dimensions, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../src/api/client";
import { Product } from "../../src/types";
import { formatPrice, getDiscountPercent } from "../../src/utils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 40) / 2;

export default function SearchScreen() {
    const [query, setQuery] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Load all products once for local filtering (faster UX)
    useEffect(() => {
        (async () => {
            try {
                const data = await api.getProducts();
                setAllProducts(data);
            } catch (err) {
                console.warn("Failed to preload products:", err);
            }
        })();
    }, []);

    const handleSearch = useCallback((text: string) => {
        setQuery(text);
        if (!text.trim()) {
            setProducts([]);
            setSearched(false);
            return;
        }
        setSearched(true);
        const q = text.toLowerCase();
        const results = allProducts.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.description || "").toLowerCase().includes(q) ||
            (p.category || "").toLowerCase().includes(q) ||
            (p.seller_name || "").toLowerCase().includes(q)
        );
        setProducts(results);
    }, [allProducts]);

    const renderProduct = ({ item }: { item: Product }) => {
        const discount = getDiscountPercent(item.original_price || 0, item.price);
        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/product/${item.id}`)}
            >
                <View style={styles.cardImageWrap}>
                    <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
                    {discount > 0 && (
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>-{discount}%</Text>
                        </View>
                    )}
                </View>
                <View style={styles.cardBody}>
                    <Text numberOfLines={2} style={styles.cardName}>{item.name}</Text>
                    <View style={styles.ratingRow}>
                        {[...Array(5)].map((_, i) => (
                            <Ionicons
                                key={i}
                                name={i < Math.round(item.avg_rating) ? "star" : "star-outline"}
                                size={10}
                                color={i < Math.round(item.avg_rating) ? "#1F2937" : "#D1D5DB"}
                            />
                        ))}
                        <Text style={styles.reviewCount}>{item.review_count || Math.floor(item.sold_count / 8)}</Text>
                    </View>
                    <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
                    {item.original_price && item.original_price > item.price && (
                        <Text style={styles.cardOrigPrice}>{formatPrice(item.original_price)}</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Search Header */}
            <View style={styles.searchHeader}>
                <View style={styles.searchInputWrap}>
                    <Ionicons name="search" size={18} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search products, brands, categories..."
                        placeholderTextColor="#9CA3AF"
                        value={query}
                        onChangeText={handleSearch}
                        autoFocus
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch("")}>
                            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Results */}
            {!searched ? (
                <View style={styles.initialState}>
                    <Ionicons name="search" size={48} color="#E5E7EB" />
                    <Text style={styles.initialTitle}>Search FairPrice</Text>
                    <Text style={styles.initialSubtitle}>Find products, brands, and deals</Text>
                </View>
            ) : products.length === 0 ? (
                <View style={styles.initialState}>
                    <Ionicons name="bag-outline" size={48} color="#E5E7EB" />
                    <Text style={styles.initialTitle}>No results found</Text>
                    <Text style={styles.initialSubtitle}>Try different keywords</Text>
                </View>
            ) : (
                <FlatList
                    data={products}
                    numColumns={2}
                    keyExtractor={(item) => item.id}
                    renderItem={renderProduct}
                    columnWrapperStyle={styles.gridRow}
                    contentContainerStyle={styles.gridContent}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <Text style={styles.resultsCount}>{products.length} result{products.length !== 1 ? "s" : ""}</Text>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    searchHeader: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    searchInputWrap: {
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: "#F3F4F6", paddingHorizontal: 14, paddingVertical: 11,
        borderRadius: 12, borderWidth: 1.5, borderColor: "#059669",
    },
    searchInput: { flex: 1, fontSize: 14, color: "#1F2937", fontWeight: "500" },
    resultsCount: { fontSize: 13, fontWeight: "600", color: "#6B7280", paddingHorizontal: 16, paddingVertical: 12 },
    gridRow: { paddingHorizontal: 12, gap: 8 },
    gridContent: { paddingBottom: 100 },
    card: {
        width: CARD_WIDTH, backgroundColor: "#FFF", borderRadius: 12, overflow: "hidden",
        marginBottom: 8,
        ...(Platform.OS === "ios" ? {
            shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06, shadowRadius: 6,
        } : { elevation: 2 }),
    },
    cardImageWrap: { position: "relative" },
    cardImage: { width: "100%", height: CARD_WIDTH, backgroundColor: "#F9FAFB" },
    discountBadge: {
        position: "absolute", top: 8, left: 8,
        backgroundColor: "#DC2626", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    },
    discountText: { fontSize: 10, fontWeight: "800", color: "#FFF" },
    cardBody: { padding: 10 },
    cardName: { fontSize: 12, fontWeight: "600", color: "#1F2937", lineHeight: 16, marginBottom: 4 },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 4 },
    reviewCount: { fontSize: 10, color: "#6B7280", marginLeft: 2 },
    cardPrice: { fontSize: 15, fontWeight: "900", color: "#1F2937" },
    cardOrigPrice: { fontSize: 11, color: "#9CA3AF", textDecorationLine: "line-through", marginTop: 1 },
    initialState: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, gap: 8 },
    initialTitle: { fontSize: 18, fontWeight: "700", color: "#374151" },
    initialSubtitle: { fontSize: 13, color: "#9CA3AF" },
});
