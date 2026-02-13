import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image"; // Added for thumbnails
import {
    Search,
    ShoppingCart,
    Menu,
    User,
    MapPin,
    ChevronDown,
    X,
    Phone,
    Monitor,
    Sofa,
    Home,
    Zap,
    ShoppingBag,
    Car,
    Gamepad
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LocationModal } from "@/components/modals/LocationModal";
import { CATEGORIES } from "@/lib/types";
import { DEMO_PRODUCTS } from "@/lib/data"; // Import products for search
import { cn } from "@/lib/utils";
import { useLocation } from "@/context/LocationContext";

export function Navbar() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<typeof DEMO_PRODUCTS>([]); // State for suggestions
    const [showSuggestions, setShowSuggestions] = useState(false);
    const { location, setLocation } = useLocation();
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const categoryRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // Predictive Search Logic
    useEffect(() => {
        if (searchQuery.trim().length > 1) {
            const matches = DEMO_PRODUCTS.filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.category.toLowerCase().includes(searchQuery.toLowerCase())
            ).slice(0, 5); // Limit to 5 suggestions
            setSuggestions(matches);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [searchQuery]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setIsCategoryOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            setShowSuggestions(false);
            router.push(`/search?q=${encodeURIComponent(searchQuery)}&category=${selectedCategory}`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    return (
        <>
            <header className="sticky top-0 z-50 w-full flex-col">
                {/* Top Bar - Amazon Style */}
                <div className="flex w-full items-center gap-4 bg-[#131921] px-4 py-3 text-white">
                    {/* Logo */}
                    <Logo />

                    {/* Deliver To - Now Clickable */}
                    <button
                        onClick={() => setIsLocationModalOpen(true)}
                        className="hidden md:flex flex-col text-left text-xs leading-tight hover:outline hover:outline-1 hover:outline-white p-2 rounded cursor-pointer transition-all"
                    >
                        <span className="text-gray-300 ml-3">Deliver to</span>
                        <div className="flex items-center font-bold">
                            <MapPin className="mr-1 h-3.5 w-3.5 text-white" />
                            {location}
                        </div>
                    </button>

                    {/* Search Bar Container */}
                    <div className="flex flex-1 items-center max-w-3xl mx-4 relative" ref={searchRef}>
                        <div className="flex h-11 w-full rounded-lg bg-white text-black overflow-visible focus-within:ring-3 focus-within:ring-ratel-orange/50 transition-shadow relative z-20">
                            {/* Category Dropdown */}
                            <div className="relative h-full" ref={categoryRef}>
                                <button
                                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                    className="hidden sm:flex h-full items-center gap-1 bg-gray-100 px-3 text-xs text-gray-700 hover:bg-gray-200 border-r border-gray-300 transition-colors rounded-l-lg cursor-pointer whitespace-nowrap"
                                >
                                    {selectedCategory} <ChevronDown className="h-3 w-3" />
                                </button>

                                <AnimatePresence>
                                    {isCategoryOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 5 }}
                                            className="absolute top-full left-0 mt-1 w-56 bg-white shadow-xl rounded-lg border border-gray-200 z-50 max-h-80 overflow-y-auto"
                                        >
                                            <div className="p-1">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCategory("All");
                                                        setIsCategoryOpen(false);
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                                                        selectedCategory === "All" ? "bg-ratel-green-50 text-ratel-green-700 font-medium" : "hover:bg-gray-100 text-gray-700"
                                                    )}
                                                >
                                                    All Categories
                                                </button>
                                                {CATEGORIES.map((cat) => (
                                                    <button
                                                        key={cat.value}
                                                        onClick={() => {
                                                            setSelectedCategory(cat.label);
                                                            setIsCategoryOpen(false);
                                                        }}
                                                        className={cn(
                                                            "w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2",
                                                            selectedCategory === cat.label ? "bg-ratel-green-50 text-ratel-green-700 font-medium" : "hover:bg-gray-100 text-gray-700"
                                                        )}
                                                    >
                                                        <span>{cat.icon}</span>
                                                        {cat.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <Input
                                className="flex-1 border-0 bg-transparent px-4 text-sm focus-visible:ring-0 placeholder:text-gray-500 rounded-none h-full text-black"
                                placeholder="Search RatelShop..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                                onKeyDown={handleKeyDown}
                            />

                            <Button
                                onClick={handleSearch}
                                className="h-full rounded-r-lg rounded-l-none px-5 bg-ratel-orange hover:bg-amber-500 text-black border-none transition-colors duration-300 cursor-pointer"
                            >
                                <Search className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Predictive Search Dropdown */}
                        <AnimatePresence>
                            {showSuggestions && suggestions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-b-lg shadow-xl border border-gray-200 overflow-hidden z-10"
                                >
                                    {suggestions.map((product) => (
                                        <Link
                                            href={`/product/${product.id}`}
                                            key={product.id}
                                            onClick={() => setShowSuggestions(false)}
                                            className="flex items-center gap-4 p-3 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-0"
                                        >
                                            {/* Thumbnail */}
                                            <div className="relative h-10 w-10 shrink-0 bg-gray-50 rounded p-1">
                                                <img
                                                    src={product.images?.[0] || product.image_url || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80"}
                                                    alt={product.name}
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        e.currentTarget.src = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80";
                                                    }}
                                                />
                                            </div>

                                            {/* Text Info */}
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-black line-clamp-1">
                                                    {product.name}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    in {product.category}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Account & Lists Dropdown */}
                    <div
                        className="relative hidden md:flex flex-col text-xs leading-tight hover:outline hover:outline-1 hover:outline-white p-2 rounded cursor-pointer group"
                        onMouseEnter={() => setIsAccountMenuOpen(true)}
                        onMouseLeave={() => setIsAccountMenuOpen(false)}
                    >
                        <span className="text-gray-300">Hello, Sign in</span>
                        <span className="font-bold flex items-center">Account & Lists <ChevronDown className="ml-1 h-3 w-3" /></span>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {isAccountMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute top-full right-0 w-72 bg-white dark:bg-zinc-900 shadow-xl rounded-sm p-4 mt-0.5 border dark:border-zinc-800 text-black dark:text-white z-[100]"
                                >
                                    <div className="flex flex-col items-center pb-4 border-b dark:border-zinc-800">
                                        <Link href="/login" className="w-full">
                                            <Button className="w-full bg-ratel-orange text-black font-bold hover:bg-amber-500 mb-2 shadow-sm">Sign in</Button>
                                        </Link>
                                        <p className="text-[11px] text-gray-600 dark:text-gray-400">New customer? <Link href="/register" className="text-blue-600 hover:underline hover:text-ratel-orange">Start here.</Link></p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <div className="space-y-3">
                                            <h4 className="font-bold text-sm">Your Lists</h4>
                                            <ul className="text-[12px] space-y-1.5 text-gray-700 dark:text-gray-300">
                                                <li className="hover:text-ratel-orange hover:underline cursor-pointer">Create a List</li>
                                                <li className="hover:text-ratel-orange hover:underline cursor-pointer">Find a List</li>
                                                <li className="hover:text-ratel-orange hover:underline cursor-pointer">Wish List</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="font-bold text-sm">Your Account</h4>
                                            <ul className="text-[12px] space-y-1.5 text-gray-700 dark:text-gray-300">
                                                <Link href="/account/orders"><li className="hover:text-ratel-orange hover:underline cursor-pointer">Your Orders</li></Link>
                                                <Link href="/account"><li className="hover:text-ratel-orange hover:underline cursor-pointer">Your Profile</li></Link>
                                                <Link href="/seller"><li className="hover:text-ratel-orange hover:underline cursor-pointer">Seller Hub</li></Link>
                                                <Link href="/account/content"><li className="hover:text-ratel-orange hover:underline cursor-pointer">Content & Devices</li></Link>
                                            </ul>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Returns & Orders */}
                    <Link href="/account/orders" className="hidden md:flex flex-col text-xs leading-tight hover:outline hover:outline-1 hover:outline-white p-2 rounded cursor-pointer transition-all">
                        <span className="text-gray-300">Returns</span>
                        <span className="font-bold">& Orders</span>
                    </Link>

                    {/* Theme Toggle */}
                    <div className="hidden md:block">
                        <ThemeToggle />
                    </div>

                    {/* Cart */}
                    <Link href="/cart" className="flex items-end gap-1 hover:outline hover:outline-1 hover:outline-white p-2 rounded relative transition-all">
                        <div className="relative">
                            <ShoppingCart className="h-8 w-8" />
                            <Badge
                                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-ratel-orange text-black font-bold p-0 border-2 border-[#131921]"
                            >
                                3
                            </Badge>
                        </div>
                        <span className="text-sm font-bold hidden sm:inline mb-1">Cart</span>
                    </Link>
                </div>

                {/* Bottom Bar - Navigation */}
                <div className="flex w-full items-center gap-4 bg-[#232f3e] px-4 py-2 text-sm text-white overflow-x-auto no-scrollbar scroll-smooth">
                    <button
                        onClick={toggleSidebar}
                        className="flex items-center gap-1 font-bold hover:outline hover:outline-1 hover:outline-white px-2 py-1 rounded transition-all"
                    >
                        <Menu className="h-5 w-5" /> All
                    </button>

                    {["Today's Deals", "VDM Verified", "Electronics", "Phones", "Solar Energy", "Cars", "Help"].map((item) => (
                        <Link
                            key={item}
                            href={item === "VDM Verified" ? "/seller/verified" : `/category/${item.toLowerCase().replace(" ", "-")}`}
                            className="whitespace-nowrap px-2 py-1 hover:outline hover:outline-1 hover:outline-white rounded transition-all"
                        >
                            {item}
                        </Link>
                    ))}
                </div>
            </header>

            {/* Location Filter Modal */}
            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                currentLocation={location}
                onSelectLocation={setLocation}
            />

            {/* Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={toggleSidebar}
                            className="fixed inset-0 z-40 bg-black"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "tween", duration: 0.3 }}
                            className="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-zinc-900 shadow-xl overflow-y-auto"
                        >
                            <div className="flex items-center justify-between bg-[#232f3e] px-6 py-3 text-white font-bold text-lg">
                                <Link href="/login" className="flex items-center gap-2 hover:underline">
                                    <User className="h-6 w-6" /> Hello, Sign in
                                </Link>
                                <button onClick={toggleSidebar} className="text-white">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="py-2">
                                <div className="px-6 py-3 font-bold text-lg text-gray-800 dark:text-gray-100">Shop By Category</div>
                                <ul className="space-y-1">
                                    {/* Mock Categories for Sidebar */}
                                    {["Electronics", "Computers", "Smart Home", "Arts & Crafts", "Automotive", "Baby", "Beauty and Personal Care", "Women's Fashion", "Men's Fashion", "Girls' Fashion", "Boys' Fashion", "Health and Household", "Home and Kitchen", "Industrial and Scientific", "Luggage", "Movies & Television", "Pet Supplies", "Software", "Sports and Outdoors", "Tools & Home Improvement", "Toys and Games", "Video Games"].map((cat) => (
                                        <li key={cat}>
                                            <Link
                                                href={`/category/${cat.toLowerCase().replace(/ /g, "-").replace(/&/g, "and")}`}
                                                className="flex items-center justify-between px-6 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                                onClick={() => setIsSidebarOpen(false)}
                                            >
                                                <span>{cat}</span>
                                                <ChevronDown className="h-4 w-4 -rotate-90 text-gray-400" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>

                                <hr className="my-2 border-gray-200 dark:border-zinc-800" />

                                <div className="px-6 py-3 font-bold text-lg text-gray-800 dark:text-gray-100">Help & Settings</div>
                                <ul>
                                    {["Your Account", "Customer Service", "Sign Out"].map((item) => (
                                        <li key={item}>
                                            <Link
                                                href={item === "Sign Out" ? "/logout" : `/${item.toLowerCase().replace(" ", "-")}`}
                                                className="block px-6 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                            >
                                                {item}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

// Fallback CATEGORIES if import fails or is not available in the context
const FALLBACK_CATEGORIES = [
    { label: "Phones & Tablets", value: "phones" },
    { label: "Electronics", value: "electronics" },
    { label: "Vehicles", value: "cars" },
    { label: "Green Energy", value: "energy" },
    { label: "Fashion", value: "fashion" },
    { label: "Gaming", value: "gaming" },
];
