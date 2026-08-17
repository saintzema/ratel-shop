"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function FloatingWhatsApp() {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const pathname = usePathname();

  // Don't show on checkout pages or admin pages
  const isHidden = pathname?.startsWith('/checkout') || pathname?.startsWith('/admin') || pathname?.startsWith('/seller');

  useEffect(() => {
    // Delay render so it doesn't overlap Ziva AI's initial greeting
    const timer = setTimeout(() => {
        setIsVisible(true);
        // Show tooltip automatically after a few seconds, then hide
        setTimeout(() => setShowTooltip(true), 3000);
        setTimeout(() => setShowTooltip(false), 10000);
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  if (isHidden) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 50 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          drag="y"
          dragConstraints={{ top: -500, bottom: 50 }}
          dragElastic={0.1}
          dragMomentum={false}
          className="fp-floating-widget fixed bottom-40 right-4 md:bottom-24 md:right-8 z-[1010] touch-none"
        >
          <div className="relative group">
            {/* Automatic Tooltip */}
            <AnimatePresence>
                {showTooltip && (
                    <motion.div 
                        initial={{ opacity: 0, x: 20, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.8 }}
                        className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-gray-800 text-[11px] font-bold py-2.5 px-4 rounded-2xl shadow-2xl border border-gray-100 whitespace-nowrap flex items-center gap-2"
                    >
                        <span>Need help? Chat with us! 👋</span>
                        <button onClick={() => setShowTooltip(false)} className="hover:text-red-500 transition-colors">
                            <X className="h-3 w-3" />
                        </button>
                        <div className="absolute top-1/2 left-full -translate-y-1/2 border-8 border-transparent border-l-white" />
                    </motion.div>
                )}
            </AnimatePresence>

            <a
              href="https://wa.me/message/3NZESSNRD2RMP1"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 bg-[#25D366] text-white rounded-full shadow-[0_8px_30px_rgba(37,211,102,0.4)] border-2 border-white/20 hover:bg-[#1da851] transition-colors relative"
              aria-label="Chat with us on WhatsApp"
            >
              <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
              
              {/* Pulse Indicator */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400 border border-white"></span>
              </span>
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
