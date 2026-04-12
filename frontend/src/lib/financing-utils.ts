/**
 * Loan Utilities for Vehicle Financing
 * Includes BNPL and Lease-to-Own calculations based on Altbank/Altdrive baseline rates.
 */

export interface LoanResult {
    monthlyPayment: number;
    deposit: number;
    tenorMonths: number;
    totalAmount: number;
    markupAmount: number;
    interestRate: number;
}

export type VehicleCondition = 'new' | 'foreign_used' | 'nigerian_used';
export type LoanType = 'bnpl' | 'lease';

export const LOAN_CONSTANTS = {
    // Ijarah Baselne: 24.85% for 1yr, scaling to 27.32% for 5yr (includes insurance & reg)
    BASE_MARKUP_PA: 0.2485,
    MARKUP_STEP_PA: 0.00618, 
    BNPL_DEPOSIT_PERCENT: 0.15,
    TENORS: {
        new: 5,
        foreign_used: 4,
        nigerian_used: 3,
    }
};

/**
 * Returns the current vehicle deposit percentage as a decimal (e.g., 0.15 for 15%).
 * Reads from admin settings in localStorage, falls back to LOAN_CONSTANTS default.
 */
export function getVehicleDepositPercent(): number {
    if (typeof window !== "undefined") {
        try {
            const stored = localStorage.getItem("fp_vehicle_deposit_pct");
            if (stored) {
                const val = parseFloat(stored);
                if (!isNaN(val) && val >= 1 && val <= 100) {
                    return val / 100;
                }
            }
        } catch {}
    }
    return LOAN_CONSTANTS.BNPL_DEPOSIT_PERCENT;
}

/**
 * Calculates monthly payment based on Altdrive Ijarah logic.
 */
export function calculateMonthlyPayment(
    price: number,
    type: LoanType = 'bnpl',
    condition: VehicleCondition = 'foreign_used',
    requestedYears?: number
): LoanResult {
    const years = requestedYears !== undefined ? requestedYears : (LOAN_CONSTANTS.TENORS[condition] || 4);
    const months = years * 12;
    
    // Altdrive dynamic markup logic
    let annualMarkup = LOAN_CONSTANTS.BASE_MARKUP_PA + (years - 1) * LOAN_CONSTANTS.MARKUP_STEP_PA;
    
    // Admin Override
    if (typeof window !== "undefined") {
        try {
            const dynamicMarkup = localStorage.getItem("fp_vehicle_markup");
            if (dynamicMarkup) {
                const markupVal = parseFloat(dynamicMarkup) / 100;
                if (!isNaN(markupVal)) {
                    annualMarkup = Math.max(annualMarkup, markupVal);
                }
            }
        } catch (e) {}
    }

    const totalMarkup = price * annualMarkup * years;
    const totalAmount = price + totalMarkup;
    const monthlyPayment = totalAmount / months;

    return {
        monthlyPayment: Math.round(monthlyPayment),
        deposit: Math.round(price * getVehicleDepositPercent()),
        tenorMonths: months,
        totalAmount: Math.round(totalAmount),
        markupAmount: Math.round(totalMarkup),
        interestRate: annualMarkup,
    };
}

/**
 * Calculates the min and max estimated monthly payments for a vehicle (1-5 year range)
 * Returns { min: number, max: number }
 */
export function getVehiclePaymentRange(
    price: number,
): { min: number; max: number } {
    const yearsMin = 5;
    const yearsMax = 1;
    
    const monthlyMin = calculateMonthlyPayment(price, 'bnpl', 'new', yearsMin).monthlyPayment;
    const monthlyMax = calculateMonthlyPayment(price, 'bnpl', 'new', yearsMax).monthlyPayment;

    return {
        min: monthlyMin,
        max: monthlyMax
    };
}

/**
 * Formats a number to Nigerian Naira (₦)
 */
export function formatNaira(amount: number): string {
    return `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

/**
 * Helper to check if a product is a vehicle based on category or metadata
 */
export function isVehicle(product: any): boolean {
    const category = product?.category?.toLowerCase() || '';
    const name = product?.name?.toLowerCase() || '';
    return (
        category.includes('car') ||
        category.includes('vehicle') ||
        category.includes('automotive') ||
        name.includes('toyota') ||
        name.includes('lexus') ||
        name.includes('mercedes') ||
        name.includes('benz') ||
        name.includes('honda') ||
        name.includes('ford') ||
        name.includes('hyundai')
    );
}
