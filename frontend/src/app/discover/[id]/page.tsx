import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import DiscoverSpotClient from './DiscoverSpotClient';

export const revalidate = 1800;

type Props = { params: Promise<{ id: string }> };

// SEO: a spot listed on Discover deserves its own indexable, ranked page —
// "{name}, {city}" is exactly what someone searches when deciding where to
// go, the same way a TripAdvisor listing ranks for its own venue name.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const spot = await db.product.findUnique({ where: { id }, select: { name: true, description: true, imageUrl: true, locationCity: true, locationState: true, specs: true } }).catch(() => null);
    if (!spot) return { title: 'Spot Not Found | FairPrice Discover' };

    const city = spot.locationCity || spot.locationState || 'Nigeria';
    const spotType = (spot.specs as any)?.spot_type || 'Spot';
    const title = `${spot.name} — ${spotType} in ${city} | FairPrice Discover`;
    const description = spot.description?.slice(0, 155) || `${spot.name} in ${city} — photos, reviews, opening hours and directions on FairPrice Discover.`;
    const canonicalPath = `/discover/${id}`;
    const image = spot.imageUrl?.startsWith('http') ? `https://www.fairprice.ng/api/image-cdn?url=${encodeURIComponent(spot.imageUrl)}` : 'https://www.fairprice.ng/logo.png';

    return {
        title,
        description,
        alternates: { canonical: canonicalPath },
        openGraph: { title, description, url: `https://www.fairprice.ng${canonicalPath}`, siteName: 'FairPrice Nigeria', images: [{ url: image, width: 800, height: 800, alt: spot.name }], locale: 'en_NG', type: 'website' },
        twitter: { card: 'summary_large_image', title, description, images: [image] },
    };
}

export default async function DiscoverSpotPage({ params }: Props) {
    const { id } = await params;
    const exists = await db.product.findUnique({ where: { id }, select: { id: true } }).catch(() => null);
    if (!exists) notFound();
    return <DiscoverSpotClient id={id} />;
}
