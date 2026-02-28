"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HelpCircle, ChevronDown, Search, MessageSquare } from "lucide-react";
import { useState } from "react";

const faqs = [
    { q: "How does FairPrice's escrow system work?", a: "When you place an order, your payment is held securely in escrow. The seller ships your item, and once you confirm delivery and are satisfied, the funds are released to the seller. This protects both buyers and sellers." },
    { q: "How do I track my order?", a: "Go to Your Account → Your Orders. Each order shows real-time tracking information including estimated delivery date, current location, and status updates." },
    { q: "What payment methods do you accept?", a: "We accept Verve, Visa, Mastercard, Amex, bank transfers via Paystack, and mobile money (Opay, Palmpay). All transactions are secured with PCI DSS encryption." },
    { q: "How long does delivery take?", a: "Standard delivery takes 3-7 business days nationwide. Express (1-3 days) is available in major cities. Same-day delivery is available in Lagos, Abuja, and Port Harcourt." },
    { q: "Can I cancel an order?", a: "You can cancel a pending or processing order from Your Orders page. Once an order is shipped, you'll need to wait for delivery and initiate a return instead." },
    { q: "How do I become a seller on FairPrice?", a: "Visit the Partner with FairPrice page or go to Account → Become a Seller. You'll need to complete KYC verification including a valid government ID and business registration." },
    { q: "What is FairPrice Premium?", a: "FairPrice Premium (₦5,000/month) gives you free delivery on orders above ₦50,000, priority customer support, early access to deals, and a premium badge on your profile." },
    { q: "How do coupons and referrals work?", a: "Share your unique referral link with friends. When they make a purchase, you earn coupon credits (₦1,000 - ₦5,000 depending on order size). Coupons can be applied at checkout for instant discounts." },
    { q: "What if I receive a damaged or wrong item?", a: "Do NOT confirm delivery. Go to Your Orders, select the order, and click 'Initiate Return'. Upload photos of the issue. Our team will mediate and arrange a refund or replacement within 24 hours." },
    { q: "How does Price Intelligence work?", a: "Our AI engine compares prices across Nigerian and global markets in real-time. It flags overpriced items and suggests fair prices, helping you negotiate better deals with sellers." },
];

export default function SupportPage() {
    const [openIdx, setOpenIdx] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const filtered = faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                <div className="relative bg-gradient-to-br from-emerald-800 to-teal-700 text-white py-16 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-4xl font-black tracking-tight mb-3">Support Center & FAQ</h1>
                        <p className="text-emerald-200 text-lg mb-6">Find answers to common questions about FairPrice</p>
                        <div className="max-w-md mx-auto relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search FAQs..." className="w-full pl-12 pr-4 py-3 rounded-full bg-white text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400" />
                        </div>
                    </div>
                </div>
                <div className="container mx-auto max-w-3xl px-6 py-16">
                    <div className="space-y-3">
                        {filtered.map((faq, i) => (
                            <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
                                <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="w-full p-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <span className="font-bold text-gray-900 text-sm pr-4">{faq.q}</span>
                                    <ChevronDown className={`h-5 w-5 text-gray-400 shrink-0 transition-transform ${openIdx === i ? 'rotate-180' : ''}`} />
                                </button>
                                {openIdx === i && (
                                    <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">{faq.a}</div>
                                )}
                            </div>
                        ))}
                    </div>
                    {filtered.length === 0 && (
                        <div className="text-center py-12">
                            <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No matching questions found.</p>
                        </div>
                    )}
                    <div className="mt-12 bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
                        <MessageSquare className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <h3 className="font-bold text-gray-900 mb-1">Still need help?</h3>
                        <p className="text-sm text-gray-600">Chat with <strong>Ziva AI</strong> on any page or email us at <a href="mailto:support@fairprice.ng" className="text-emerald-600 font-bold hover:underline">support@fairprice.ng</a></p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
