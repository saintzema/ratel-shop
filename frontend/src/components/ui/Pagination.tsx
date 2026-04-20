"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
  onItemsPerPageChange?: (items: number) => void;
  type?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  onItemsPerPageChange,
  type = "items",
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 bg-gray-50/30", className)}>
      <div className="flex items-center gap-4">
        {totalItems !== undefined && itemsPerPage !== undefined && (
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} {type}
          </div>
        )}
        
        {onItemsPerPageChange && itemsPerPage !== undefined && (
          <>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
              Rows:
              <select 
                value={itemsPerPage} 
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                className="bg-transparent text-indigo-600 font-black outline-none cursor-pointer"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <div className="hidden md:flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-black transition-all",
                  currentPage === pageNum 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                    : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-indigo-200"
                )}
              >
                {pageNum}
              </button>
            );
          })}
          
          {totalPages > 5 && currentPage < totalPages - 2 && (
            <>
              <span className="text-gray-400 px-1">...</span>
              <button
                onClick={() => onPageChange(totalPages)}
                className="w-8 h-8 rounded-lg text-xs font-black bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all active:scale-95"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
