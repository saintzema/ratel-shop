"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, Sparkles, ShoppingBag, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    type?: "text" | "product-card";
    metadata?: any;
}

export function ZivaChat() {
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hello! I'm Ziva, your personal shopping assistant. I can help you find fair prices, detect scams, or recommend products. How can I help you today?"
        }
    ]);
    const [input, setInput] = useState("");
    const messagesAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleChat = () => setIsOpen(!isOpen);

    const scrollToBottom = () => {
        if (messagesAreaRef.current) {
            messagesAreaRef.current.scrollTo({
                top: messagesAreaRef.current.scrollHeight,
                behavior: "smooth"
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            // Short delay to ensure the window has opened before scrolling
            const timer = setTimeout(scrollToBottom, 100);
            return () => clearTimeout(timer);
        }
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");

        // Mock AI Response
        setTimeout(() => {
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "I'm analyzing market prices for you... This item seems to be priced fairly compared to other sellers."
            };
            setMessages(prev => [...prev, aiMsg]);
        }, 1000);
    };

    // Mouse tracking logic for 3D effect (only on mounted)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    useEffect(() => {
        if (!mounted) return;
        const handleMouseMove = (e: MouseEvent) => {
            // Calculate normalized mouse position (-1 to 1)
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = (e.clientY / window.innerHeight) * 2 - 1;
            setMousePos({ x, y });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mounted]);

    if (!mounted) return null;

    return (
        <div className="fixed bottom-8 right-8 z-[9999] pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-20 right-0 w-80 md:w-96 max-h-[600px] glass-card flex flex-col overflow-hidden shadow-2xl pointer-events-auto"
                    >
                        {/* 3D Animated Header */}
                        <div className="relative h-48 bg-gradient-to-b from-ratel-green-900 to-black overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>

                            {/* Ziva Avatar Container */}
                            <motion.div
                                className="relative w-32 h-32"
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <motion.img
                                    src="/assets/images/image_v2.png"
                                    alt="Ziva AI"
                                    className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                                    style={{
                                        rotateX: mousePos.y * 10,
                                        rotateY: mousePos.x * 10,
                                    }}
                                />
                            </motion.div>

                            <button onClick={toggleChat} className="absolute top-4 right-4 text-white/50 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* AI Status */}
                        <div className="bg-black/50 backdrop-blur text-[10px] text-white px-4 py-1 flex items-center gap-2 border-b border-white/10">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                            <span className="font-mono">Ziva_Core_v2.0 :: ONLINE</span>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={messagesAreaRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/80 dark:bg-black/80 backdrop-blur-md scroll-smooth"
                            style={{ height: '350px' }}
                        >
                            {messages.map(msg => (
                                <div key={msg.id} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
                                    <div
                                        className={cn(
                                            "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                                            msg.role === "user"
                                                ? "bg-ratel-green-600 text-white rounded-br-none shadow-md"
                                                : "bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 border border-black/5 dark:border-white/10 rounded-bl-none shadow-sm"
                                        )}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-white dark:bg-zinc-900 border-t dark:border-zinc-800 flex gap-2">
                            <Input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSend()}
                                placeholder="Ask Ziva about prices..."
                                className="flex-1 text-sm rounded-full bg-muted border-none"
                            />
                            <Button size="icon" className="rounded-full bg-ratel-green-600 hover:bg-ratel-green-700 h-10 w-10" onClick={handleSend}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={false}
                animate={{ scale: isOpen ? 0.85 : 1 }}
                whileHover={{ scale: isOpen ? 0.9 : 1.05 }}
                className="pointer-events-auto"
            >
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleChat}
                    className="h-16 w-16 md:h-20 md:w-20 rounded-full glass border-2 border-white/50 flex items-center justify-center group relative shadow-2xl"
                >
                    <span className="absolute inset-0 rounded-full bg-ratel-green-600 opacity-80 blur-lg group-hover:opacity-100 animate-pulse transition-opacity"></span>
                    <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white flex items-center justify-center bg-black">
                        <img src="/assets/images/image_v2.png" className="w-full h-full object-cover" />
                    </div>

                    {/* Speech Bubble CTA */}
                    <AnimatePresence>
                        {!isOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5, x: 20, y: -20 }}
                                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                                transition={{ delay: 2, type: "spring", stiffness: 260, damping: 20 }}
                                className="absolute bottom-[110%] right-0 mb-4 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm px-5 py-2.5 rounded-2xl shadow-2xl whitespace-nowrap border border-ratel-green-200"
                            >
                                <div className="font-bold text-ratel-green-600 flex items-center gap-1.5 mb-0.5">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Meet Ziva
                                </div>
                                <div className="text-xs opacity-90 text-foreground">Chat with me for easy shopping! ✨</div>

                                {/* Speech bubble tail */}
                                <div className="absolute top-[90%] right-8 -translate-y-1/2 border-8 border-transparent border-t-white dark:border-t-zinc-800"></div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>
            </motion.div>
        </div>
    );
}
