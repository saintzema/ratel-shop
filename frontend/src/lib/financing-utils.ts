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
    BNPL_MARKUP_PA: 0.34, // 34% p.a. markup
    LEASE_MARKUP_PA: 0.395, // 39.5% p.a. markup (includes insurance/reg)
    BNPL_DEPOSIT_PERCENT: 0.15, // 15% deposit loan requirement (default, overridable by admin)
    TENORS: {
        new: 5, // 5 years
        foreign_used: 4, // 4 years
        nigerian_used: 3, // 3 years
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
 * Calculates monthly payment based on user-provided baseline profit rates.
 * Baseline: ₦30m vehicle -> ₦3,121,455.84 / month over 12 months.
 * Effective monthly rate from baseline: ~10.4% of total price.
 */
export function calculateMonthlyPayment(
    price: number,
    type: LoanType = 'bnpl',
    condition: VehicleCondition = 'foreign_used',
    requestedYears?: number
): LoanResult {
    const years = requestedYears !== undefined ? requestedYears : (LOAN_CONSTANTS.TENORS[condition] || 4);
    const months = years * 12;
    let annualMarkup = type === 'bnpl' ? LOAN_CONSTANTS.BNPL_MARKUP_PA : LOAN_CONSTANTS.LEASE_MARKUP_PA;
    
    // Dynamic override from Admin Settings if available
    if (typeof window !== "undefined") {
        try {
            const dynamicMarkup = localStorage.getItem("fp_vehicle_markup");
            if (dynamicMarkup) {
                // If admin sets 12%, we use that as a baseline annual markup override or addition
                // Here we'll treat it as a % increase to the BASE annual markup for simplicity in this demo
                const markupVal = parseFloat(dynamicMarkup) / 100;
                if (!isNaN(markupVal)) {
                    // We'll treat the admin setting as a minimum annual markup or a direct override if for vehicles
                    annualMarkup = Math.max(annualMarkup, markupVal * 3); // Multiplying by 3 to reach realistic annual rates if 12% is set as 'transaction markup'
                }
            }
        } catch (e) {}
    }

    // Logic: Total = Price + (Price * AnnualMarkup * Years)
    // Monthly = Total / Months
    const totalMarkup = price * annualMarkup * years;
    const totalAmount = price + totalMarkup;
    const monthlyPayment = totalAmount / months;

    // Deposit Logic
    let deposit = 0;
    if (type === 'bnpl') {
        deposit = price * getVehicleDepositPercent();
    } else {
        // Lease-to-Own: 3 months rental deposit
        deposit = monthlyPayment * 3;
    }

    return {
        monthlyPayment: Math.round(monthlyPayment),
        deposit: Math.round(deposit),
        tenorMonths: months,
        totalAmount: Math.round(totalAmount),
        markupAmount: Math.round(totalMarkup),
        interestRate: annualMarkup,
    };
}

/**
 * Calculates the min and max estimated monthly payments for a vehicle
 * Returns { min: number, max: number }
 */
export function getVehiclePaymentRange(
    price: number,
    type: LoanType = 'bnpl',
    condition: VehicleCondition = 'foreign_used'
): { min: number; max: number } {
    return getFinancingPaymentRange(price, type, condition);
}

/**
 * Calculates the min and max estimated monthly payments for a product
 * Returns { min: number, max: number }
 */
export function getFinancingPaymentRange(
    price: number,
    type: LoanType = 'bnpl',
    condition: VehicleCondition = 'foreign_used'
): { min: number; max: number } {
    const minYears = 1;
    const maxYears = LOAN_CONSTANTS.TENORS[condition] || 4;
    
    let annualMarkup = type === 'bnpl' ? LOAN_CONSTANTS.BNPL_MARKUP_PA : LOAN_CONSTANTS.LEASE_MARKUP_PA;
    
    if (typeof window !== "undefined") {
        try {
            const dynamicMarkup = localStorage.getItem("fp_vehicle_markup");
            if (dynamicMarkup) {
                const markupVal = parseFloat(dynamicMarkup) / 100;
                if (!isNaN(markupVal)) {
                    annualMarkup = Math.max(annualMarkup, markupVal * 3);
                }
            }
        } catch (e) {}
    }

    // Min years = highest monthly payment
    const totalMarkup1 = price * annualMarkup * minYears;
    const monthlyPaymentHighest = (price + totalMarkup1) / (minYears * 12);
    
    // Max years = lowest monthly payment
    const totalMarkupMax = price * annualMarkup * maxYears;
    const monthlyPaymentLowest = (price + totalMarkupMax) / (maxYears * 12);

    return {
        min: Math.round(monthlyPaymentLowest),
        max: Math.round(monthlyPaymentHighest)
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
    
    // Explicitly exclude car accessories
    const isAccessory = name.match(/\b(vacuum|cushion|seat|camera|dash|care|kit|tool|tire|bumper|accessory|charger|mount|holder|light|led|cover|mat)\b/);
    if (isAccessory) return false;

    // Enforce a realistic minimum price for vehicle financing (e.g. > ₦500,000)
    if (product?.price && typeof product.price === 'number' && product.price < 500000) return false;

    return (
        category.includes('car') ||
        category.includes('vehicles') ||
        category.includes('automotive') ||
        name.includes('toyota') ||
        name.includes('lexus') ||
        name.includes('mercedes') ||
        name.includes('benz') ||
        name.includes('honda') ||
        name.includes('ford') ||
        name.includes('hyundai') ||
        name.includes('baic') ||
        name.includes('changan') ||
        name.includes('xpeng')
    );
}

/**
 * Checks if a product qualifies for financing display (BNPL/Lease)
 */
export function hasFinancing(product: any): boolean {
    if (!product) return false;
    
    // Explicit toggle from JSON/DB
    if (product.financing_available === true) return true;
    
    // Auto-enable for vehicles (per current requirement)
    if (isVehicle(product)) return true;
    
    return false;
}
