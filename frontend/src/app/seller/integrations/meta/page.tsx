"use client";

import { useState } from "react";
import { MessageCircle, Settings, Users, BarChart3, HelpCircle, ArrowLeft, RefreshCw, Send, Image as ImageIcon, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function MetaBusinessSuite() {
    const [activeTab, setActiveTab] = useState<"inbox" | "automation" | "ads" | "settings">("inbox");

    // Mock conversations
    const [conversations] = useState([
        { id: 1, name: "Jessica Taylor", platform: "instagram", lastMessage: "Is this dress available in small?", time: "10m ago", unread: true },
        { id: 2, name: "David O.", platform: "whatsapp", lastMessage: "I've sent the payment receipt.", time: "1h ago", unread: false },
        { id: 3, name: "Sarah Williams", platform: "instagram", lastMessage: "Can you deliver to Abuja tomorrow?", time: "2h ago", unread: false },
    ]);

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Navigation */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/seller/integrations">
                            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full hover:bg-gray-100">
                                <ArrowLeft className="h-5 w-5 text-gray-700" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Meta Business Suite</h1>
                                <span className="bg-[#E7F3FF] text-[#1877F2] font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full">Connected</span>
                            </div>
                            <p className="text-sm font-medium text-gray-500 mt-1">Manage your Instagram &amp; WhatsApp Presence seamlessly.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="h-10 border-gray-200 text-gray-600 rounded-xl font-bold shadow-sm">
                            <RefreshCw className="h-4 w-4 mr-2" /> Sync DMs
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-0">
                    {[
                        { id: "inbox", label: "Unified Inbox", icon: MessageCircle },
                        { id: "automation", label: "Auto Reply", icon: Zap },
                        { id: "ads", label: "Lead Ads", icon: Users },
                        { id: "settings", label: "Connection settings", icon: Settings },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2",
                                activeTab === tab.id
                                    ? "border-[#1877F2] text-[#1877F2]"
                                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-t-xl"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Contents */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
                {activeTab === "inbox" && (
                    <div className="flex h-[600px] flex-col md:flex-row">
                        {/* Conversation List */}
                        <div className="w-full md:w-80 border-r border-gray-100 flex flex-col">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                                <input
                                    type="text"
                                    placeholder="Search messages..."
                                    className="w-full h-10 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-[#1877F2]"
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#FAFAFA]">
                                {conversations.map(conv => (
                                    <button key={conv.id} className="w-full text-left p-3 rounded-xl hover:bg-gray-100/80 transition-colors flex items-start gap-3 relative group">
                                        <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white font-black shadow-sm ${conv.platform === 'whatsapp' ? 'bg-[#25D366]' : 'bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#405DE6]'}`}>
                                            {conv.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className={`text-sm font-bold truncate ${conv.unread ? 'text-gray-900' : 'text-gray-700'}`}>{conv.name}</span>
                                                <span className="text-[10px] font-bold text-gray-400">{conv.time}</span>
                                            </div>
                                            <p className={`text-xs truncate ${conv.unread ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                                                {conv.lastMessage}
                                            </p>
                                        </div>
                                        {conv.unread && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 bg-[#1877F2] rounded-full" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 flex flex-col bg-white">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#405DE6] flex items-center justify-center text-white font-black shadow-sm">
                                        J
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">Jessica Taylor <span className="text-[10px] text-gray-400 font-medium ml-1">@jess_taylor</span></h3>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Instagram Direct</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 p-6 overflow-y-auto bg-[#F0F2F5] flex flex-col gap-4">
                                <div className="flex justify-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-200/50 px-3 py-1 rounded-full">Today</span>
                                </div>
                                <div className="flex gap-3 max-w-[80%]">
                                    <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
                                    <div className="bg-white p-3.5 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
                                        <p className="text-sm text-gray-800">Hi, I saw your post about the new summer collection. Is the floral dress available in small?</p>
                                        <span className="text-[9px] text-gray-400 font-bold mt-2 block">10:42 AM</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-white border-t border-gray-100">
                                <div className="flex items-end gap-2 bg-gray-50 p-2 border border-gray-200 rounded-2xl">
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-gray-400 hover:text-gray-600 shrink-0">
                                        <ImageIcon className="h-5 w-5" />
                                    </Button>
                                    <textarea
                                        placeholder="Type a message..."
                                        className="w-full bg-transparent resize-none max-h-32 min-h-[40px] focus:outline-none text-sm font-medium py-2.5"
                                        rows={1}
                                    />
                                    <Button className="h-10 px-5 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold shrink-0 shadow-md">
                                        <Send className="h-4 w-4 mr-2" /> Send
                                    </Button>
                                </div>
                                <p className="text-[10px] text-center text-gray-400 font-bold mt-2">DMs are powered by Meta Graph API. Messages sync instantly.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "automation" && (
                    <div className="p-8 max-w-3xl">
                        <h2 className="text-xl font-black text-gray-900 mb-6">Automated Responses</h2>

                        <div className="space-y-6">
                            <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">Instant Greeting</h3>
                                        <p className="text-xs text-gray-500 mt-1">Reply instantly when someone messages you for the first time.</p>
                                    </div>
                                    <div className="w-12 h-6 bg-[#1877F2] rounded-full relative cursor-pointer opacity-50">
                                        <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow-sm" />
                                    </div>
                                </div>
                                <textarea
                                    defaultValue="Hi there! Thanks for reaching out to our store. We typically reply within a few hours. How can we help you today?"
                                    className="w-full p-4 rounded-xl border border-gray-200 text-sm mt-2 focus:border-[#1877F2] outline-none"
                                    rows={3}
                                />
                                <div className="flex justify-end mt-3">
                                    <Button size="sm" className="bg-gray-900 hover:bg-black text-white font-bold rounded-lg px-6">Save</Button>
                                </div>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">Away Message</h3>
                                        <p className="text-xs text-gray-500 mt-1">Send when you're marked as away or outside business hours.</p>
                                    </div>
                                    <div className="w-12 h-6 bg-gray-300 rounded-full relative cursor-pointer">
                                        <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1 shadow-sm" />
                                    </div>
                                </div>
                                <textarea
                                    disabled
                                    defaultValue="We are currently away. We will get back to you during our business hours (Mon-Fri 9AM - 6PM)."
                                    className="w-full p-4 rounded-xl border border-gray-200 text-sm mt-2 bg-gray-100/50 text-gray-500"
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "ads" && (
                    <div className="p-16 flex flex-col items-center justify-center text-center">
                        <div className="h-20 w-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-6 shadow-indigo-600/10 shadow-lg border border-indigo-100">
                            <Users className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Lead Generation Ads</h2>
                        <p className="text-gray-500 max-w-md mt-3 mb-8">
                            Create Instagram & Facebook ads directly from your store catalog. Route traffic straight to your FairPrice storefront and manage leads here.
                        </p>
                        <Button className="h-12 px-8 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold shadow-lg shadow-[#1877F2]/20">
                            Create First Campaign
                        </Button>
                    </div>
                )}

                {activeTab === "settings" && (
                    <div className="p-8 max-w-2xl">
                        <h2 className="text-xl font-black text-gray-900 mb-6">Integration Status</h2>
                        <div className="bg-white border text-sm font-medium border-gray-200 rounded-2xl divide-y divide-gray-100 shadow-sm">
                            <div className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <span className="text-gray-600 font-bold">Instagram Account</span>
                                <span className="text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Connected</span>
                            </div>
                            <div className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <span className="text-gray-600 font-bold">WhatsApp Business API</span>
                                <span className="text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Connected</span>
                            </div>
                            <div className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <span className="text-gray-600 font-bold">Meta Business Portfolio</span>
                                <span className="text-gray-900">FairPrice Merchants LLC</span>
                            </div>
                            <div className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <span className="text-gray-600 font-bold">API Permissions</span>
                                <span className="text-indigo-600 cursor-pointer">View Grants</span>
                            </div>
                        </div>
                        <div className="mt-8 pt-8 border-t border-gray-100">
                            <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-bold h-12 px-6 rounded-xl">
                                Disconnect Meta Integration
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Add the missing icon export locally since it wasn't in the standard import
function CheckCircle2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
