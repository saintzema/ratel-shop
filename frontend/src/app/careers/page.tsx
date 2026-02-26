"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Briefcase, MapPin, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CareersPage() {
    const openings = [
        { title: "Senior AI/ML Engineer", team: "AI & Data", location: "Lagos / Remote", type: "Full-time" },
        { title: "Full-Stack Developer (Next.js)", team: "Engineering", location: "Lagos", type: "Full-time" },
        { title: "Product Designer (UI/UX)", team: "Design", location: "Lagos / Remote", type: "Full-time" },
        { title: "Marketplace Operations Lead", team: "Operations", location: "Lagos", type: "Full-time" },
        { title: "Customer Success Associate", team: "Support", location: "Lagos / Abuja", type: "Full-time" },
        { title: "Growth Marketing Manager", team: "Marketing", location: "Lagos / Remote", type: "Full-time" },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-gray-900 mb-3">Join FairPrice</h1>
                    <p className="text-lg text-gray-500 max-w-lg mx-auto">Help us build Africa&apos;s most transparent marketplace. We&apos;re looking for passionate people who believe commerce should be fair for everyone.</p>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-4">Open Positions</h2>
                <div className="space-y-3 mb-10">
                    {openings.map((job, i) => (
                        <div key={i} className="p-4 rounded-2xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-center justify-between group cursor-pointer">
                            <div>
                                <h3 className="font-bold text-gray-900">{job.title}</h3>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                    <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {job.team}</span>
                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.type}</span>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500" />
                        </div>
                    ))}
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Don&apos;t see your role?</h2>
                    <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">Send your CV to <strong>careers@fairprice.ng</strong> and tell us how you&apos;d make FairPrice better.</p>
                    <a href="mailto:careers@fairprice.ng">
                        <Button className="bg-black text-white rounded-xl font-bold px-6">Send Your CV</Button>
                    </a>
                </div>
            </main>
            <Footer />
        </div>
    );
}
