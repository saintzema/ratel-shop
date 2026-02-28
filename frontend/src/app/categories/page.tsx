"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Camera, Check, ChevronRight, ShoppingCart, Star, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DemoStore } from "@/lib/demo-store";
import { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";

// ─── Sidebar Categories (Temu-style extensive list, adapted to our platform) ───
const SIDEBAR_CATEGORIES = [
    { key: "featured", label: "Featured" },
    { key: "phones", label: "Cell Phones & Accessories" },
    { key: "computers", label: "Computers & Tablets" },
    { key: "electronics", label: "Electronics" },
    { key: "fashion_women", label: "Women's Clothing" },
    { key: "fashion_men", label: "Men's Clothing" },
    { key: "shoes_women", label: "Women's Shoes" },
    { key: "shoes_men", label: "Men's Shoes" },
    { key: "beauty", label: "Beauty & Health" },
    { key: "jewelry", label: "Jewelry & Accessories" },
    { key: "home", label: "Home & Kitchen" },
    { key: "furniture", label: "Furniture" },
    { key: "appliances", label: "Appliances" },
    { key: "fitness", label: "Sports & Outdoors" },
    { key: "baby", label: "Baby & Maternity" },
    { key: "grocery", label: "Food & Grocery" },
    { key: "gaming", label: "Gaming" },
    { key: "cars", label: "Automotive" },
    { key: "energy", label: "Energy & Solar" },
    { key: "office", label: "Office & School Supplies" },
    { key: "smart_home", label: "Smart Home" },
    { key: "pet", label: "Pet Supplies" },
    { key: "books", label: "Books & Media" },
    { key: "musical", label: "Musical Instruments" },
];

// ─── Per-category subcategory circles ───
const SUBCATEGORIES: Record<string, { name: string; image: string; hot?: boolean; filterKey?: string }[]> = {
    featured: [
        { name: "Smart Devices", image: "https://images.unsplash.com/photo-1558089687-f282ffcbc126?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
        { name: "Electric Massagers", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=200&auto=format&fit=crop", filterKey: "fitness" },
        { name: "Women's Jewelry", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Women's Flat Sandals", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Home Decor Products", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Women's Dresses", image: "https://images.unsplash.com/photo-1515347619362-71c1813f4124?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
        { name: "Women's T-Shirt", image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
        { name: "Cases & Sleeves", image: "https://images.unsplash.com/photo-1601593346740-925612772716?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "phones" },
        { name: "Kitchen Utensils", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Headphones & Earbuds", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "electronics" },
        { name: "Women's Two Piece Sets", image: "https://images.unsplash.com/photo-1518459031867-a89b944bffe4?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
        { name: "Women's Coats & Jackets", image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Men's Activewear", image: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Tablets & Laptops", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=200&auto=format&fit=crop", filterKey: "computers" },
        { name: "Kitchen Storage", image: "https://images.unsplash.com/photo-1580584126903-c17d41830450?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Women's Blouses", image: "https://images.unsplash.com/photo-1434389678232-05f4fa24b51b?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Bedding", image: "https://images.unsplash.com/photo-1522771731478-44fb1056c71c?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Home Storage", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "home" },
    ],
    phones: [
        { name: "Smartphones", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=200&auto=format&fit=crop", filterKey: "phones" },
        { name: "Phone Cases", image: "https://images.unsplash.com/photo-1601593346740-925612772716?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "phones" },
        { name: "Chargers & Cables", image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=200&auto=format&fit=crop", filterKey: "phones" },
        { name: "Screen Protectors", image: "https://images.unsplash.com/photo-1585060544812-6b45742d762f?q=80&w=200&auto=format&fit=crop", filterKey: "phones" },
        { name: "Power Banks", image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?q=80&w=200&auto=format&fit=crop", filterKey: "phones" },
        { name: "Phone Holders", image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?q=80&w=200&auto=format&fit=crop", filterKey: "phones" },
    ],
    computers: [
        { name: "Laptops", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=200&auto=format&fit=crop", filterKey: "computers" },
        { name: "Tablets", image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=200&auto=format&fit=crop", filterKey: "computers" },
        { name: "Keyboards", image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "computers" },
        { name: "Mice & Trackpads", image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=200&auto=format&fit=crop", filterKey: "computers" },
        { name: "Monitors", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=200&auto=format&fit=crop", filterKey: "computers" },
        { name: "USB Hubs & Docks", image: "https://images.unsplash.com/photo-1625842268584-8f3296236761?q=80&w=200&auto=format&fit=crop", filterKey: "computers" },
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
        { name: "Blouses & Shirts", image: "https://images.unsplash.com/photo-1434389678232-05f4fa24b51b?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "T-Shirts & Tops", image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Pants & Jeans", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Skirts", image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Activewear", image: "https://images.unsplash.com/photo-1518459031867-a89b944bffe4?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
        { name: "Coats & Jackets", image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Two Piece Sets", image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Lingerie", image: "https://images.unsplash.com/photo-1617331721458-bd3bd3f9c7f8?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
    ],
    fashion_men: [
        { name: "T-Shirts", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Casual Shirts", image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Jeans & Pants", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Activewear", image: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
        { name: "Jackets & Coats", image: "https://images.unsplash.com/photo-1544923246-77307dd270b4?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Suits & Blazers", image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
    ],
    shoes_women: [
        { name: "Heels", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
        { name: "Sneakers", image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Sandals & Flats", image: "https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Boots", image: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Slippers", image: "https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
    ],
    shoes_men: [
        { name: "Sneakers", image: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
        { name: "Casual Shoes", image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Sports Shoes", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
        { name: "Boots", image: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Formal Shoes", image: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Slippers & Sandals", image: "https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
    ],
    beauty: [
        { name: "Skincare", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=200&auto=format&fit=crop", filterKey: "beauty" },
        { name: "Makeup", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "beauty" },
        { name: "Hair Care", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=200&auto=format&fit=crop", filterKey: "beauty" },
        { name: "Fragrances", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=200&auto=format&fit=crop", filterKey: "beauty" },
        { name: "Nail Art", image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "beauty" },
        { name: "Body Care", image: "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?q=80&w=200&auto=format&fit=crop", filterKey: "beauty" },
    ],
    jewelry: [
        { name: "Women's Necklaces", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
        { name: "Rings", image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Bracelets", image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Earrings", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fashion" },
        { name: "Watches", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
        { name: "Bags & Purses", image: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=200&auto=format&fit=crop", filterKey: "fashion" },
    ],
    home: [
        { name: "Home Decor", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Kitchen Utensils", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "home" },
        { name: "Storage & Org", image: "https://images.unsplash.com/photo-1580584126903-c17d41830450?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Bedding", image: "https://images.unsplash.com/photo-1522771731478-44fb1056c71c?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Bathroom", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Lighting", image: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Curtains & Drapes", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Cleaning Supplies", image: "https://images.unsplash.com/photo-1563453392212-326f5e854473?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Cookware", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "home" },
    ],
    furniture: [
        { name: "Living Room", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=200&auto=format&fit=crop", filterKey: "furniture" },
        { name: "Bedroom", image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=200&auto=format&fit=crop", filterKey: "furniture" },
        { name: "Office Desks", image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "furniture" },
        { name: "Shelving", image: "https://images.unsplash.com/photo-1594620302200-9a762244a156?q=80&w=200&auto=format&fit=crop", filterKey: "furniture" },
        { name: "Dining Tables", image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?q=80&w=200&auto=format&fit=crop", filterKey: "furniture" },
        { name: "Outdoor", image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=200&auto=format&fit=crop", filterKey: "furniture" },
    ],
    appliances: [
        { name: "Blenders", image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Air Fryers", image: "https://images.unsplash.com/photo-1648145289226-5c2bb64faa44?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "home" },
        { name: "Fans & AC", image: "https://images.unsplash.com/photo-1585338107529-13afc5f02586?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
        { name: "Iron & Steamer", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Vacuum Cleaners", image: "https://images.unsplash.com/photo-1558317374-067fb5f30001?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Electric Kettles", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
    ],
    fitness: [
        { name: "Gym Equipment", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop", filterKey: "fitness" },
        { name: "Yoga & Pilates", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fitness" },
        { name: "Cycling", image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=200&auto=format&fit=crop", filterKey: "fitness" },
        { name: "Running", image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=200&auto=format&fit=crop", filterKey: "fitness" },
        { name: "Water Sports", image: "https://images.unsplash.com/photo-1530053969600-caed2596d242?q=80&w=200&auto=format&fit=crop", filterKey: "fitness" },
        { name: "Camping & Hiking", image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "fitness" },
    ],
    baby: [
        { name: "Baby Clothing", image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=200&auto=format&fit=crop", filterKey: "baby" },
        { name: "Diapers", image: "https://images.unsplash.com/photo-1584839404072-53a0110a521e?q=80&w=200&auto=format&fit=crop", filterKey: "baby" },
        { name: "Strollers", image: "https://images.unsplash.com/photo-1586048036037-40c3e1e6f5d3?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "baby" },
        { name: "Feeding", image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=200&auto=format&fit=crop", filterKey: "baby" },
        { name: "Toys", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=200&auto=format&fit=crop", filterKey: "baby" },
        { name: "Maternity", image: "https://images.unsplash.com/photo-1493894750891-57e4e0a54c7a?q=80&w=200&auto=format&fit=crop", filterKey: "baby" },
    ],
    grocery: [
        { name: "Snacks", image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?q=80&w=200&auto=format&fit=crop", filterKey: "grocery" },
        { name: "Beverages", image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=200&auto=format&fit=crop", filterKey: "grocery" },
        { name: "Spices & Seasonings", image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "grocery" },
        { name: "Canned Goods", image: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?q=80&w=200&auto=format&fit=crop", filterKey: "grocery" },
        { name: "Rice & Grains", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=200&auto=format&fit=crop", filterKey: "grocery" },
        { name: "Cooking Oils", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=200&auto=format&fit=crop", filterKey: "grocery" },
    ],
    gaming: [
        { name: "Gaming Consoles", image: "https://images.unsplash.com/photo-1486401899868-0e435ed85128?q=80&w=200&auto=format&fit=crop", filterKey: "gaming" },
        { name: "Controllers", image: "https://images.unsplash.com/photo-1592840496694-26d035b52b48?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "gaming" },
        { name: "Gaming Chairs", image: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=200&auto=format&fit=crop", filterKey: "gaming" },
        { name: "Gaming Keyboards", image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "gaming" },
        { name: "VR Headsets", image: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?q=80&w=200&auto=format&fit=crop", filterKey: "gaming" },
        { name: "Gaming Monitors", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=200&auto=format&fit=crop", filterKey: "gaming" },
    ],
    cars: [
        { name: "Car Accessories", image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=200&auto=format&fit=crop", filterKey: "cars" },
        { name: "Car Electronics", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=200&auto=format&fit=crop", filterKey: "cars" },
        { name: "Car Care", image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "cars" },
        { name: "Tools & Equipment", image: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?q=80&w=200&auto=format&fit=crop", filterKey: "cars" },
        { name: "Tires & Parts", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=200&auto=format&fit=crop", filterKey: "cars" },
        { name: "Interior Decor", image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=200&auto=format&fit=crop", filterKey: "cars" },
    ],
    energy: [
        { name: "Solar Panels", image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "energy" },
        { name: "Batteries", image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?q=80&w=200&auto=format&fit=crop", filterKey: "energy" },
        { name: "Inverters", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=200&auto=format&fit=crop", filterKey: "energy" },
        { name: "Generators", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "energy" },
        { name: "LED Lights", image: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?q=80&w=200&auto=format&fit=crop", filterKey: "energy" },
        { name: "Cables & Wiring", image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=200&auto=format&fit=crop", filterKey: "energy" },
    ],
    office: [
        { name: "Stationery", image: "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?q=80&w=200&auto=format&fit=crop", filterKey: "office" },
        { name: "Printers & Ink", image: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?q=80&w=200&auto=format&fit=crop", filterKey: "office" },
        { name: "School Bags", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "office" },
        { name: "Desk Organizers", image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=200&auto=format&fit=crop", filterKey: "office" },
        { name: "Calculators", image: "https://images.unsplash.com/photo-1564939558297-fc396f18e5c7?q=80&w=200&auto=format&fit=crop", filterKey: "office" },
        { name: "Art Supplies", image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=200&auto=format&fit=crop", filterKey: "office" },
    ],
    smart_home: [
        { name: "Smart Bulbs", image: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
        { name: "Security Cameras", image: "https://images.unsplash.com/photo-1558612113-b87a79ead9a1?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "electronics" },
        { name: "Smart Plugs", image: "https://images.unsplash.com/photo-1558089687-f282ffcbc126?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
        { name: "Smart Speakers", image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
        { name: "Robot Vacuums", image: "https://images.unsplash.com/photo-1558317374-067fb5f30001?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "electronics" },
        { name: "Doorbells", image: "https://images.unsplash.com/photo-1558612113-b87a79ead9a1?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
    ],
    pet: [
        { name: "Dog Supplies", image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Cat Supplies", image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "home" },
        { name: "Fish & Aquarium", image: "https://images.unsplash.com/photo-1520302519878-1ac0b8960065?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Pet Food", image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Pet Toys", image: "https://images.unsplash.com/photo-1535930749574-1399327ce78f?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
        { name: "Grooming", image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=200&auto=format&fit=crop", filterKey: "home" },
    ],
    books: [
        { name: "Fiction", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=200&auto=format&fit=crop", filterKey: "office" },
        { name: "Non-Fiction", image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=200&auto=format&fit=crop", filterKey: "office" },
        { name: "Children's Books", image: "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "office" },
        { name: "Textbooks", image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=200&auto=format&fit=crop", filterKey: "office" },
        { name: "Magazines", image: "https://images.unsplash.com/photo-1585846888147-3bf21df30e5f?q=80&w=200&auto=format&fit=crop", filterKey: "office" },
        { name: "E-Readers", image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
    ],
    musical: [
        { name: "Guitars", image: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
        { name: "Keyboards & Piano", image: "https://images.unsplash.com/photo-1552422535-c45813c61732?q=80&w=200&auto=format&fit=crop", hot: true, filterKey: "electronics" },
        { name: "Drums", image: "https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
        { name: "Microphones", image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
        { name: "DJ Equipment", image: "https://images.unsplash.com/photo-1571327073757-71d13c24de30?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
        { name: "Accessories", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=200&auto=format&fit=crop", filterKey: "electronics" },
    ],
};

export default function CategoriesPage() {
    const [activeCategory, setActiveCategory] = useState(SIDEBAR_CATEGORIES[0].key);
    const [searchQuery, setSearchQuery] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [activeFilter, setActiveFilter] = useState("all");
    const { addToCart } = useCart();
    const router = useRouter();

    const currentSubcategories = SUBCATEGORIES[activeCategory] || SUBCATEGORIES.featured;

    useEffect(() => {
        const allProducts = DemoStore.getApprovedProducts();
        let filtered = allProducts;

        if (activeFilter !== "all") {
            // Try to match by name, category, or description
            const filterTerm = activeFilter.toLowerCase();
            filtered = allProducts.filter(p =>
                p.category.toLowerCase().includes(filterTerm) ||
                p.name.toLowerCase().includes(filterTerm) ||
                (p.description && p.description.toLowerCase().includes(filterTerm))
            );

            // If no direct match, try the filterKey from the subcategory
            if (filtered.length === 0) {
                const sub = currentSubcategories.find(s => s.name === activeFilter);
                if (sub?.filterKey) {
                    filtered = allProducts.filter(p =>
                        p.category.toLowerCase().includes(sub.filterKey!.toLowerCase())
                    );
                }
            }

            // If still empty, show random products as placeholder
            if (filtered.length === 0) {
                filtered = [...allProducts].sort(() => 0.5 - Math.random()).slice(0, 8);
            }
        } else {
            // Default "Trending items" view - shuffle
            filtered = [...allProducts].sort(() => 0.5 - Math.random());
        }

        setProducts(filtered);
    }, [activeCategory, activeFilter]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-gray-50 pb-16 md:pb-0">
            {/* Top Search Header */}
            <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-100 z-10 bg-white shadow-sm">
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                        type="search"
                        placeholder="Search for products..."
                        className="w-full pl-9 pr-10 py-2 h-10 border-2 border-brand-green-600 rounded-full focus-visible:ring-0 focus-visible:border-brand-green-700 bg-white text-sm font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <Camera className="h-5 w-5 text-gray-500 cursor-pointer" />
                    </div>
                </div>
                <button
                    onClick={handleSearch}
                    className="bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-full p-2 h-10 w-10 flex items-center justify-center shrink-0 shadow-sm transition-colors"
                >
                    <Search className="h-5 w-5" />
                </button>
            </div>

            {/* Shopping Guarantees Banner */}
            <div className="flex items-center justify-between px-4 py-2 bg-orange-50 border-b border-orange-100/50">
                <div className="flex items-center gap-4 text-xs font-semibold text-green-700">
                    <div className="flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} /> Free shipping
                    </div>
                    <div className="flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} /> Price adjustment within 30 days
                    </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Sidebar - Main Categories */}
                <div className="w-[90px] md:w-[140px] bg-[#f8f8f8] overflow-y-auto border-r border-gray-100 pb-24 shrink-0 no-scrollbar relative z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    {SIDEBAR_CATEGORIES.map((category) => {
                        const isActive = category.key === activeCategory;
                        return (
                            <button
                                key={category.key}
                                onClick={() => {
                                    setActiveCategory(category.key);
                                    setActiveFilter("all");
                                }}
                                className={`w-full text-left px-2.5 py-3.5 text-[11px] md:text-sm font-medium transition-colors relative flex flex-col justify-center leading-[1.25] ${isActive ? 'bg-white text-brand-green-700 font-bold' : 'text-gray-600 hover:bg-gray-100/50'}`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-green-600 rounded-r" />
                                )}
                                <span className={isActive ? "pl-1" : "opacity-80 pl-1"}>{category.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Right Content - Subcategories & Product Grid */}
                <div className="flex-1 overflow-y-auto bg-white p-3 md:p-4 pb-24 no-scrollbar">

                    {/* Subcategory Circles View */}
                    {activeFilter === "all" ? (
                        <>
                            <div className="mb-3 sticky top-0 bg-white z-10 pt-1 pb-2">
                                <h2 className="text-[13px] md:text-sm font-bold text-gray-900">Shop by category</h2>
                            </div>

                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 gap-y-5">
                                {currentSubcategories.map((sub, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setActiveFilter(sub.name)}
                                        className="flex flex-col items-center group cursor-pointer w-full text-center"
                                    >
                                        <div className="relative w-[60px] h-[60px] sm:w-[72px] sm:h-[72px] mb-1.5 rounded-full overflow-visible">
                                            <div className="w-full h-full rounded-full overflow-hidden shadow-sm group-hover:shadow-md transition-shadow bg-gray-100">
                                                <img
                                                    src={sub.image}
                                                    alt={sub.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                />
                                            </div>
                                            {sub.hot && (
                                                <div className="absolute -top-1 -right-1 bg-brand-orange text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm z-10 leading-none">
                                                    HOT
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] sm:text-[11px] text-gray-800 font-medium leading-[1.15] group-hover:text-brand-green-600 transition-colors line-clamp-2 px-0.5 max-w-[80px]">
                                            {sub.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="mb-3 flex items-center gap-2 sticky top-0 bg-white z-10 pt-1 pb-2 border-b border-gray-50">
                            <button
                                onClick={() => setActiveFilter("all")}
                                className="text-sm font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1"
                            >
                                <ChevronRight className="h-4 w-4 rotate-180" /> Back
                            </button>
                            <h2 className="text-[13px] sm:text-sm font-bold text-brand-green-700 bg-brand-green-50 px-2 py-1 rounded inline-flex line-clamp-1">{activeFilter}</h2>
                        </div>
                    )}

                    {/* Products Grid Section */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-3 px-1 sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-2">
                            <h2 className="text-[14px] md:text-base font-bold text-gray-900 tracking-tight">
                                {activeFilter !== 'all' ? activeFilter : 'Trending items'}
                            </h2>
                            <button className="flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-900 font-medium transition-colors">
                                Sort by <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3 -mx-1 md:mx-0">
                            {products.map(product => (
                                <div key={product.id} className="group relative bg-white flex flex-col hover:shadow-lg transition-all rounded-md overflow-hidden cursor-pointer" onClick={() => router.push(`/product/${product.id}`)}>
                                    <div className="relative aspect-[4/5] w-full bg-gray-50/50 overflow-hidden shrink-0">
                                        <img
                                            src={product.images?.[0] || product.image_url || '/assets/images/placeholder.png'}
                                            alt={product.name}
                                            loading="lazy"
                                            className="w-full h-full object-cover transition-transform duration-500"
                                            onError={(e) => { e.currentTarget.src = '/assets/images/placeholder.png'; }}
                                        />

                                        {/* Cart Button */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                                            className="absolute bottom-2 right-2 w-8 h-8 rounded-full border-[1.5px] border-white/90 shadow-[0_2px_4px_rgba(0,0,0,0.25)] bg-black/10 flex items-center justify-center transition-colors z-10 hover:bg-black/25"
                                        >
                                            <ShoppingCart className="h-4 w-4 text-white drop-shadow-md" strokeWidth={2.5} />
                                            <div className="absolute top-[1px] right-[3px] font-black text-white text-[11px] leading-none drop-shadow-md">+</div>
                                        </button>
                                    </div>

                                    {/* Product Details */}
                                    <div className="p-2 flex-1 flex flex-col w-full text-left">
                                        {/* Product Name */}
                                        <h3 className="text-[12px] sm:text-[13px] font-semibold text-gray-900 leading-[1.3] line-clamp-2 mb-1">
                                            {product.name}
                                        </h3>

                                        <div className="flex items-center gap-1">
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, i) => {
                                                    const rating = product.avg_rating || 4.5;
                                                    return (
                                                        <Star
                                                            key={i}
                                                            className={`h-2.5 w-2.5 ${i < Math.floor(rating) ? "fill-gray-900 text-gray-900" : i < rating ? "fill-gray-900 text-gray-900 opacity-60" : "fill-gray-200 text-gray-200"}`}
                                                            strokeWidth={1}
                                                        />
                                                    );
                                                })}
                                            </div>
                                            <span className="text-[11px] text-gray-600">{product.review_count > 0 ? product.review_count.toLocaleString() : Math.floor(product.sold_count / 8)}</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                            <span className="text-[15px] sm:text-[16px] font-black text-gray-900 tracking-tight leading-none">
                                                ₦{product.price.toLocaleString()}
                                            </span>
                                            <span className="text-[11px] text-gray-400 font-medium">
                                                {product.sold_count > 1000 ? `${Math.floor(product.sold_count / 1000)}K+` : product.sold_count} sold
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
