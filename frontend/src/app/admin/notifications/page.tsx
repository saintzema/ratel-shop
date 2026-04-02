"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Send, CheckCircle2, Clock, Smartphone, Edit3, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationTemplate {
    id: string;
    title: string;
    body: string;
    time: string;
}

const DEFAULT_TEMPLATES: NotificationTemplate[] = [
    { id: "morning_alert", title: "Morning Deals 🌅", body: "Wake up to fresh discounts! Tap to see what's on sale today.", time: "07:45 AM" },
    { id: "midday_alert", title: "Lunchtime Check-in 🍽️", body: "Taking a break? Browse our trending items right now.", time: "12:30 PM" },
    { id: "evening_alert", title: "Evening Wind Down 🌙", body: "Relax and shop. Grab your favorites before they sell out!", time: "06:00 PM" },
    { id: "weekend_alert", title: "Weekend Special 🎉", body: "Happy Weekend! Extra 10% off selected categories.", time: "Saturday 10:00 AM" }
];

export default function AdminPushNotifications() {
    const { user, isMounted } = useAuth();
    const router = useRouter();

    // Broadcast State
    const [broadcastTitle, setBroadcastTitle] = useState("");
    const [broadcastBody, setBroadcastBody] = useState("");
    const [broadcastLink, setBroadcastLink] = useState("/");
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [broadcastSuccess, setBroadcastSuccess] = useState(false);

    // Automation Templates State
    const [templates, setTemplates] = useState<NotificationTemplate[]>(DEFAULT_TEMPLATES);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<NotificationTemplate>>({});

    useEffect(() => {
        if (!isMounted) return;
        if (!user || user.role !== "admin") {
            router.push("/");
            return;
        }

        // Load saved templates from localStorage (simulating DB for now)
        const saved = localStorage.getItem("fp_admin_notification_templates");
        if (saved) {
            try {
                setTemplates(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse templates", e);
            }
        }
    }, [user, isMounted, router]);

    const handleBroadcast = () => {
        if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
        
        setIsBroadcasting(true);
        // Simulate network delay for real-world feel
        setTimeout(() => {
            // Dispatch a global event that `usePushNotifications` hook will listen to!
            const event = new CustomEvent("fp-admin-broadcast", {
                detail: { title: broadcastTitle, body: broadcastBody, link: broadcastLink }
            });
            window.dispatchEvent(event);

            setIsBroadcasting(false);
            setBroadcastSuccess(true);
            setBroadcastTitle("");
            setBroadcastBody("");
            
            setTimeout(() => setBroadcastSuccess(false), 3000);
        }, 800);
    };

    const handleSaveTemplate = (id: string) => {
        const updated = templates.map(t => {
            if (t.id === id) {
                return { ...t, ...editForm };
            }
            return t;
        });
        setTemplates(updated);
        localStorage.setItem("fp_admin_notification_templates", JSON.stringify(updated));
        setEditingTemplateId(null);

        // Notify app to reload templates
        window.dispatchEvent(new Event("fp-templates-updated"));
    };

    if (!isMounted || !user || user.role !== "admin") return null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Push Notifications Center</h1>
                    <p className="text-sm text-gray-500 mt-1">Control automated alerts and send manual broadcasts to users' devices.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Manual Broadcast Panel */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                            <Send className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Live Broadcast</h2>
                            <p className="text-xs text-gray-500">Send an immediate push notification to all active devices.</p>
                        </div>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Notification Title</label>
                            <Input 
                                placeholder="e.g. Flash Sale Alert! ⚡" 
                                value={broadcastTitle}
                                onChange={(e) => setBroadcastTitle(e.target.value)}
                                className="border-gray-300 focus:border-brand-orange focus:ring-brand-orange/20"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Message Body</label>
                            <textarea 
                                placeholder="e.g. Get 50% off all Electronics for the next 2 hours only!" 
                                value={broadcastBody}
                                onChange={(e) => setBroadcastBody(e.target.value)}
                                rows={3}
                                className="w-full rounded-xl border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none resize-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Action Link (Optional)</label>
                            <Input 
                                placeholder="e.g. /category/electronics" 
                                value={broadcastLink}
                                onChange={(e) => setBroadcastLink(e.target.value)}
                                className="border-gray-300 focus:border-brand-orange focus:ring-brand-orange/20"
                            />
                        </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-gray-100">
                        <Button 
                            onClick={handleBroadcast}
                            disabled={isBroadcasting || !broadcastTitle.trim() || !broadcastBody.trim()}
                            className="w-full h-12 rounded-xl bg-black hover:bg-gray-900 text-white font-bold flex items-center justify-center gap-2"
                        >
                            {isBroadcasting ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : broadcastSuccess ? (
                                <>
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    Broadcast Sent Successfully!
                                </>
                            ) : (
                                <>
                                    <Bell className="w-5 h-5 fill-white/20" />
                                    Send Push Notification Now
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Automated Templates Panel */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Automated Schedules</h2>
                            <p className="text-xs text-gray-500">Manage the copy for daily recurring push notifications.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {templates.map(template => {
                            const isEditing = editingTemplateId === template.id;
                            return (
                                <div key={template.id} className="border border-gray-100 rounded-xl p-4 transition-all hover:border-gray-200 bg-gray-50/50">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                {template.time}
                                            </span>
                                        </div>
                                        {isEditing ? (
                                            <button 
                                                onClick={() => handleSaveTemplate(template.id)}
                                                className="text-emerald-600 hover:text-emerald-700 font-bold text-xs flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md"
                                            >
                                                <Save className="w-3.5 h-3.5" /> Save
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => {
                                                    setEditingTemplateId(template.id);
                                                    setEditForm({ title: template.title, body: template.body });
                                                }}
                                                className="text-gray-400 hover:text-brand-orange transition-colors"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    
                                    {isEditing ? (
                                        <div className="space-y-2 mt-2">
                                            <Input 
                                                value={editForm.title} 
                                                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                                className="h-8 text-sm font-bold border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                                            />
                                            <textarea 
                                                value={editForm.body}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, body: e.target.value }))}
                                                rows={2}
                                                className="w-full rounded-lg border-emerald-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">{template.title}</h4>
                                            <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{template.body}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-bold text-blue-900">How Push Notifications Work</h4>
                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                        Users must have the RatelShop PWA installed on their Android or iOS device and opted-in to receive notifications. Price drop alerts are handled automatically by the system whenever a seller updates an item in a user's cart or favorites.
                    </p>
                </div>
            </div>
        </div>
    );
}
