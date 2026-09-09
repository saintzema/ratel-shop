"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * Minimal rider↔driver chat, talking directly to the SAME durable
 * /api/conversations/threads table every other buyer↔seller chat in the app
 * uses (see /api/rides/[id]/offers/[offerId]/accept, which creates the
 * Conversation row). Kept self-contained rather than wired into the main
 * MessageBox popup, which carries a lot of negotiation/product-specific UI
 * that doesn't apply to a ride.
 */
export function RideChat({ conversationId }: { conversationId: string }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const authHeaders = (): Record<string, string> => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
    };

    const load = () => {
        fetch(`/api/conversations/threads?id=${conversationId}`, { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => setMessages(d?.conversation?.messages || []));
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, [conversationId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const send = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        const body = JSON.stringify({ conversationId, text, senderName: user?.name });
        setText("");
        try {
            await fetch("/api/conversations/threads", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body });
            load();
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-80 border border-gray-100 rounded-2xl overflow-hidden bg-white">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 && <p className="text-xs text-gray-400 text-center pt-8">Say hello and confirm your pickup spot.</p>}
                {messages.map((m: any) => (
                    <div key={m.id} className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.senderId === user?.id ? "ml-auto bg-brand-green-600 text-white" : "bg-gray-100 text-gray-800"}`}>
                        {m.text}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
            <div className="flex items-center gap-2 p-2 border-t border-gray-100">
                <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && send()}
                    placeholder="Message..."
                    className="flex-1 h-10 px-3 rounded-full bg-gray-100 text-sm outline-none"
                />
                <button onClick={send} disabled={sending} className="h-10 w-10 rounded-full bg-brand-green-600 text-white flex items-center justify-center shrink-0">
                    <Send className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
