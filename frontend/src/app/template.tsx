"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Scroll to top on route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1], // Apple-style spring/ease
            }}
            className="flex-1 flex flex-col w-full h-full"
        >
            {children}
        </motion.div>
    );
}
