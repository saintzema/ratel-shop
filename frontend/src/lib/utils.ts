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

export function getProductUrl(id: string | undefined | null, name: string | undefined | null): string {
    if (!id || id === 'undefined' || id === 'null') return "/";
    const safeName = (name && name !== 'undefined' && name !== 'null') ? name : id;
    const slug = safeName.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    return `/product/${id}/${slug || 'product'}`;
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
export function getProxiedImageUrl(url: string | null | undefined): string {
    if (!url) return "/assets/images/placeholder.png";
    
    // Internal assets or already proxied
    if (url.startsWith('/') || url.includes('api/image-cdn')) {
        return url;
    }

    const lower = url.toLowerCase();
    const isBroken = lower.includes('no photo') || 
                    lower.includes('no image') || 
                    lower.includes('n/a') ||
                    lower.includes('placeholder') ||
                    lower.includes('vertexaisearch.cloud.google.com') || 
                    lower.includes('grounding-api-redirect') ||
                    lower.includes('googleusercontent.com/grounding') ||
                    url.startsWith('data:image');

    if (isBroken) {
        return "/assets/images/placeholder.png";
    }

    // Only proxy external HTTP(S) links
    if (url.startsWith('http')) {
        return `/api/image-cdn?url=${encodeURIComponent(url)}`;
    }

    return url;
}
