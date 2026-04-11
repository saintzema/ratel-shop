"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlansRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/seller/settings/billing");
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
    );
}
