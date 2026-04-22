"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, LayoutDashboard, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Admin panel error:", error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Page failed to load</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-sm leading-relaxed">
                An unexpected error occurred while rendering this admin page. Your data is safe — this is a display issue only.
            </p>
            <div className="flex gap-3">
                <Button
                    onClick={reset}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 font-bold flex items-center gap-2"
                >
                    <RefreshCw className="h-4 w-4" /> Try Again
                </Button>
                <Link href="/admin/dashboard">
                    <Button
                        variant="outline"
                        className="rounded-xl px-5 py-2.5 font-bold flex items-center gap-2 border-gray-200"
                    >
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Button>
                </Link>
            </div>
            {error.digest && (
                <p className="mt-6 text-xs text-gray-400 font-mono">Error: {error.digest}</p>
            )}
        </div>
    );
}
