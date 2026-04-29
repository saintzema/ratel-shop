import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDateExact(dateStr: string | number | Date): string {
    return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

export function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

export function getTimeLeft(endDate: string): string {
    const diff = new Date(endDate).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}h ${mins}m ${secs}s`;
}

export function getTrustColor(score: number): string {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
}

export function getProductUrl(
    idOrProduct: string | any | undefined | null, 
    name?: string | undefined | null, 
    storedSlug?: string
): string {
    let id: string | undefined | null;
    let productName: string | undefined | null;
    let slugToUse: string | undefined;

    if (idOrProduct && typeof idOrProduct === 'object' && !Array.isArray(idOrProduct)) {
        id = idOrProduct.id;
        productName = idOrProduct.name;
        slugToUse = idOrProduct.slug;
    } else {
        id = idOrProduct;
        productName = name;
        slugToUse = storedSlug;
    }

    if (!id || String(id) === 'undefined' || String(id) === 'null') return "/";
    
    let slug = "";
    if (slugToUse && slugToUse.trim().length > 0) {
        slug = slugToUse;
    } else {
        const safeName = (productName && String(productName) !== 'undefined' && String(productName) !== 'null') ? String(productName) : String(id);
        const safeStr = String(safeName);
        
        // Strip global AI cache suffix or prefixes if they leak into the name
        const cleanedName = safeStr.replace(/(-fhpdf3|__global_.*|__cached_.*)/i, "");

        slug = cleanedName.toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    }
    
    // Strip __global_ or __cached_ from the actual ID if it accidentally routes with it
    let finalId = String(id);
        
    return `/product/${finalId}/${slug || 'product'}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for insecure contexts (e.g. local IP testing on mobile)
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "absolute";
            textArea.style.left = "-999999px";
            document.body.prepend(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
            } finally {
                textArea.remove();
            }
            return true;
        }
    } catch (error) {
        console.error("Copy failed", error);
        return false;
    }
}
export function isGroundingUrl(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('googleusercontent.com/grounding') ||
           lower.includes('vertexaisearch.cloud.google.com') ||
           lower.includes('grounding-api-redirect') ||
           lower.includes('googleapis.com/download') ||
           lower.includes('google.com/imgres');
}

export function getProxiedImageUrl(url: string | null | undefined): string {
    if (!url) return "/assets/images/placeholder.png";

    // Internal assets or already proxied
    if (url.startsWith('/') || url.includes('api/image-cdn')) {
        return url;
    }

    const lower = url.toLowerCase();

    // Google Grounding / VertexAI redirect URLs expire quickly and cause proxy timeouts.
    // Return placeholder — background hydration will fetch a real image instead.
    if (isGroundingUrl(url)) {
        return "/assets/images/placeholder.png";
    }

    const isBroken = lower.includes('no photo') ||
                    lower.includes('no image') ||
                    lower.includes('n/a') ||
                    lower.includes('placeholder') ||
                    url.startsWith('data:image');

    if (isBroken) {
        return "/assets/images/placeholder.png";
    }

    // Proxy external HTTP(S) links — use ?thumb=1 so the CDN route redirects
    // directly to the source (zero server CPU) instead of running Sharp.
    if (url.startsWith('http') && !isVideoUrl(url)) {
        return `/api/image-cdn?url=${encodeURIComponent(url)}`;
    }

    return url;
}

export function generateCompliantId(name: string | null | undefined, prefix = 'global'): string {
    const slug = (name || 'unknown').toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    
    const id = `${prefix}-${slug}`;
    if (id.length <= 50) return id;
    // If too long, trim to 50 and ensure it doesn't end with a hyphen
    return id.substring(0, 50).replace(/-+$/, "");
}

export function wrapInCDN(url: string | null | undefined): string {
    if (!url) return "/assets/images/placeholder.png";
    if (typeof url !== 'string') return url;
    
    // If it's already a relative path or proxied, return as is
    if (url.startsWith('/') || url.includes('/api/image-cdn')) {
        return url;
    }

    // If it's a data URL, return as is (usually base64)
    if (url.startsWith('data:')) return url;

    // Proxy external URLs
    if (url.startsWith('http')) {
        return `/api/image-cdn?url=${encodeURIComponent(url)}`;
    }

    return url;
}

export function isVideoUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    // Common video extensions
    const extensions = ['.mp4', '.webm', '.ogg', '.mov'];
    if (extensions.some(ext => lower.includes(ext))) return true;
    
    // Video player pages that need iframes or special handling
    if (lower.includes('amazon.co.uk/vdp/') || lower.includes('amazon.com/vdp/')) return true;
    if (lower.includes('temu.com/video/')) return true;
    if (lower.includes('youtube.com/watch') || lower.includes('youtu.be/')) return true;
    
    return false;
}

export function isIframeVideoUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('/vdp/') || 
           lower.includes('temu.com/video/') || 
           lower.includes('youtube.com') || 
           lower.includes('youtu.be') ||
           lower.includes('tiktok.com') ||
           lower.includes('instagram.com') ||
           lower.includes('vimeo.com');
}
