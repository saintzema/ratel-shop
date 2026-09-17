"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function AcceptableUsePolicyPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Acceptable Use Policy</h1>
                <p className="text-sm text-gray-400 mb-8">Last updated: September 2026</p>

                <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed text-gray-700">
                    <section>
                        <p>
                            This Acceptable Use Policy ("AUP") sets out what is and isn't allowed on FairPrice.ng — a marketplace connecting Nigerian buyers with independent sellers, service providers, drivers, and couriers. It applies to everyone who lists, buys, sells, drives, delivers, or otherwise transacts on the platform. It sits alongside, and does not replace, our <a href="/terms" className="text-emerald-600 font-medium hover:underline">Terms of Service</a> and <a href="/return-policy" className="text-emerald-600 font-medium hover:underline">Return Policy</a>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">1. Prohibited Items & Listings</h2>
                        <p>Sellers may never list, advertise, or offer for sale:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Counterfeit, replica, or unauthorized-branded goods</li>
                            <li>Stolen goods, or goods with tampered/removed serial numbers or IMEIs</li>
                            <li>Firearms, ammunition, explosives, or weapons of any kind</li>
                            <li>Illegal drugs, controlled substances, or drug paraphernalia</li>
                            <li>Prescription medication without valid regulatory authorization</li>
                            <li>Human remains, organs, or bodily fluids</li>
                            <li>Live animals traded in violation of Nigerian wildlife/animal welfare law</li>
                            <li>Items that infringe a third party's intellectual property, trademark, or copyright</li>
                            <li>Items whose sale violates Nigerian law or the regulations of any government agency (e.g. NAFDAC, SON, NCC)</li>
                            <li>Adult content, or listings that sexualize minors in any way</li>
                            <li>Any listing designed to facilitate fraud, money laundering, or a pyramid/Ponzi scheme</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">2. Prohibited Conduct — All Users</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Impersonating another person, business, or FairPrice staff</li>
                            <li>Submitting false, forged, or stolen identity/KYC documents</li>
                            <li>Manipulating reviews or ratings — buying, selling, or fabricating them</li>
                            <li>Circumventing in-app payment to avoid escrow protection or platform fees (e.g. asking a counterparty to pay outside FairPrice for a transaction that started on it)</li>
                            <li>Harassing, threatening, or discriminating against another user based on tribe, religion, gender, or disability</li>
                            <li>Attempting to access another user's account, or probing/attacking the platform's systems</li>
                            <li>Scraping the platform or using it to build a competing service without authorization</li>
                            <li>Using the platform's ride, delivery, or "hire an expert" features for any purpose other than the genuine transport of people/goods or the genuine performance of the agreed service</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">3. Seller-Specific Obligations</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>List only items you have the legal right to sell, accurately described and priced</li>
                            <li>Fulfil confirmed orders promptly and provide genuine shipping/tracking information</li>
                            <li>Honor the platform's escrow, return, and dispute-resolution processes in good faith</li>
                            <li>Never solicit a buyer to cancel an in-app order in order to complete the sale off-platform</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">4. Drivers, Couriers & Service Providers</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Hold a valid driver's license, vehicle registration, and any license required for the service you offer</li>
                            <li>Never accept a trip, delivery, or job you don't intend to genuinely complete</li>
                            <li>Never request or accept payment for a ride/delivery/service outside FairPrice's in-app payment system</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">5. Enforcement</h2>
                        <p>
                            Violating this policy can result in listing removal, order cancellation, escrow funds being held pending investigation, account suspension, permanent account termination, and — where the law requires it — a report to the relevant Nigerian authorities. FairPrice reviews reports of violations and may act without prior notice where we believe it's necessary to protect users or comply with the law.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">6. Report a Violation</h2>
                        <p>
                            If you encounter a listing or user that violates this policy, report it via the "Report" action on the listing/profile, or email <a href="mailto:hello@fairprice.ng" className="text-emerald-600 font-medium hover:underline">hello@fairprice.ng</a>. We review reports and take action consistent with this policy and our Terms of Service.
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
