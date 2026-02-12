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
        <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-24 right-0 w-[calc(100vw-2rem)] md:w-96 h-[80vh] max-h-[600px] glass-card flex flex-col overflow-hidden shadow-2xl pointer-events-auto rounded-3xl"
                    >
                        {/* 3D Animated Header */}
                        <div className="relative h-40 bg-gradient-to-b from-ratel-green-900 to-black overflow-hidden flex items-center justify-center shrink-0">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>

                            {/* Ziva Avatar Container */}
                            <motion.div
                                className="relative w-24 h-24"
                                animate={{ y: [0, -2, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <motion.img
                                    src="/assets/images/image_v2.png"
                                    alt="Ziva AI"
                                    className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                                    style={{
                                        rotateX: mousePos.y * 5,
                                        rotateY: mousePos.x * 5,
                                    }}
                                />
                            </motion.div>

                            <button onClick={toggleChat} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/70 hover:text-white transition-all backdrop-blur-sm">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* AI Status - Simplified */}
                        <div className="bg-black/50 backdrop-blur text-[10px] text-white px-4 py-1.5 flex items-center gap-2 border-b border-white/10 shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                            <span className="font-bold tracking-wider">ZIVA ONLINE</span>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={messagesAreaRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md scroll-smooth"
                        >
                            {messages.map(msg => (
                                <div key={msg.id} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
                                    <div
                                        className={cn(
                                            "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                                            msg.role === "user"
                                                ? "bg-ratel-green-600 text-white rounded-br-none"
                                                : "bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-zinc-700 rounded-bl-none"
                                        )}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-3 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 flex gap-2 shrink-0">
                            <Input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSend()}
                                placeholder="Ask Ziva..."
                                className="flex-1 text-sm rounded-full bg-gray-100 dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-900 transition-all h-10 px-4"
                            />
                            <Button size="icon" className="rounded-full bg-ratel-green-600 hover:bg-ratel-green-700 h-10 w-10 shadow-lg" onClick={handleSend}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={false}
                animate={{ scale: isOpen ? 0 : 1, opacity: isOpen ? 0 : 1 }}
                whileHover={{ scale: 1.05 }}
                className="pointer-events-auto"
            >
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleChat}
                    className="h-14 w-14 md:h-16 md:w-16 rounded-full glass border-2 border-white/50 flex items-center justify-center group relative shadow-2xl overflow-hidden"
                >
                    <span className="absolute inset-0 bg-ratel-green-600 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    <img src="/assets/images/image_v2.png" className="w-full h-full object-cover z-10 scale-110" />
                </motion.button>
            </motion.div>
        </div>
    );
}
