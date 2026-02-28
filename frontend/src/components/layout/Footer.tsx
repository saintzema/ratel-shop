import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  CheckCircle,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="bg-[#1f2937] text-white pt-12 pb-6 border-t border-[#374151] mt-8">
      <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Column 1: Company Info */}
        <div>
          <h3 className="font-bold mb-5 text-[15px] tracking-wide">
            Company info
          </h3>
          <ul className="flex flex-col gap-3 text-[13px] text-gray-300">
            <li>
              <Link
                href="/about"
                className="hover:underline hover:text-white transition-colors"
              >
                About FairPrice
              </Link>
            </li>
            <li>
              <Link
                href="/affiliate"
                className="hover:underline hover:text-white transition-colors"
              >
                Affiliate & Influencer Program
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="hover:underline hover:text-white transition-colors"
              >
                Contact us
              </Link>
            </li>
            <li>
              <Link
                href="/careers"
                className="hover:underline hover:text-white transition-colors"
              >
                Careers
              </Link>
            </li>
            <li>
              <Link
                href="/press"
                className="hover:underline hover:text-white transition-colors"
              >
                Press
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 2: Customer Service */}
        <div>
          <h3 className="font-bold mb-5 text-[15px] tracking-wide">
            Customer service
          </h3>
          <ul className="flex flex-col gap-3 text-[13px] text-gray-300">
            <li>
              <Link
                href="/returns"
                className="hover:underline hover:text-white transition-colors"
              >
                Return and refund policy
              </Link>
            </li>
            <li>
              <Link
                href="/ip-policy"
                className="hover:underline hover:text-white transition-colors"
              >
                Intellectual property policy
              </Link>
            </li>
            <li>
              <Link
                href="/shipping"
                className="hover:underline hover:text-white transition-colors"
              >
                Shipping info
              </Link>
            </li>
            <li>
              <Link
                href="/report"
                className="hover:underline hover:text-white transition-colors"
              >
                Report suspicious activity
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Help */}
        <div>
          <h3 className="font-bold mb-5 text-[15px] tracking-wide">Help</h3>
          <ul className="flex flex-col gap-3 text-[13px] text-gray-300">
            <li>
              <Link
                href="/support"
                className="hover:underline hover:text-white transition-colors"
              >
                Support center & FAQ
              </Link>
            </li>
            <li>
              <Link
                href="/safety"
                className="hover:underline hover:text-white transition-colors"
              >
                Safety center
              </Link>
            </li>
            <li>
              <Link
                href="/protection"
                className="hover:underline hover:text-white transition-colors"
              >
                FairPrice purchase protection
              </Link>
            </li>
            <li>
              <Link
                href="/sitemap"
                className="hover:underline hover:text-white transition-colors"
              >
                Sitemap
              </Link>
            </li>
            <li>
              <Link
                href="/partner"
                className="hover:underline hover:text-white transition-colors"
              >
                Partner with FairPrice
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4 & 5: Apps & Connect */}
        <div className="lg:col-span-2">
          <h3 className="font-bold mb-5 text-[15px] tracking-wide">
            Download the FairPrice App
          </h3>
          <div className="grid grid-cols-2 gap-4 text-[12px] text-gray-300 mb-6">
            <ul className="flex flex-col gap-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Price-drop
                alerts
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Faster &
                more secure
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Exclusive
                offers
              </li>
            </ul>
            <ul className="flex flex-col gap-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Track
                orders anytime
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Low stock
                items alerts
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Coupons &
                offers
              </li>
            </ul>
          </div>

          <div className="flex gap-3 mb-8">
            <button className="flex items-center gap-2 bg-black border border-gray-600 rounded-lg px-4 py-2 hover:bg-gray-800 transition-colors">
              <svg
                className="w-6 h-6 text-white"
                viewBox="0 0 384 512"
                fill="currentColor"
              >
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
              </svg>
              <div className="flex flex-col text-left">
                <span className="text-[10px] leading-tight">
                  Download on the
                </span>
                <span className="text-sm font-bold leading-tight">
                  App Store
                </span>
              </div>
            </button>
            <button className="flex items-center gap-2 bg-black border border-gray-600 rounded-lg px-4 py-2 hover:bg-gray-800 transition-colors">
              <svg className="w-6 h-6" viewBox="0 0 512 512">
                <path
                  fill="#4caf50"
                  d="M29 36.1c-16 11.2-26 31.8-26 58.4v323c0 26.7 10 47.2 26 58.4l259.9-259.2L29 36.1z"
                />
                <path
                  fill="#ffc107"
                  d="M354.3 283.4l111.4 62.4c17.5 9.8 31.2 2.6 34.6-13.7 2.2-10.4 1.2-22.9-4.8-33.8L413 148.9 354.3 283.4z"
                />
                <path
                  fill="#03a9f4"
                  d="M413 213.6h-.1l-124 124 65.4-134-65.4-134 124 124h.1c9.4 9.4 9.4 24.6 0 34z"
                />
                <path
                  fill="#ff5252"
                  d="M354.3 144.5L288.9 79 29 36.1l325.3 108.4z"
                />
              </svg>
              <div className="flex flex-col text-left">
                <span className="text-[10px] leading-tight text-white">
                  Get it on
                </span>
                <span className="text-sm font-bold leading-tight text-white">
                  Google Play
                </span>
              </div>
            </button>
          </div>

          <h3 className="font-bold mb-4 text-[15px] tracking-wide">
            Connect with FairPrice
          </h3>
          <div className="flex gap-4">
            <button className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-500 hover:border-white transition-colors">
              <Instagram className="h-5 w-5" />
            </button>
            <button className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-500 hover:border-white transition-colors">
              <Facebook className="h-5 w-5" />
            </button>
            <button className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-500 hover:border-white transition-colors">
              <Twitter className="h-5 w-5" />
            </button>
            <button className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-500 hover:border-white transition-colors">
              <Youtube className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 mt-12 pt-8 border-t border-[#374151]">
        <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center">
          <div>
            <h4 className="font-bold text-[13px] mb-3 text-gray-400">
              Security certification
            </h4>
            <div className="flex gap-2 flex-wrap items-center">
              {[
                "PCI DSS",
                "Visa Secure",
                "Mastercard ID Check",
                "Amex SafeKey",
                "ProtectBuy",
                "JCB J/Secure",
              ].map((cert) => (
                <div
                  key={cert}
                  className="bg-white px-2 py-1 rounded text-[10px] font-bold text-gray-800 flex items-center justify-center h-6 break-keep whitespace-nowrap"
                >
                  {cert}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-[13px] mb-3 text-gray-400">
              We accept
            </h4>
            <div className="flex gap-2 flex-wrap items-center">
              {[
                { name: "Verve", color: "#00425F" },
                { name: "Visa", color: "#1A1F71" },
                { name: "Mastercard", color: "#EB001B" },
                { name: "Amex", color: "#006FCF" },
                { name: "Discover", color: "#FF6000" },
                { name: "Maestro", color: "#CC0000" },
                { name: "Diners Club", color: "#004A97" },
                { name: "JCB", color: "#003087" },
                { name: "Apple Pay", color: "#000000" },
                { name: "Google Pay", color: "#4285F4" },
              ].map((method) => (
                <div
                  key={method.name}
                  className="bg-white px-2.5 py-1 rounded text-[10px] font-bold text-gray-800 flex items-center justify-center h-6 border border-gray-200 gap-1"
                >
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: method.color }} />
                  {method.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-[12px] text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} FairPrice. All rights reserved.
          </p>
          <p className="mt-1">
            FairPrice.ng is a product of{" "}
            <a
              href="https://zemaai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 hover:underline transition-colors font-semibold"
            >
              Zema AI Labs
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
