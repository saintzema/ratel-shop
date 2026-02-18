"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Seller } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, AlertTriangle, Send, MessageCircle, CheckCircle2 } from "lucide-react";

interface ContactSellerModalProps {
    isOpen: boolean;
    onClose: () => void;
    seller: Seller;
}

// ── AI Content Filter ──────────────────────────────────────
// Detects and blocks personal contact info to keep transactions on-platform
const BLOCKED_PATTERNS = [
    // Phone numbers (various formats)
    { pattern: /(\+?\d{1,4}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g, label: "phone number" },
    { pattern: /\b0[789]\d{9}\b/g, label: "Nigerian phone number" },
    // WhatsApp
    { pattern: /\bwhats\s*app\b/gi, label: "WhatsApp reference" },
    { pattern: /\bwa\.me\b/gi, label: "WhatsApp link" },
    // Email addresses
    { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: "email address" },
    // Social media handles
    { pattern: /\b@[a-zA-Z0-9_.]{2,30}\b/g, label: "social media handle" },
    { pattern: /\b(instagram|ig|insta|facebook|fb|twitter|x\.com|tiktok|telegram|snapchat|linkedin)\b/gi, label: "social media reference" },
    // URLs
    { pattern: /https?:\/\/[^\s]+/gi, label: "URL/link" },
    { pattern: /\bwww\.[^\s]+/gi, label: "URL/link" },
];

function filterMessage(text: string): { isClean: boolean; blockedTypes: string[] } {
    const blockedTypes: string[] = [];
    for (const { pattern, label } of BLOCKED_PATTERNS) {
        // Reset lastIndex for global patterns
        pattern.lastIndex = 0;
        if (pattern.test(text)) {
            if (!blockedTypes.includes(label)) {
                blockedTypes.push(label);
            }
        }
    }
    return { isClean: blockedTypes.length === 0, blockedTypes };
}

export function ContactSellerModal({ isOpen, onClose, seller }: ContactSellerModalProps) {
    const { user } = useAuth();
    const [message, setMessage] = useState("");
    const [category, setCategory] = useState<string>("general");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [filterWarning, setFilterWarning] = useState<string | null>(null);

    const categories = [
        { value: "general", label: "General Inquiry" },
        { value: "product", label: "Product Question" },
        { value: "shipping", label: "Shipping & Delivery" },
        { value: "bulk", label: "Bulk Order" },
        { value: "returns", label: "Returns & Refunds" },
    ];

    const handleMessageChange = (text: string) => {
        setMessage(text);
        // Real-time filter check
        if (text.length > 5) {
            const { isClean, blockedTypes } = filterMessage(text);
            if (!isClean) {
                setFilterWarning(`Sharing ${blockedTypes.join(", ")} is not allowed. All communication must stay on RatelShop for your protection.`);
            } else {
                setFilterWarning(null);
            }
        } else {
            setFilterWarning(null);
        }
    };

    const handleSend = async () => {
        if (!message.trim()) return;

        const { isClean, blockedTypes } = filterMessage(message);
        if (!isClean) {
            setFilterWarning(`Cannot send: message contains ${blockedTypes.join(", ")}. Please remove personal contact information.`);
            return;
        }

        setSending(true);

        // Save message to localStorage
        const msgKey = "ratel_seller_messages";
        const existing = JSON.parse(localStorage.getItem(msgKey) || "[]");
        existing.push({
            id: `msg_${Date.now()}`,
            seller_id: seller.id,
            seller_name: seller.business_name,
            sender_id: user?.email || "guest",
            sender_name: user?.name || "Guest",
            category,
            message: message.trim(),
            timestamp: new Date().toISOString(),
            read: false,
        });
        localStorage.setItem(msgKey, JSON.stringify(existing));

        await new Promise(r => setTimeout(r, 800));
        setSending(false);
        setSent(true);
    };

    const handleClose = () => {
        setMessage("");
        setCategory("general");
        setSent(false);
        setFilterWarning(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[480px] bg-white text-black border-zinc-200">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <MessageCircle className="h-5 w-5 text-ratel-green-600" />
                        Contact {seller.business_name}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        Send a message to this seller. All conversations stay on RatelShop for your safety.
                    </DialogDescription>
                </DialogHeader>

                {sent ? (
                    <div className="py-8 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        </div>
                        <h3 className="font-bold text-lg">Message Sent!</h3>
                        <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                            {seller.business_name} typically responds within 1 hour. You'll receive a notification when they reply.
                        </p>
                        <Button onClick={handleClose} className="rounded-full px-8 bg-ratel-green-600 hover:bg-ratel-green-700 text-white">
                            Done
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        {/* Seller info */}
                        <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ratel-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                                {seller.business_name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-sm">{seller.business_name}</p>
                                <p className="text-xs text-zinc-500">Usually responds within 1 hour</p>
                            </div>
                            <ShieldCheck className="h-5 w-5 text-blue-500" />
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-zinc-400">Category</label>
                            <div className="flex flex-wrap gap-1.5">
                                {categories.map(cat => (
                                    <button
                                        key={cat.value}
                                        onClick={() => setCategory(cat.value)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${category === cat.value
                                                ? "bg-ratel-green-600 text-white"
                                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                            }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Message */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-zinc-400">Your Message</label>
                            <Textarea
                                value={message}
                                onChange={e => handleMessageChange(e.target.value)}
                                placeholder="Hi, I'm interested in your product. Can you tell me more about..."
                                className="min-h-[120px] rounded-xl border-zinc-200 focus:border-ratel-green-500 focus:ring-ratel-green-500/20 resize-none"
                                maxLength={1000}
                            />
                            <p className="text-[10px] text-zinc-400 text-right">{message.length}/1000</p>
                        </div>

                        {/* Filter warning */}
                        {filterWarning && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-amber-800 text-xs font-medium">{filterWarning}</p>
                            </div>
                        )}

                        {/* Safety notice */}
                        <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-xl text-xs text-blue-700">
                            <ShieldCheck className="h-4 w-4 shrink-0" />
                            <span>For your safety, sharing phone numbers, emails, or social media handles is not permitted.</span>
                        </div>

                        {/* Send */}
                        <Button
                            onClick={handleSend}
                            disabled={!message.trim() || sending || !!filterWarning}
                            className="w-full rounded-xl h-11 bg-ratel-green-600 hover:bg-ratel-green-700 text-white font-bold"
                        >
                            {sending ? (
                                <>Sending...</>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Message
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
