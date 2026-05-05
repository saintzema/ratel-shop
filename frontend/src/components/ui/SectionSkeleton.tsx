"use client";

import { cn } from "@/lib/utils";

interface SectionSkeletonProps {
  className?: string;
  rows?: number;
  height?: string;
}

export function SectionSkeleton({ className, rows = 4, height }: SectionSkeletonProps) {
  return (
    <div 
      className={cn("animate-pulse space-y-4 w-full bg-gray-50/50 rounded-3xl p-8 border border-gray-100/50", className)}
      style={height ? { height } : undefined}
    >
      <div className="h-8 bg-gray-200 rounded-lg w-1/4 mb-8" />
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "h-4 bg-gray-100 rounded-full",
              i === rows - 1 ? "w-1/2" : i % 2 === 0 ? "w-full" : "w-3/4"
            )} 
          />
        ))}
      </div>
    </div>
  );
}

export function ImageSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("animate-pulse bg-gray-200 rounded-2xl w-full aspect-square", className)} />
    );
}

export function BuyBoxSkeleton() {
    return (
        <div className="animate-pulse space-y-6 border border-gray-100 rounded-xl p-5 bg-white shadow-sm">
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            <div className="h-10 bg-gray-200 rounded w-1/2" />
            <div className="h-12 bg-gray-200 rounded-2xl w-full" />
            <div className="h-12 bg-emerald-100 rounded-2xl w-full" />
        </div>
    );
}
