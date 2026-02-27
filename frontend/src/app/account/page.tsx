"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Package, User, CreditCard, Lock, MapPin, MessageSquare, Heart, List } from "lucide-react";

export default function AccountPage() {
    const cards = [
        {
            icon: Package,
            title: "Your Orders",
            desc: "Track, return, or buy things again",
            href: "/account/orders"
        },
        {
            icon: Lock,
            title: "Login & security",
            desc: "Edit login, name, and mobile number",
            href: "/account/profile"
        },
        {
            icon: User,
            title: "Prime / FairPrice Premium",
            desc: "View benefits and payment settings",
            href: "/account/premium"
        },
        {
            icon: MapPin,
            title: "Your Addresses",
            desc: "Edit addresses for orders and gifts",
            href: "/account/addresses"
        },
        {
            icon: CreditCard,
            title: "Your Payments",
            desc: "Manage payment methods and settings",
            href: "/account/payments"
        },
        {
            icon: Heart,
            title: "Your Lists",
            desc: "View, modify, and share your lists",
            href: "/account/lists"
        },
        {
            icon: MessageSquare,
            title: "Your Messages",
            desc: "View messages from sellers and FairPrice",
            href: "/account/messages"
        },
        {
            icon: List,
            title: "Archived Orders",
            desc: "View and manage archived orders",
            href: "/account/orders?filter=archived"
        }
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
                <h1 className="text-3xl font-normal mb-6 text-gray-900">Your Account</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cards.map((card, i) => (
                        <Link href={card.href} key={i} className="block group">
                            <div className="border border-gray-300 rounded-lg p-6 flex items-start gap-4 hover:bg-gray-50 transition-colors h-full">
                                <div className="bg-gray-100 p-3 rounded-full group-hover:bg-brand-green-100 group-hover:text-brand-green-700 transition-colors">
                                    <card.icon className="h-8 w-8 text-gray-500 group-hover:text-brand-green-700" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-normal text-gray-900 group-hover:underline decoration-brand-orange">{card.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
