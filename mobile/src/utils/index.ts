// Shared utility functions for FairPrice mobile

/**
 * Format a number as Nigerian Naira price
 */
export function formatPrice(amount: number): string {
    if (!amount && amount !== 0) return "₦0";
    return "₦" + Math.round(amount).toLocaleString("en-NG");
}

/**
 * Calculate discount percentage between original and current price
 */
export function getDiscountPercent(originalPrice: number, currentPrice: number): number {
    if (!originalPrice || originalPrice <= currentPrice) return 0;
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

/**
 * Format a date string to readable format
 */
export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

/**
 * Truncate a string to maxLength with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 1) + "…";
}

/**
 * Get readable order status label
 */
export function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
        pending: "Pending",
        processing: "Processing",
        shipped: "Shipped",
        delivered: "Delivered",
        cancelled: "Cancelled",
    };
    return map[status] || status;
}

/**
 * Get a status color based on order/negotiation status
 */
export function getStatusColor(status: string): string {
    const map: Record<string, string> = {
        pending: "#F59E0B",
        processing: "#3B82F6",
        shipped: "#8B5CF6",
        delivered: "#10B981",
        cancelled: "#EF4444",
        accepted: "#10B981",
        rejected: "#EF4444",
    };
    return map[status] || "#6B7280";
}
