"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { Product } from "@/lib/types";
import { DataSyncService } from "@/lib/sync-store";
import { useInView } from "react-intersection-observer";
import { Sparkles, PackageSearch } from "lucide-react";

interface CategoryPanelProps {
  category: string;
}

export function CategoryPanel({ category }: CategoryPanelProps) {
  const { ref, inView } = useInView({
    triggerOnce: true, // Only fetch once when it becomes visible
    rootMargin: "400px 0px", // Load when it's 400px away from the viewport to hide loading states
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [allFiltered, setAllFiltered] = useState<Product[]>([]);
  const [displayCount, setDisplayCount] = useState(20);
  const [loading, setLoading] = useState(true);

  // Observer for the bottom of the list to load more
  const { ref: loadMoreRef, inView: loadMoreInView } = useInView({
    rootMargin: "200px 0px",
  });

  useEffect(() => {
    if (loadMoreInView && displayCount < allFiltered.length) {
      setDisplayCount(prev => prev + 20);
    }
  }, [loadMoreInView, allFiltered.length, displayCount]);

  useEffect(() => {
    if (inView && loading) {
      const loadData = async () => {
        try {
          // Attempt to get data locally first for speed
          let allData = DataSyncService.getApprovedProducts();
          
          if (!allData || allData.length === 0) {
              // Fallback to API if sync store is empty
              const res = await fetch(`/api/products?category=${encodeURIComponent(category.toLowerCase())}&limit=20`);
              if (res.ok) {
                  const json = await res.json();
                  allData = json.data || [];
              }
          }

          // Enhanced filtering mapping
          const catLower = category.toLowerCase();
          
          // Map UI tab names to possible internal DB variants
          const categoryMappings: Record<string, string[]> = {
              "all": [],
              "trending": ["trending"],
              "best-selling": ["best_selling", "best-selling"],
              "automotive": ["automotive", "cars", "vehicles"],
              "cars": ["cars", "vehicles", "automotive"],
              "computers": ["computers", "laptops"],
              "phones": ["phones", "smartphones"],
              "health": ["health", "medical"],
              "fashion": ["fashion", "clothing", "shoes", "women", "men", "kids"],
              "solar": ["solar", "energy", "inverter", "battery"],
              "evs": ["evs", "electric", "tesla"],
              "grocery": ["grocery", "food", "beverages"],
              "home office": ["home_office", "office", "desk", "chair"]
          };
          
          const searchTerms = categoryMappings[catLower] || [catLower];

          // Filter by category or search terms
          let filtered = allData.filter(p => {
              if (catLower === "all") return true;
              if (catLower === "trending") return p.is_trending === true;
              if (catLower === "best-selling") return (p.sold_count && p.sold_count > 10) || p.is_trending === true;
              
              const pCat = p.category?.toLowerCase() || "";
              const pSub = p.subcategory?.toLowerCase() || "";
              const pName = p.name.toLowerCase();
              const pDesc = p.description?.toLowerCase() || "";
              
              return searchTerms.some(term => 
                  pCat.includes(term) || 
                  pSub.includes(term) || 
                  pName.includes(term) ||
                  pDesc.includes(term)
              );
          });
          
          // Randomize initially but keep consistent
          const randomized = filtered.sort(() => 0.5 - Math.random());
          setAllFiltered(randomized);
          setProducts(randomized.slice(0, displayCount));
        } catch (error) {
          console.error(`Failed to load category ${category}:`, error);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    } else if (inView && !loading) {
        // Just update display slice if already loaded
        setProducts(allFiltered.slice(0, displayCount));
    }
  }, [inView, category, loading, displayCount, allFiltered]);

  return (
    <div ref={ref} className="w-full min-h-[500px] py-4 px-1 md:px-2 flex-shrink-0 snap-center">
      <div className="container mx-auto">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 px-2">{category} Top Picks</h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
            {[...Array(10)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {/* Infinite Scroll Trigger */}
            {displayCount < allFiltered.length && (
              <div ref={loadMoreRef} className="h-20 w-full flex items-center justify-center mt-4">
                 <div className="animate-pulse flex space-x-2">
                    <div className="w-2 h-2 bg-brand-green-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-brand-green-400 rounded-full animation-delay-200"></div>
                    <div className="w-2 h-2 bg-brand-green-400 rounded-full animation-delay-400"></div>
                 </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100 mx-2">
            <PackageSearch className="h-12 w-12 text-brand-green-300 mb-3" />
            <p className="font-bold text-gray-700">No deals found for {category}</p>
            <p className="text-sm text-gray-400 mt-1">Sellers will list items here soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
