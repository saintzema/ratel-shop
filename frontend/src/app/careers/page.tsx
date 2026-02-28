"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Briefcase, MapPin, Clock, ChevronRight } from "lucide-react";

export default function CareersPage() {
    const jobs = [
        { title: "Senior Frontend Engineer", team: "Engineering", location: "Lagos / Remote", type: "Full-time" },
        { title: "Product Designer (UX)", team: "Design", location: "Lagos", type: "Full-time" },
        { title: "Data Scientist - Pricing AI", team: "AI & ML", location: "Remote", type: "Full-time" },
        { title: "Customer Success Manager", team: "Operations", location: "Lagos", type: "Full-time" },
        { title: "Logistics Coordinator", team: "Supply Chain", location: "Lagos / Abuja", type: "Full-time" },
        { title: "Content Marketing Lead", team: "Marketing", location: "Remote", type: "Contract" },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-700 text-white py-20 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Join FairPrice</h1>
                        <p className="text-indigo-200 text-lg max-w-2xl mx-auto">Help us build the future of fair commerce in Africa. We&apos;re hiring across engineering, design, operations, and more.</p>
                    </div>
                </div>
                <div className="container mx-auto max-w-4xl px-6 py-16">
                    <h2 className="text-2xl font-black text-gray-900 mb-6">Open Positions</h2>
                    <div className="space-y-3">
                        {jobs.map(j => (
                            <div key={j.title} className="p-5 bg-white border border-gray-200 rounded-2xl hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer group">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{j.title}</h3>
                                        <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{j.team}</span>
                                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location}</span>
                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{j.type}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-12 text-center bg-indigo-50 rounded-2xl p-8 border border-indigo-100">
                        <h3 className="font-bold text-gray-900 mb-2">Don&apos;t see a perfect fit?</h3>
                        <p className="text-sm text-gray-600 mb-4">Send your CV to <a href="mailto:careers@fairprice.ng" className="text-indigo-600 font-bold hover:underline">careers@fairprice.ng</a> and we&apos;ll keep you in mind for future openings.</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
