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
                        Nigeria's first AI-regulated marketplace. Protecting consumers with fair prices and transparent sellers.
                    </p>
                </div>

                {/* Column 2 */}
                <div>
                    <h3 className="font-bold mb-4">Get to Know Us</h3>
                    <ul className="flex flex-col gap-2 text-sm text-gray-300">
                        <li><Link href="#" className="hover:underline">About RatelShop</Link></li>
                        <li><Link href="#" className="hover:underline">Careers</Link></li>
                        <li><Link href="#" className="hover:underline">VeryDarkMan Verified</Link></li>
                        <li><Link href="#" className="hover:underline">Ratel Science</Link></li>
                    </ul>
                </div>

                {/* Column 3 */}
                <div>
                    <h3 className="font-bold text-white mb-4">Make Money with Us</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                        <li><Link href="/seller/onboarding" className="hover:underline hover:text-white">Sell on RatelShop</Link></li>
                        <li><Link href="/seller/dashboard" className="hover:underline hover:text-white">Seller Dashboard</Link></li>
                        <li><Link href="/seller/products/new" className="hover:underline hover:text-white">Upload Products</Link></li>
                        <li><Link href="/admin/dashboard" className="hover:underline hover:text-white text-ratel-orange">Admin Dashboard (VDM)</Link></li>
                    </ul>
                </div>

                {/* Column 4 */}
                <div>
                    <h3 className="font-bold mb-4">Let Us Help You</h3>
                    <ul className="flex flex-col gap-2 text-sm text-gray-300">
                        <li><Link href="#" className="hover:underline">Your Account</Link></li>
                        <li><Link href="#" className="hover:underline">Your Orders</Link></li>
                        <li><Link href="#" className="hover:underline">Shipping Rates & Policies</Link></li>
                        <li><Link href="#" className="hover:underline">Returns & Replacements</Link></li>
                        <li><Link href="#" className="hover:underline">Help Center</Link></li>
                    </ul>
                </div>
            </div>

            <div className="mt-10 pt-6 border-t border-[#3a4553] text-center text-xs text-gray-400">
                <p>&copy; {new Date().getFullYear()} RatelShop by VDM. All rights reserved.</p>
                <div className="flex justify-center gap-4 mt-2">
                    <Link href="#" className="hover:underline">Conditions of Use</Link>
                    <Link href="#" className="hover:underline">Privacy Notice</Link>
                    <Link href="#" className="hover:underline">Consumer Protection Policy</Link>
                </div>
            </div>
        </footer>
    );
}
