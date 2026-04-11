/**
 * Tiered Escrow Fee Calculation Utility
 * 
 * Logic:
 * - < ₦19,000: 10% of total
 * - ₦20,000 - ₦49,000: 9% of total
 * - ₦50,000 - ₦99,000: 8% of total
 * - >= ₦100,000: 7% of total
 * - MAX CAP: ₦7,000
 * - ROUNDING: Nearest ₦50
 */

export function calculateTieredEscrowFee(subtotal: number): number {
    if (subtotal <= 0) return 0;

    let percentage = 0.10; // Default 10%

    if (subtotal >= 100000) {
        percentage = 0.07;
    } else if (subtotal >= 50000) {
        percentage = 0.08;
    } else if (subtotal >= 20000) {
        percentage = 0.09;
    }

    const calculatedFee = subtotal * percentage;
    
    // Cap at ₦7,000
    const cappedFee = Math.min(calculatedFee, 7000);
    
    // Round to nearest ₦50
    return Math.round(cappedFee / 50) * 50;
}

export const ESCROW_FEE_MAX_CAP = 7000;
export const ESCROW_TIERS = [
    { label: "Under ₦20k", percentage: "10%" },
    { label: "₦20k - ₦49k", percentage: "9%" },
    { label: "₦50k - ₦99k", percentage: "8%" },
    { label: "₦100k+", percentage: "7% (capped at ₦7k)" }
];
