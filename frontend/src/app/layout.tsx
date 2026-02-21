import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ZivaChat } from "@/components/ziva/ZivaChat";
import { LocationProvider } from "@/context/LocationContext";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { FloatingCart } from "@/components/ui/FloatingCart";
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "RatelShop — Nigeria's First AI-Regulated Marketplace",
  description: "Protects consumers from price gouging, scams, and unfair practices. Powered by ZivaAI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        className={cn(inter.className, "antialiased min-h-screen flex flex-col bg-white text-black")}
        suppressHydrationWarning
      >
        <LocationProvider>
          <AuthProvider>
            <CartProvider>
              <FavoritesProvider>
                {children}
                <ZivaChat />
              </FavoritesProvider>
              <FloatingCart />
            </CartProvider>
          </AuthProvider>
        </LocationProvider>
      </body>
    </html>
  );
}
