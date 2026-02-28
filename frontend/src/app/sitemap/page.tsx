"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const sections = [
    {
        title: "Company", links: [
            { label: "About FairPrice", href: "/about" },
            { label: "Affiliate & Influencer Program", href: "/affiliate" },
            { label: "Contact Us", href: "/contact" },
            { label: "Careers", href: "/careers" },
            { label: "Press & Media", href: "/press" },
        ]
    },
    {
        title: "Customer Service", links: [
            { label: "Return & Refund Policy", href: "/returns" },
            { label: "Intellectual Property Policy", href: "/ip-policy" },
            { label: "Shipping Information", href: "/shipping" },
            { label: "Report Suspicious Activity", href: "/report" },
        ]
    },
    {
        title: "Help", links: [
            { label: "Support Center & FAQ", href: "/support" },
            { label: "Safety Center", href: "/safety" },
            { label: "Purchase Protection", href: "/protection" },
            { label: "Partner with FairPrice", href: "/partner" },
        ]
    },
    {
        title: "Account", links: [
            { label: "Your Orders", href: "/account/orders" },
            { label: "Your Payments", href: "/account/payments" },
            { label: "Coupons & Referrals", href: "/account/coupons" },
            { label: "Messages", href: "/account/messages" },
            { label: "Wishlist", href: "/account/wishlist" },
        ]
    },
    {
        title: "Shopping", links: [
            { label: "Home", href: "/" },
            { label: "Cart", href: "/cart" },
            { label: "Checkout", href: "/checkout" },
        ]
    },
];

export default function SitemapPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto max-w-4xl px-6 py-12">
                <h1 className="text-3xl font-black text-gray-900 mb-8">Sitemap</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sections.map(s => (
                        <div key={s.title}>
                            <h2 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider border-b border-gray-200 pb-2">{s.title}</h2>
                            <ul className="space-y-2">
                                {s.links.map(l => (
                                    <li key={l.href}>
                                        <Link href={l.href} className="text-sm text-gray-600 hover:text-emerald-600 flex items-center gap-1 transition-colors">
                                            <ChevronRight className="h-3 w-3" />{l.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </main>
            <Footer />
        </div>
    );
}
