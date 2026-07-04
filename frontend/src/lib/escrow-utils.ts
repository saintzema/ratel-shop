/**
 * Tiered Escrow / Platform Fee Calculation
 *
 * Designed to be competitive for everyday items while still generating
 * meaningful revenue on high-value (car, machinery) transactions.
 *
 * Tiers:
 *   Under ₦5,000       → ₦100 flat  (kept low so small informal purchases aren't dissuaded)
 *   ₦5k – ₦10k        → ₦150 flat
 *   ₦10k – ₦50k       → 1.5%  (max ₦750)
 *   ₦50k – ₦200k      → 1%    (max ₦2,000)
 *   ₦200k – ₦1M       → 0.8%  (max ₦4,000)
 *   ₦1M – ₦10M        → 0.5%  (max ₦7,000)  ← ₦7k reserved for this tier
 *   ₦10M+              → 0.3%  (max ₦15,000) ← premium/cars tier
 *
 * Examples:
 *   ₦122,200  → 1% = ₦1,222  → capped at ₦2,000 → ₦1,200 (rounded ₦50)
 *   ₦500,000  → 0.8% = ₦4,000 → ₦4,000
 *   ₦5,000,000 → 0.5% = ₦25,000 → capped ₦7,000
 *   ₦50,000,000 → 0.3% = ₦150,000 → capped ₦15,000
 */
export function calculateTieredEscrowFee(subtotal: number): number {
    if (subtotal <= 0) return 0;

    let fee: number;

    if (subtotal < 5_000) {
        fee = 100;
    } else if (subtotal < 10_000) {
        fee = 150;
    } else if (subtotal < 50_000) {
        fee = Math.min(subtotal * 0.015, 750);
    } else if (subtotal < 200_000) {
        fee = Math.min(subtotal * 0.01, 2_000);
    } else if (subtotal < 1_000_000) {
        fee = Math.min(subtotal * 0.008, 4_000);
    } else if (subtotal < 10_000_000) {
        fee = Math.min(subtotal * 0.005, 7_000);
    } else {
        fee = Math.min(subtotal * 0.003, 15_000);
    }

    // Round to nearest ₦50
    return Math.round(fee / 50) * 50;
}

export const ESCROW_FEE_MAX_CAP = 15_000;
export const ESCROW_TIERS = [
    { label: "Under ₦5k",     percentage: "₦100 flat" },
    { label: "₦5k – ₦10k",   percentage: "₦150 flat" },
    { label: "₦10k – ₦50k",  percentage: "1.5% (max ₦750)" },
    { label: "₦50k – ₦200k", percentage: "1% (max ₦2,000)" },
    { label: "₦200k – ₦1M",  percentage: "0.8% (max ₦4,000)" },
    { label: "₦1M – ₦10M",   percentage: "0.5% (max ₦7,000)" },
    { label: "₦10M+",         percentage: "0.3% (max ₦15,000)" },
];
