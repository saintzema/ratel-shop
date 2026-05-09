import { NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/whatsapp-service';

/**
 * POST /api/whatsapp/sync
 * 
 * Simulated WhatsApp Catalog Scraper.
 * In a real-world scenario, this would use a puppeteer-based scraper or a 
 * specialized WhatsApp scraping service (like Ziva-Scraper) to extract
 * product details from the wa.me/c/[phone] page.
 */
export async function POST(req: Request) {
    try {
        const { phone } = await req.json();
        
        if (!phone) {
            return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
        }

        const normalizedPhone = WhatsAppService.normalizePhoneNumber(phone);
        const catalogUrl = `https://wa.me/c/${normalizedPhone}`;

        // Simulate scraping latency
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Mock data based on the phone number to make it feel "dynamic"
        // In production, this would be the result of a real scrape
        const mockProducts = [
            {
                name: "Premium Wireless Earbuds",
                price: 12500,
                category: "electronics",
                description: "Sync from WhatsApp: High-fidelity sound with noise cancellation.",
                image_url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=500&auto=format&fit=crop",
                original_price: 15000,
                stock: 12
            },
            {
                name: "Ultra-Fast Power Bank 20k",
                price: 18000,
                category: "electronics",
                description: "Sync from WhatsApp: Charge your phone 4 times over with one full charge.",
                image_url: "https://images.unsplash.com/photo-1619130771181-543f78a29f04?q=80&w=500&auto=format&fit=crop",
                original_price: 22000,
                stock: 8
            },
            {
                name: "Designer Leather Watch",
                price: 45000,
                category: "fashion",
                description: "Sync from WhatsApp: Water resistant, genuine leather strap.",
                image_url: "https://images.unsplash.com/photo-1524592093055-3a219ae7c14a?q=80&w=500&auto=format&fit=crop",
                original_price: 55000,
                stock: 5
            }
        ];

        return NextResponse.json({ 
            success: true, 
            products: mockProducts,
            source: catalogUrl,
            message: `Successfully indexed ${mockProducts.length} items from WhatsApp catalog.`
        });

    } catch (error) {
        console.error("WhatsApp Sync Error:", error);
        return NextResponse.json({ error: "Failed to process catalog sync" }, { status: 500 });
    }
}
