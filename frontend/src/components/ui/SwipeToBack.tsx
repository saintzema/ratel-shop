"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function SwipeToBack() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        let startX: number | null = null;
        let startY: number | null = null;

        const handleTouchStart = (e: TouchEvent) => {
            // Only care about edge swipes (within 30px of the left edge)
            if (e.touches[0].clientX > 30) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (startX === null || startY === null) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;

            const diffX = currentX - startX;
            const diffY = Math.abs(currentY - startY);

            // If we swipe right significantly more than we swipe up/down
            if (diffX > 50 && diffY < 30) {
                // Trigger navigation and reset
                if (pathname === "/") {
                    router.push("/categories");
                } else {
                    router.back();
                }

                startX = null;
                startY = null;
            }
        };

        const handleTouchEnd = () => {
            startX = null;
            startY = null;
        };

        window.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchmove", handleTouchMove, { passive: true });
        window.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [router, pathname]);

    return null; // This is a logic-only component
}
