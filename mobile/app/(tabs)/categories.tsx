import { useState, useEffect, useRef, useCallback } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    FlatList, ActivityIndicator, StyleSheet, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../src/api/client";
import { Product } from "../../src/types";
import { formatPrice } from "../../src/utils";

const { width } = Dimensions.get("window");

// ─── Sidebar Categories (matching web app's categories page) ──────
const SIDEBAR_CATEGORIES = [
    { key: "featured", label: "Featured", icon: "sparkles" as const },
    { key: "phones", label: "Phones & Accessories", icon: "phone-portrait" as const },
    { key: "computers", label: "Computers & Tablets", icon: "laptop" as const },
    { key: "electronics", label: "Electronics", icon: "headset" as const },
    { key: "fashion_women", label: "Women's Fashion", icon: "shirt" as const },
    { key: "fashion_men", label: "Men's Fashion", icon: "man" as const },
    { key: "beauty", label: "Beauty & Health", icon: "flower" as const },
    { key: "home", label: "Home & Kitchen", icon: "home" as const },
    { key: "gaming", label: "Gaming", icon: "game-controller" as const },
    { key: "fitness", label: "Sports & Fitness", icon: "barbell" as const },
    { key: "grocery", label: "Food & Grocery", icon: "fast-food" as const },
    { key: "baby", label: "Baby & Kids", icon: "happy" as const },
    { key: "cars", label: "Automotive", icon: "car" as const },
    { key: "jewelry", label: "Jewelry", icon: "diamond" as const },
    { key: "furniture", label: "Furniture", icon: "bed" as const },
    { key: "books", label: "Books & Media", icon: "book" as const },
];

// ─── Subcategory Circles (condensed for mobile) ──────
const SUBCATEGORIES: Record<string, { name: string; image: string; filterKey?: string; hot?: boolean }[]> = {
    featured: [
        { name: "Smart Devices", image: "https://images.unsplash.com/photo-1558089687-f282ffcbc126?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
        { name: "Headphones", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "electronics" },
        { name: "Women's Jewelry", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Home Decor", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Women's Dresses", image: "https://images.unsplash.com/photo-1515347619362-71c1813f4124?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
        { name: "Phone Cases", image: "https://images.unsplash.com/photo-1601593346740-925612772716?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "phones" },
        { name: "Kitchen", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Laptops", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=200&auto=format&fit=crop", filterKey: "computers" },
        { name: "Skincare", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=200&auto=format&fit=crop", filterKey: "beauty" },
    ],
    phones: [
        { name: "Smartphones", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=200&auto=format&fit=crop", filterKey: "phones" },
        { name: "Phone Cases", image: "https://images.unsplash.com/photo-1601593346740-925612772716?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "phones" },
        { name: "Chargers", image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=200&auto=format&fit=crop", filterKey: "phones" },
        { name: "Power Banks", image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?q=80&w=200&auto=format&fit=crop", filterKey: "phones" },
        { name: "Screen Protectors", image: "https://images.unsplash.com/photo-1585060544812-6b45742d762f?q=80&w=200&auto=format&fit=crop", filterKey: "phones" },
        { name: "Phone Holders", image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?q=80&w=200&auto=format&fit=crop", filterKey: "phones" },
    ],
    computers: [
        { name: "Laptops", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=200&auto=format&fit=crop", filterKey: "computers" },
        { name: "Tablets", image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=200&auto=format&fit=crop", filterKey: "computers" },
        { name: "Keyboards", image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "computers" },
        { name: "Mice", image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=200&auto=format&fit=crop", filterKey: "computers" },
        { name: "Monitors", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=200&auto=format&fit=crop", filterKey: "computers" },
        { name: "USB Hubs", image: "https://images.unsplash.com/photo-1625842268584-8f3296236761?q=80&w=200&auto=format&fit=crop", filterKey: "computers" },
    ],
    electronics: [
        { name: "Headphones", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "electronics" },
        { name: "Speakers", image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
        { name: "Cameras", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
        { name: "Smart Watches", image: "https://images.unsplash.com/photo-1546868871-af0de0ae72be?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "electronics" },
        { name: "TV & Projectors", image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
        { name: "Drones", image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
    ],
    fashion_women: [
        { name: "Dresses", image: "https://images.unsplash.com/photo-1515347619362-71c1813f4124?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
        { name: "Activewear", image: "https://images.unsplash.com/photo-1518459031867-a89b944bffe4?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "T-Shirts", image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Heels", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Sneakers", image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Bags", image: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
    ],
    fashion_men: [
        { name: "T-Shirts", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Casual Shirts", image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Jeans", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Sneakers", image: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
        { name: "Jackets", image: "https://images.unsplash.com/photo-1544923246-77307dd270b4?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Suits", image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
    ],
    beauty: [
        { name: "Skincare", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=200&auto=format&fit=crop", filterKey: "beauty" },
        { name: "Makeup", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "beauty" },
        { name: "Hair Care", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=200&auto=format&fit=crop", filterKey: "beauty" },
        { name: "Fragrances", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=200&auto=format&fit=crop", filterKey: "beauty" },
        { name: "Nail Art", image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "beauty" },
        { name: "Body Care", image: "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?q=80&w=200&auto=format&fit=crop", filterKey: "beauty" },
    ],
    home: [
        { name: "Home Decor", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Kitchen", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "home" },
        { name: "Bedding", image: "https://images.unsplash.com/photo-1522771731478-44fb1056c71c?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Storage", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Lighting", image: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Cookware", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "home" },
    ],
    gaming: [
        { name: "Consoles", image: "https://images.unsplash.com/photo-1486401899868-0e435ed85128?q=80&w=200&auto=format&fit=crop", filterKey: "gaming" },
        { name: "Controllers", image: "https://images.unsplash.com/photo-1592840496694-26d035b52b48?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "gaming" },
        { name: "Gaming Chairs", image: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=200&auto=format&fit=crop", filterKey: "gaming" },
        { name: "Keyboards", image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "gaming" },
        { name: "VR Headsets", image: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?q=80&w=200&auto=format&fit=crop", filterKey: "gaming" },
        { name: "Monitors", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=200&auto=format&fit=crop", filterKey: "gaming" },
    ],
    fitness: [
        { name: "Gym Equipment", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop", filterKey: "fitness" },
        { name: "Yoga", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fitness" },
        { name: "Cycling", image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=200&auto=format&fit=crop", filterKey: "fitness" },
        { name: "Running", image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=200&auto=format&fit=crop", filterKey: "fitness" },
        { name: "Camping", image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fitness" },
    ],
    grocery: [
        { name: "Snacks", image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?q=80&w=200&auto=format&fit=crop", filterKey: "grocery" },
        { name: "Beverages", image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=200&auto=format&fit=crop", filterKey: "grocery" },
        { name: "Spices", image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "grocery" },
        { name: "Rice & Grains", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=200&auto=format&fit=crop", filterKey: "grocery" },
    ],
    baby: [
        { name: "Baby Clothing", image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=200&auto=format&fit=crop", filterKey: "baby" },
        { name: "Strollers", image: "https://images.unsplash.com/photo-1586048036037-40c3e1e6f5d3?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "baby" },
        { name: "Feeding", image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=200&auto=format&fit=crop", filterKey: "baby" },
        { name: "Toys", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=200&auto=format&fit=crop", filterKey: "baby" },
    ],
    cars: [
        { name: "Accessories", image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=200&auto=format&fit=crop", filterKey: "cars" },
        { name: "Car Care", image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "cars" },
        { name: "Tools", image: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?q=80&w=200&auto=format&fit=crop", filterKey: "cars" },
    ],
    jewelry: [
        { name: "Necklaces", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
        { name: "Rings", image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Watches", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Earrings", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
    ],
    furniture: [
        { name: "Living Room", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=200&auto=format&fit=crop", filterKey: "furniture" },
        { name: "Bedroom", image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=200&auto=format&fit=crop", filterKey: "furniture" },
        { name: "Office Desks", image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "furniture" },
    ],
    books: [
        { name: "Fiction", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=200&auto=format&fit=crop", filterKey: "office" },
        { name: "Non-Fiction", image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=200&auto=format&fit=crop", filterKey: "office" },
        { name: "Textbooks", image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=200&auto=format&fit=crop", filterKey: "office" },
    ],
};

export default function CategoriesScreen() {
    const [activeCategory, setActiveCategory] = useState(SIDEBAR_CATEGORIES[0].key);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);

    const currentSubcategories = SUBCATEGORIES[activeCategory] || SUBCATEGORIES.featured;

    const fetchProducts = useCallback(async (category?: string) => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (category) params.category = category;
            const data = await api.getProducts(params);
            setProducts(data);
        } catch (err) {
            console.warn("Failed to load products:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeFilter) {
            const sub = currentSubcategories.find(s => s.name === activeFilter);
            fetchProducts(sub?.filterKey || activeFilter);
        }
    }, [activeFilter]);

    const renderProduct = ({ item }: { item: Product }) => (
        <TouchableOpacity
            style={styles.productCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/product/${item.id}`)}
        >
            <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" />
            <View style={styles.productBody}>
                <Text numberOfLines={2} style={styles.productName}>{item.name}</Text>
                <View style={styles.priceRow}>
                    <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
                    <Text style={styles.soldText}>{item.sold_count > 1000 ? `${Math.floor(item.sold_count / 1000)}K+` : item.sold_count} sold</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Categories</Text>
            </View>

            <View style={styles.mainContent}>
                {/* Left Sidebar */}
                <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false}>
                    {SIDEBAR_CATEGORIES.map((cat) => {
                        const isActive = cat.key === activeCategory;
                        return (
                            <TouchableOpacity
                                key={cat.key}
                                style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                                onPress={() => { setActiveCategory(cat.key); setActiveFilter(null); }}
                                activeOpacity={0.7}
                            >
                                {isActive && <View style={styles.sidebarActiveBar} />}
                                <Ionicons
                                    name={cat.icon as any}
                                    size={16}
                                    color={isActive ? "#059669" : "#9CA3AF"}
                                />
                                <Text
                                    style={[styles.sidebarLabel, isActive && styles.sidebarLabelActive]}
                                    numberOfLines={2}
                                >
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Right Content */}
                <ScrollView style={styles.rightContent} showsVerticalScrollIndicator={false}>
                    {!activeFilter ? (
                        <>
                            <Text style={styles.sectionTitle}>Shop by category</Text>
                            <View style={styles.subcategoryGrid}>
                                {currentSubcategories.map((sub, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.subcategoryItem}
                                        onPress={() => setActiveFilter(sub.name)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.subcategoryImageWrap}>
                                            <Image
                                                source={{ uri: sub.image }}
                                                style={styles.subcategoryImage}
                                            />
                                            {sub.hot && (
                                                <View style={styles.hotBadge}>
                                                    <Text style={styles.hotBadgeText}>HOT</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.subcategoryName} numberOfLines={2}>{sub.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    ) : (
                        <>
                            {/* Back + Filter Title */}
                            <View style={styles.filterHeader}>
                                <TouchableOpacity onPress={() => setActiveFilter(null)} style={styles.backBtn}>
                                    <Ionicons name="chevron-back" size={16} color="#6B7280" />
                                    <Text style={styles.backText}>Back</Text>
                                </TouchableOpacity>
                                <View style={styles.filterBadge}>
                                    <Text style={styles.filterBadgeText}>{activeFilter}</Text>
                                </View>
                            </View>

                            {/* Product Grid */}
                            {loading ? (
                                <View style={styles.loadingWrap}>
                                    <ActivityIndicator size="large" color="#059669" />
                                </View>
                            ) : (
                                <FlatList
                                    data={products}
                                    numColumns={2}
                                    keyExtractor={(item) => item.id}
                                    renderItem={renderProduct}
                                    columnWrapperStyle={styles.productGridRow}
                                    contentContainerStyle={styles.productGridContent}
                                    scrollEnabled={false}
                                    ListEmptyComponent={
                                        <View style={styles.emptyWrap}>
                                            <Ionicons name="bag-outline" size={32} color="#D1D5DB" />
                                            <Text style={styles.emptyText}>No products found</Text>
                                        </View>
                                    }
                                />
                            )}
                        </>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const SIDEBAR_WIDTH = 80;
const CARD_WIDTH = (width - SIDEBAR_WIDTH - 32) / 2 - 4;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    headerTitle: { fontSize: 20, fontWeight: "800", color: "#1F2937" },
    mainContent: { flex: 1, flexDirection: "row" },
    sidebar: { width: SIDEBAR_WIDTH, backgroundColor: "#F8F8F8", borderRightWidth: 1, borderRightColor: "#F3F4F6" },
    sidebarItem: {
        paddingHorizontal: 8, paddingVertical: 14,
        alignItems: "center", justifyContent: "center", gap: 4,
        position: "relative",
    },
    sidebarItemActive: { backgroundColor: "#FFF" },
    sidebarActiveBar: {
        position: "absolute", left: 0, top: 4, bottom: 4,
        width: 3, backgroundColor: "#059669", borderTopRightRadius: 3, borderBottomRightRadius: 3,
    },
    sidebarLabel: { fontSize: 9, color: "#6B7280", textAlign: "center", lineHeight: 12 },
    sidebarLabelActive: { color: "#059669", fontWeight: "700" },
    rightContent: { flex: 1, padding: 12 },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
    subcategoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "flex-start" },
    subcategoryItem: { alignItems: "center", width: (width - SIDEBAR_WIDTH - 48) / 3 - 4 },
    subcategoryImageWrap: {
        width: 56, height: 56, borderRadius: 28, overflow: "visible",
        marginBottom: 6, position: "relative",
    },
    subcategoryImage: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#F3F4F6" },
    hotBadge: {
        position: "absolute", top: -4, right: -6,
        backgroundColor: "#F59E0B", borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1,
        borderWidth: 1.5, borderColor: "#FFF",
    },
    hotBadgeText: { fontSize: 7, fontWeight: "900", color: "#FFF" },
    subcategoryName: { fontSize: 10, color: "#374151", fontWeight: "500", textAlign: "center", lineHeight: 13, maxWidth: 72 },
    filterHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
    backText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
    filterBadge: { backgroundColor: "#ECFDF5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    filterBadgeText: { fontSize: 12, fontWeight: "700", color: "#059669" },
    productGridRow: { justifyContent: "space-between", marginBottom: 8 },
    productGridContent: { paddingBottom: 100 },
    productCard: {
        width: CARD_WIDTH, backgroundColor: "#FFF", borderRadius: 12, overflow: "hidden",
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    productImage: { width: "100%", height: CARD_WIDTH, backgroundColor: "#F9FAFB" },
    productBody: { padding: 8 },
    productName: { fontSize: 11, fontWeight: "600", color: "#1F2937", lineHeight: 15 },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    productPrice: { fontSize: 13, fontWeight: "800", color: "#059669" },
    soldText: { fontSize: 9, color: "#9CA3AF" },
    loadingWrap: { paddingTop: 40, alignItems: "center" },
    emptyWrap: { paddingTop: 40, alignItems: "center", gap: 8 },
    emptyText: { fontSize: 12, color: "#9CA3AF" },
});
