import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  FlatList, ActivityIndicator, StyleSheet, Dimensions,
  RefreshControl, Animated, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../src/api/client";
import { Product } from "../../src/types";
import { formatPrice, getDiscountPercent } from "../../src/utils";
import { useCartStore } from "../../src/stores/cartStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const SCROLL_CARD_WIDTH = 150;

// ─── Category Definitions ─────────────────────────────────
const CATEGORIES = [
  { key: "all", label: "All", icon: "flame" as const },
  { key: "phones", label: "Phones", icon: "phone-portrait" as const },
  { key: "computers", label: "Laptops", icon: "laptop" as const },
  { key: "fashion", label: "Fashion", icon: "shirt" as const },
  { key: "electronics", label: "Electronics", icon: "headset" as const },
  { key: "beauty", label: "Beauty", icon: "flower" as const },
  { key: "home", label: "Home", icon: "home" as const },
  { key: "gaming", label: "Gaming", icon: "game-controller" as const },
  { key: "fitness", label: "Fitness", icon: "barbell" as const },
  { key: "grocery", label: "Grocery", icon: "fast-food" as const },
  { key: "cars", label: "Automotive", icon: "car" as const },
];

// ─── Auto-scrolling horizontal product row ────────────────
function AutoScrollRow({ title, products, icon }: { title: string; products: Product[]; icon: string }) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (products.length === 0) return;
    intervalRef.current = setInterval(() => {
      scrollX.current += 1;
      const maxScroll = products.length * 3 * (SCROLL_CARD_WIDTH + 12);
      if (scrollX.current > maxScroll / 3) scrollX.current = 0;
      scrollRef.current?.scrollTo({ x: scrollX.current, animated: false });
    }, 30);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [products]);

  if (products.length === 0) return null;
  const tripled = [...products, ...products, ...products];

  return (
    <View style={styles.scrollSection}>
      <View style={styles.scrollSectionHeader}>
        <View style={styles.scrollSectionTitleRow}>
          <Ionicons name={icon as any} size={18} color="#059669" />
          <Text style={styles.scrollSectionTitle}>{title}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/search" as any)}>
          <Text style={styles.seeAllLink}>See all ›</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onTouchStart={() => { if (intervalRef.current) clearInterval(intervalRef.current); }}
        onTouchEnd={() => {
          if (products.length === 0) return;
          intervalRef.current = setInterval(() => {
            scrollX.current += 1;
            const maxScroll = products.length * 3 * (SCROLL_CARD_WIDTH + 12);
            if (scrollX.current > maxScroll / 3) scrollX.current = 0;
            scrollRef.current?.scrollTo({ x: scrollX.current, animated: false });
          }, 30);
        }}
        onScroll={(e) => { scrollX.current = e.nativeEvent.contentOffset.x; }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {tripled.map((product, idx) => (
          <TouchableOpacity
            key={`${product.id}-${idx}`}
            style={styles.scrollCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/product/${product.id}`)}
          >
            <Image source={{ uri: product.image_url }} style={styles.scrollCardImage} resizeMode="cover" />
            {product.is_sponsored && (
              <View style={styles.sponsoredTag}>
                <Text style={styles.sponsoredTagText}>AD</Text>
              </View>
            )}
            <View style={styles.scrollCardBody}>
              <Text numberOfLines={2} style={styles.scrollCardName}>{product.name}</Text>
              <Text style={styles.scrollCardPrice}>{formatPrice(product.price)}</Text>
              {product.original_price && product.original_price > product.price && (
                <View style={styles.scrollCardDiscountRow}>
                  <Text style={styles.scrollCardOrigPrice}>{formatPrice(product.original_price)}</Text>
                  <Text style={styles.scrollCardDiscount}>-{getDiscountPercent(product.original_price, product.price)}%</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Individual Product Card ──────────────────────────────
function ProductGridCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const discount = getDiscountPercent(product.original_price || 0, product.price);

  return (
    <TouchableOpacity
      style={styles.gridCard}
      activeOpacity={0.85}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      <View style={styles.gridCardImageWrap}>
        <Image source={{ uri: product.image_url }} style={styles.gridCardImage} resizeMode="cover" />
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>-{discount}%</Text>
          </View>
        )}
        {product.is_sponsored && (
          <View style={styles.sponsoredBadge}>
            <Text style={styles.sponsoredBadgeText}>Sponsored</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.addToCartBtn}
          onPress={(e) => { e.stopPropagation?.(); addItem(product); }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.gridCardBody}>
        <Text numberOfLines={2} style={styles.gridCardName}>{product.name}</Text>
        <View style={styles.ratingRow}>
          {[...Array(5)].map((_, i) => (
            <Ionicons
              key={i}
              name={i < Math.round(product.avg_rating) ? "star" : "star-outline"}
              size={10}
              color={i < Math.round(product.avg_rating) ? "#1F2937" : "#D1D5DB"}
            />
          ))}
          <Text style={styles.reviewCount}>{product.review_count > 0 ? product.review_count : Math.floor(product.sold_count / 8)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.gridCardPrice}>{formatPrice(product.price)}</Text>
          <Text style={styles.soldCount}>{product.sold_count > 1000 ? `${Math.floor(product.sold_count / 1000)}K+` : product.sold_count} sold</Text>
        </View>
        {product.original_price && product.original_price > product.price && (
          <Text style={styles.originalPrice}>{formatPrice(product.original_price)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Home Screen ─────────────────────────────────────
export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

  const fetchProducts = useCallback(async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.warn("Failed to load products:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  // ─── Filter & categorize ──────────────────────────────
  const filteredProducts = activeCategory === "all"
    ? products
    : products.filter(p => p.category?.toLowerCase().includes(activeCategory));

  const trendingProducts = [...products]
    .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
    .slice(0, 15);

  const sponsoredProducts = products.filter(p => p.is_sponsored);

  const dealProducts = products
    .filter(p => p.original_price && p.original_price > p.price)
    .sort((a, b) => {
      const aDisc = ((a.original_price || 0) - a.price) / (a.original_price || 1);
      const bDisc = ((b.original_price || 0) - b.price) / (b.original_price || 1);
      return bDisc - aDisc;
    })
    .slice(0, 15);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading FairPrice...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
        stickyHeaderIndices={[1]}
      >
        {/* ═══ Header ═══ */}
        <SafeAreaView edges={["top"]} style={styles.headerSafe}>
          <View style={styles.header}>
            <View>
              <Text style={styles.logoText}>FairPrice</Text>
              <Text style={styles.tagline}>Shop Smart, Save More</Text>
            </View>
            <TouchableOpacity style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={22} color="#374151" />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* ═══ Search Bar (sticky) ═══ */}
        <View style={styles.searchBarWrap}>
          <TouchableOpacity
            style={styles.searchBar}
            activeOpacity={0.8}
            onPress={() => router.push("/search" as any)}
          >
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <Text style={styles.searchPlaceholder}>Search products, brands...</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ Guarantees Banner ═══ */}
        <View style={styles.guaranteesBanner}>
          <View style={styles.guaranteeItem}>
            <Ionicons name="checkmark-circle" size={14} color="#059669" />
            <Text style={styles.guaranteeText}>Free shipping</Text>
          </View>
          <View style={styles.guaranteeDivider} />
          <View style={styles.guaranteeItem}>
            <Ionicons name="shield-checkmark" size={14} color="#059669" />
            <Text style={styles.guaranteeText}>Verified prices</Text>
          </View>
          <View style={styles.guaranteeDivider} />
          <View style={styles.guaranteeItem}>
            <Ionicons name="cash" size={14} color="#059669" />
            <Text style={styles.guaranteeText}>Pay on delivery</Text>
          </View>
        </View>

        {/* ═══ Category Pills ═══ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = cat.key === activeCategory;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => setActiveCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={isActive ? "#FFF" : "#6B7280"}
                />
                <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ═══ Trending (Auto-Scroll) ═══ */}
        <AutoScrollRow title="Trending in Nigeria" products={trendingProducts} icon="trending-up" />

        {/* ═══ Sponsored (Auto-Scroll) ═══ */}
        {sponsoredProducts.length > 0 && (
          <AutoScrollRow title="Sponsored Collections" products={sponsoredProducts} icon="sparkles" />
        )}

        {/* ═══ Today's Deals (Auto-Scroll) ═══ */}
        {dealProducts.length > 0 && (
          <AutoScrollRow title="Today's Hottest Deals" products={dealProducts} icon="flame" />
        )}

        {/* ═══ Product Grid ═══ */}
        <View style={styles.gridSection}>
          <Text style={styles.gridSectionTitle}>
            {activeCategory === "all" ? "Explore All Products" : CATEGORIES.find(c => c.key === activeCategory)?.label || "Products"}
          </Text>
          <Text style={styles.gridSectionSubtitle}>{filteredProducts.length} products found</Text>
        </View>

        <View style={styles.productGrid}>
          {filteredProducts.map((product) => (
            <ProductGridCard key={product.id} product={product} />
          ))}
        </View>

        {filteredProducts.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bag-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No products found</Text>
            <Text style={styles.emptyStateSubtitle}>Try a different category</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF" },
  loadingText: { fontSize: 14, color: "#6B7280", marginTop: 12, fontWeight: "600" },

  // Header
  headerSafe: { backgroundColor: "#FFF" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  logoText: { fontSize: 26, fontWeight: "900", color: "#059669", letterSpacing: -0.5 },
  tagline: { fontSize: 11, color: "#6B7280", fontWeight: "600", marginTop: 1 },
  notifBtn: { position: "relative", padding: 8 },
  notifDot: {
    position: "absolute", top: 6, right: 6, width: 8, height: 8,
    backgroundColor: "#EF4444", borderRadius: 4, borderWidth: 1.5, borderColor: "#FFF",
  },

  // Search
  searchBarWrap: {
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F3F4F6", paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1.5, borderColor: "#E5E7EB",
  },
  searchPlaceholder: { fontSize: 14, color: "#9CA3AF", fontWeight: "500" },

  // Guarantees
  guaranteesBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: "#ECFDF5", gap: 6,
  },
  guaranteeItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  guaranteeText: { fontSize: 10, fontWeight: "700", color: "#065F46" },
  guaranteeDivider: { width: 1, height: 12, backgroundColor: "#A7F3D0" },

  // Categories
  categoryScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  categoryPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: "#FFF",
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  categoryPillActive: { backgroundColor: "#059669", borderColor: "#059669" },
  categoryPillText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  categoryPillTextActive: { color: "#FFF" },

  // Auto-scroll sections
  scrollSection: { marginTop: 8, marginBottom: 8, paddingVertical: 12, backgroundColor: "#FFF" },
  scrollSectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 12,
  },
  scrollSectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  scrollSectionTitle: { fontSize: 16, fontWeight: "800", color: "#1F2937" },
  seeAllLink: { fontSize: 13, fontWeight: "700", color: "#2563EB" },

  scrollCard: {
    width: SCROLL_CARD_WIDTH, backgroundColor: "#FFF",
    borderRadius: 12, overflow: "hidden",
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  scrollCardImage: { width: SCROLL_CARD_WIDTH, height: SCROLL_CARD_WIDTH, backgroundColor: "#F9FAFB" },
  scrollCardBody: { padding: 8 },
  scrollCardName: { fontSize: 11, fontWeight: "600", color: "#374151", lineHeight: 14, marginBottom: 4 },
  scrollCardPrice: { fontSize: 14, fontWeight: "900", color: "#1F2937" },
  scrollCardDiscountRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  scrollCardOrigPrice: { fontSize: 10, color: "#9CA3AF", textDecorationLine: "line-through" },
  scrollCardDiscount: { fontSize: 9, fontWeight: "800", color: "#DC2626" },

  sponsoredTag: {
    position: "absolute", top: 6, left: 6,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  sponsoredTagText: { fontSize: 8, fontWeight: "800", color: "#FFF", letterSpacing: 0.5 },

  // Product Grid
  gridSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  gridSectionTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937" },
  gridSectionSubtitle: { fontSize: 12, color: "#9CA3AF", fontWeight: "500", marginTop: 2 },

  productGrid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 12, gap: 8,
  },

  gridCard: {
    width: PRODUCT_CARD_WIDTH, backgroundColor: "#FFF",
    borderRadius: 12, overflow: "hidden",
    marginBottom: 4,
    ...(Platform.OS === "ios" ? {
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06, shadowRadius: 6,
    } : { elevation: 2 }),
  },
  gridCardImageWrap: { position: "relative" },
  gridCardImage: {
    width: "100%", height: PRODUCT_CARD_WIDTH * 1.1, backgroundColor: "#F9FAFB",
  },
  discountBadge: {
    position: "absolute", top: 8, left: 8,
    backgroundColor: "#DC2626", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  discountBadgeText: { fontSize: 10, fontWeight: "800", color: "#FFF" },
  sponsoredBadge: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  sponsoredBadgeText: { fontSize: 8, fontWeight: "800", color: "#FFF", letterSpacing: 0.5 },
  addToCartBtn: {
    position: "absolute", bottom: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(5,150,105,0.85)", justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.9)",
  },

  gridCardBody: { padding: 10 },
  gridCardName: { fontSize: 12, fontWeight: "600", color: "#1F2937", lineHeight: 16, marginBottom: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 4 },
  reviewCount: { fontSize: 10, color: "#6B7280", marginLeft: 2 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  gridCardPrice: { fontSize: 15, fontWeight: "900", color: "#1F2937", letterSpacing: -0.3 },
  soldCount: { fontSize: 9, color: "#9CA3AF", fontWeight: "500" },
  originalPrice: { fontSize: 11, color: "#9CA3AF", textDecorationLine: "line-through", marginTop: 1 },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyStateTitle: { fontSize: 16, fontWeight: "700", color: "#6B7280" },
  emptyStateSubtitle: { fontSize: 13, color: "#9CA3AF" },
});
