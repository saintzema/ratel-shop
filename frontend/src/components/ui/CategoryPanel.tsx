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
      setDisplayCount(prev => prev + 15);
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
              const res = await fetch(`/api/products?category=${encodeURIComponent(category.toLowerCase())}&limit=50`);
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

          // Filter with Match Strength
          let filtered = allData.map(p => {
              if (catLower === "all") return { product: p, score: 100 };
              if (catLower === "trending") {
                  let score = 0;
                  if (p.is_trending) score = 100; // Admin explicitly set
                  else if (p.sold_count && p.sold_count > 100) score = 90; // High sales
                  else if (p.is_sponsored && p.avg_rating > 4.5) score = 80; // Highly rated sponsored
                  else if (p.sold_count && p.sold_count > 20) score = 50; // Medium sales
                  return { product: p, score };
              }
              if (catLower === "best-selling") {
                  let score = 0;
                  if (p.sold_count && p.sold_count > 50) score = 100;
                  else if (p.is_trending) score = 80;
                  else if (p.sold_count && p.sold_count > 10) score = 50;
                  return { product: p, score };
              }
              
              const pCat = p.category?.toLowerCase() || "";
              const pSub = p.subcategory?.toLowerCase() || "";
              const pName = p.name.toLowerCase();
              const pDesc = p.description?.toLowerCase() || "";
              
              let score = 0;
              for (const term of searchTerms) {
                  // Direct category/subcategory match is high priority
                  if (pCat === term || pSub === term) score = Math.max(score, 100);
                  else if (pCat.includes(term) || pSub.includes(term)) score = Math.max(score, 80);
                  // Name match is medium priority
                  else if (pName.includes(term)) score = Math.max(score, 60);
                  // Description match is lowest priority
                  else if (pDesc.includes(term)) score = Math.max(score, 30);
              }
              
              return { product: p, score };
          })
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score || (b.product.sold_count || 0) - (a.product.sold_count || 0))
          .map(item => item.product);
          
          setAllFiltered(filtered);
          // Initial slice: show at least 15 (requested 12, but 15 fits 5-col grid better)
          setProducts(filtered.slice(0, 15));
          setDisplayCount(15);
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
        <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                {category === "all" ? <Sparkles className="h-5 w-5 text-brand-green-500" /> : null}
                {category} Top Picks
            </h2>
            {allFiltered.length > products.length && (
                <span className="text-xs text-gray-400 font-medium">{allFiltered.length} items available</span>
            )}
        </div>

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
            
            {/* Infinite Scroll / Loading More Trigger */}
            {displayCount < allFiltered.length && (
              <div ref={loadMoreRef} className="py-12 w-full flex flex-col items-center justify-center gap-4">
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4 w-full">
                    {[...Array(5)].map((_, i) => (
                        <ProductCardSkeleton key={`skeleton-${i}`} />
                    ))}
                 </div>
                 <div className="animate-bounce mt-4">
                    <div className="w-2 h-2 bg-brand-green-400 rounded-full"></div>
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
