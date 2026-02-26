import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function Footer() {
    return (
        <footer className="bg-[#232f3e] text-white pt-10 pb-6 border-t border-[#3a4553]">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Column 1 */}
                <div className="flex flex-col gap-4">
                    <Logo variant="light" />
                    <p className="text-sm text-gray-300">
                        Nigeria&apos;s first AI-regulated marketplace. Protecting consumers with fair prices and transparent sellers.
                    </p>
                </div>

                {/* Column 2 */}
                <div>
                    <h3 className="font-bold mb-4">Get to Know Us</h3>
                    <ul className="flex flex-col gap-2 text-sm text-gray-300">
                        <li><Link href="/about" className="hover:underline hover:text-white">About FairPrice</Link></li>
                        <li><Link href="/careers" className="hover:underline hover:text-white">Careers</Link></li>
                        <li><Link href="/science" className="hover:underline hover:text-white">FairPrice Science</Link></li>
                    </ul>
                </div>

                {/* Column 3 */}
                <div>
                    <h3 className="font-bold text-white mb-4">Make Money with Us</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                        <li><Link href="/seller/onboarding" className="hover:underline hover:text-white">Sell on FairPrice</Link></li>
                        <li><Link href="/seller/dashboard" className="hover:underline hover:text-white">Seller Dashboard</Link></li>
                        <li><Link href="/seller/products/new" className="hover:underline hover:text-white">Upload Products</Link></li>
                    </ul>
                </div>

                {/* Column 4 */}
                <div>
                    <h3 className="font-bold mb-4">Let Us Help You</h3>
                    <ul className="flex flex-col gap-2 text-sm text-gray-300">
                        <li><Link href="/account" className="hover:underline hover:text-white">Your Account</Link></li>
                        <li><Link href="/account/orders" className="hover:underline hover:text-white">Your Orders</Link></li>
                        <li><Link href="/shipping" className="hover:underline hover:text-white">Shipping Rates & Policies</Link></li>
                        <li><Link href="/returns" className="hover:underline hover:text-white">Returns & Replacements</Link></li>
                        <li><Link href="/help" className="hover:underline hover:text-white">Help Center</Link></li>
                    </ul>
                </div>
            </div>

            <div className="mt-10 pt-6 border-t border-[#3a4553] text-center text-xs text-gray-400">
                <p>&copy; {new Date().getFullYear()} FairPrice. All rights reserved.</p>
                <div className="flex justify-center gap-4 mt-2">
                    <Link href="/legal/conditions" className="hover:underline">Conditions of Use</Link>
                    <Link href="/legal/privacy" className="hover:underline">Privacy Notice</Link>
                    <Link href="/legal/consumer-protection" className="hover:underline">Consumer Protection Policy</Link>
                </div>
                <p className="mt-3 text-gray-500">
                    FairPrice.ng is a product of{" "}
                    <a href="https://zemaai.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 hover:underline transition-colors">
                        Zema AI Labs
                    </a>
                </p>
            </div>
        </footer>
    );
}
