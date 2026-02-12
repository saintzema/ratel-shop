"use client";

import { useMemo, useState } from "react";
import { Review } from "@/lib/types";
import { DEMO_REVIEWS } from "@/lib/data";
import { Star, ThumbsUp, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ReviewList({ productId }: { productId: string }) {
    // Filter reviews for this product
    const reviews = useMemo(() => DEMO_REVIEWS.filter(r => r.product_id === productId), [productId]);

    // Basic rating breakdown calculation
    const breakdown = useMemo(() => {
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => counts[r.rating as keyof typeof counts]++);
        return counts;
    }, [reviews]);

    const totalReviews = reviews.length;

    if (totalReviews === 0) return (
        <div className="text-center py-8 text-gray-500">
            No reviews yet. Be the first to review this product!
        </div>
    );

    return (
        <div className="space-y-8">
            <h2 className="font-bold text-xl">Customer Reviews</h2>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Rating Breakdown */}
                <div className="w-full md:w-1/3 space-y-2">
                    {[5, 4, 3, 2, 1].map(star => (
                        <div key={star} className="flex items-center gap-2 text-sm">
                            <span className="w-12 text-blue-600 hover:underline cursor-pointer">{star} star</span>
                            <div className="flex-1 h-4 bg-gray-200 rounded-sm overflow-hidden border border-gray-300">
                                <div
                                    className="h-full bg-yellow-400 border-r border-yellow-500"
                                    style={{ width: `${(breakdown[star as keyof typeof breakdown] / totalReviews) * 100}%` }}
                                />
                            </div>
                            <span className="w-8 text-right text-gray-500">
                                {Math.round((breakdown[star as keyof typeof breakdown] / totalReviews) * 100)}%
                            </span>
                        </div>
                    ))}
                </div>

                {/* Review List */}
                <div className="flex-1 space-y-6">
                    {reviews.map(review => (
                        <div key={review.id} className="pb-6 border-b dark:border-zinc-800 last:border-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                    {review.user_name.charAt(0)}
                                </div>
                                <span className="font-medium text-sm">{review.user_name}</span>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex text-yellow-400">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-current" : "text-gray-300"}`} />
                                    ))}
                                </div>
                                <span className="font-bold text-sm">{review.title}</span>
                            </div>

                            <div className="text-xs text-gray-500 mb-2">
                                Reviewed on {new Date(review.created_at).toLocaleDateString()}
                                {review.verified_purchase && (
                                    <span className="ml-2 text-ratel-orange font-bold hover:text-amber-600 cursor-pointer">Verified Purchase</span>
                                )}
                            </div>

                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                {review.body}
                            </p>

                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-gray-500 hover:text-gray-700">
                                    Helpful
                                </Button>
                                <span>|</span>
                                <span className="cursor-pointer hover:underline">Report abuse</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
