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
 * Calculates monthly payment based on Altdrive Ijarah logic, accepting a product object.
 */
export function calculateProductMonthlyPayment(
    product: any,
    requestedYears?: number
): LoanResult {
    const isVeh = isVehicle(product);
    const condition = product?.condition || 'foreign_used';
    const price = product?.price || 0;
    
    // Base configuration
    let depositPct = getVehicleDepositPercent(); 
    let baseTenor = isVeh ? (LOAN_CONSTANTS.TENORS[condition as VehicleCondition] || 4) : 1; 
    let baseMarkup = LOAN_CONSTANTS.BASE_MARKUP_PA;

    // Apply product-specific overrides if configured
    if (product?.financing_config?.enabled) {
        if (product.financing_config.deposit_percent !== undefined) {
             depositPct = product.financing_config.deposit_percent;
        }
        if (product.financing_config.interest_rate_pa !== undefined) {
             baseMarkup = product.financing_config.interest_rate_pa;
        }
        if (product.financing_config.max_tenor_months !== undefined) {
             baseTenor = Math.max(1, Math.floor(product.financing_config.max_tenor_months / 12));
        }
    }

    const years = requestedYears !== undefined ? requestedYears : baseTenor;
    const months = years * 12;

    let annualMarkup = baseMarkup + (years - 1) * LOAN_CONSTANTS.MARKUP_STEP_PA;

    // Admin Global Override
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
        deposit: Math.round(price * depositPct),
        tenorMonths: months,
        totalAmount: Math.round(totalAmount),
        markupAmount: Math.round(totalMarkup),
        interestRate: annualMarkup,
    };
}

/**
 * Calculates the min and max estimated monthly payments for a product
 * Returns { min: number, max: number }
 */
export function getProductPaymentRange(
    product: any
): { min: number; max: number } {
    let maxYears = 1;
    let minYears = 1;
    
    if (isVehicle(product)) {
         maxYears = 5;
    } else {
         maxYears = product?.financing_config?.max_tenor_months ? Math.floor(product.financing_config.max_tenor_months / 12) : 2; 
    }
    
    maxYears = Math.max(1, maxYears);

    const monthlyMinPayment = calculateProductMonthlyPayment(product, maxYears).monthlyPayment;
    const monthlyMaxPayment = calculateProductMonthlyPayment(product, minYears).monthlyPayment;

    return {
        min: monthlyMinPayment,
        max: monthlyMaxPayment
    };
}

/**
 * Formats a number to Nigerian Naira (₦)
 */
export function formatNaira(amount: number): string {
    return `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

/**
 * Helper to check if a product is a vehicle explicitly
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

/**
 * Checks if a product qualifies for financing display
 */
export function hasFinancing(product: any): boolean {
    if (!product) return false;
    if (product.financing_config?.enabled) return true;
    if (product.financing_available === true) return true;
    return isVehicle(product);
}
