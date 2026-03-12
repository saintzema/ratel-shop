import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-zinc-200/60 dark:bg-zinc-800/60", className)}
            {...props}
        />
    );
}

// Apple-style Card Skeleton
export function ProductCardSkeleton() {
    return (
        <div className="flex flex-col gap-3 w-full bg-white rounded-2xl p-3 border border-zinc-100 shadow-sm animate-pulse">
            <Skeleton className="w-full aspect-[4/5] rounded-xl" />
            <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
            </div>
            <div className="flex justify-between items-center pt-1">
                <Skeleton className="h-5 w-1/3 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
        </div>
    );
}
