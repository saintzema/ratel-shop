import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ZivaChat } from "@/components/ziva/ZivaChat";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(inter.className, "antialiased min-h-screen flex flex-col")}
        suppressHydrationWarning
      >
        {children}
        <ZivaChat />
      </body>
    </html>
  );
}
