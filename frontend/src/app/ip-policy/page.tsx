"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ShieldCheck, AlertTriangle, FileText } from "lucide-react";

export default function IPPolicyPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 text-white py-16 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-4xl font-black tracking-tight mb-3">Intellectual Property Policy</h1>
                        <p className="text-slate-300 text-lg">Protecting creators and rights holders on our platform</p>
                    </div>
                </div>
                <div className="container mx-auto max-w-3xl px-6 py-16 prose prose-gray max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Our Commitment</h2>
                        <p className="text-gray-600 leading-relaxed">FairPrice.ng respects intellectual property rights and expects all sellers and users to do the same. We have a zero-tolerance policy for counterfeit goods and unauthorized reproductions.</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" /> Reporting IP Violations</h2>
                        <p className="text-gray-600 leading-relaxed">If you believe your intellectual property rights have been infringed upon by a listing on FairPrice, you can submit a report by emailing <a href="mailto:ip@fairprice.ng" className="text-emerald-600 font-bold hover:underline">ip@fairprice.ng</a> with the following information:</p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-1 text-sm">
                            <li>Your full name and contact information</li>
                            <li>Description of the copyrighted work or trademark</li>
                            <li>Link(s) to the infringing listing(s) on FairPrice</li>
                            <li>A statement of good faith that the use is not authorized</li>
                            <li>Your physical or electronic signature</li>
                        </ul>
                    </section>
                    <section>
                        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Consequences</h2>
                        <p className="text-gray-600 leading-relaxed">Sellers found to be listing counterfeit or IP-infringing products will face immediate listing removal, account suspension, and may be reported to relevant Nigerian authorities. Repeat offenders will be permanently banned from the platform.</p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
