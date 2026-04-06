"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav 
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center px-4 py-2.5 rounded-2xl w-fit",
        "bg-white/40 backdrop-blur-xl backdrop-saturate-150", 
        "border border-white/40 shadow-sm shadow-black/5",
        className
      )}
    >
      <ol className="flex items-center gap-2 list-none m-0 p-0">
        <li className="flex items-center">
          <Link 
            href="/" 
            className="text-gray-500 hover:text-emerald-700 transition-colors flex items-center p-1 rounded-lg hover:bg-white/30"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <ChevronRight className="h-3 w-3 text-gray-400/60 shrink-0" />
            {item.href && !item.active ? (
              <Link
                href={item.href}
                className="text-[12px] font-bold text-gray-500 hover:text-emerald-700 transition-colors px-2 py-1 rounded-lg hover:bg-white/30 whitespace-nowrap"
              >
                {item.label}
              </Link>
            ) : (
              <span 
                className={cn(
                  "text-[12px] font-black px-2 py-1 rounded-lg whitespace-nowrap",
                  item.active ? "text-emerald-700 bg-emerald-50/50" : "text-gray-400"
                )}
                aria-current={item.active ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
