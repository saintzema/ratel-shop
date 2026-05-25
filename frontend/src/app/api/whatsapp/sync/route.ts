import { NextResponse, type NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/jwt';
import { db } from '@/lib/db';

/**
 * POST /api/whatsapp/sync
 *
 * Saves manually-entered products from the Quick Product Add form on the
 * seller dashboard.  The old "catalog scraping" approach was replaced because
 * WhatsApp Business does not expose a public catalog API — wa.me/c/ pages
 * require an authenticated browser session and scraping them violates the
 * WhatsApp ToS.
 *
 * Body: { products: Array<{ name, price, category, description, image_url, stock }> }
 */
export async function POST(req: NextRequest) {
    try {
        const user = getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const products: any[] = body.products ?? [];

        if (!Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ error: 'No products provided' }, { status: 400 });
        }

        // Look up the seller record for this user
        const seller = await db.seller.findFirst({
            where: { userId: user.userId },
            select: { id: true, businessName: true }
        });

        if (!seller) {
            return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
        }

        const created = await Promise.all(
            products.map(p =>
                db.product.create({
                    data: {
                        name: p.name || 'Untitled Product',
                        price: Number(p.price) || 0,
                        originalPrice: Number(p.original_price) || Number(p.price) || 0,
                        category: p.category || 'general',
                        description: p.description || '',
                        imageUrl: p.image_url || '',
                        images: p.image_url ? [p.image_url] : [],
                        stock: Number(p.stock) || 10,
                        sellerId: seller.id,
                        sellerName: seller.businessName,
                        isActive: true,
                    }
                })
            )
        );

        return NextResponse.json({ success: true, created: created.length });
    } catch (error: any) {
        console.error('[whatsapp/sync POST]', error);
        return NextResponse.json({ error: error.message || 'Failed to save products' }, { status: 500 });
    }
}
