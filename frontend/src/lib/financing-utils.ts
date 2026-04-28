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
 * Supports both modern (product: Product, years?: number) and legacy (price: number, type?: string, condition?: string) signatures.
 */
export function calculateProductMonthlyPayment(
    productOrPrice: any,
    yearsOrType?: number | string,
    legacyCondition?: string
): LoanResult {
    let price = 0;
    let condition: string = 'foreign_used';
    let productObj: any = {};
    let requestedYears: number | undefined;

    if (typeof productOrPrice === 'number') {
        price = productOrPrice;
        condition = legacyCondition || 'foreign_used';
        productObj = { price, condition };
        requestedYears = typeof yearsOrType === 'number' ? yearsOrType : undefined;
    } else {
        productObj = productOrPrice || {};
        price = productObj.price || 0;
        condition = productObj.condition || 'foreign_used';
        requestedYears = typeof yearsOrType === 'number' ? yearsOrType : undefined;
    }

    const isVeh = isVehicle(productObj);
    
    // Base configuration
    let depositPct = getVehicleDepositPercent(); 
    let baseTenor = isVeh ? (LOAN_CONSTANTS.TENORS[condition as VehicleCondition] || 4) : 1; 
    let baseMarkup = LOAN_CONSTANTS.BASE_MARKUP_PA;
    let fixedDeposit: number | undefined = productObj.financing_down_payment;

    // Apply product-specific overrides if configured
    if (productObj?.financing_config?.enabled) {
        if (productObj.financing_config.deposit_percent !== undefined) {
             depositPct = productObj.financing_config.deposit_percent;
        }
        if (productObj.financing_config.interest_rate_pa !== undefined) {
             baseMarkup = productObj.financing_config.interest_rate_pa;
        }
        if (productObj.financing_config.max_tenor_months !== undefined) {
             baseTenor = Math.max(1, Math.floor(productObj.financing_config.max_tenor_months / 12));
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

    // Correct Loan Calculation:
    // 1. Calculate Deposit
    const depositAmount = fixedDeposit !== undefined ? fixedDeposit : Math.round(price * depositPct);
    
    // 2. Loan Principal is the balance after deposit
    const loanPrincipal = Math.max(0, price - depositAmount);
    
    // 3. Total Interest (Markup) applied to the principal only
    const totalMarkup = loanPrincipal * annualMarkup * years;
    
    // 4. Total Loan Repayment (Principal + Interest)
    const totalLoanRepayment = loanPrincipal + totalMarkup;
    
    // 5. Monthly installment
    const monthlyPayment = months > 0 ? (totalLoanRepayment / months) : 0;

    return {
        monthlyPayment: Math.round(monthlyPayment),
        deposit: depositAmount,
        tenorMonths: months,
        totalAmount: Math.round(depositAmount + totalLoanRepayment), // Total cost to customer
        markupAmount: Math.round(totalMarkup),
        interestRate: annualMarkup,
    };
}

/**
 * Legacy alias for backward compatibility with existing imports.
 */
export const calculateMonthlyPayment = calculateProductMonthlyPayment;


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
 */
export function hasFinancing(product: any): boolean {
    if (!product) return false;
    if (product.financing_config?.enabled) return true;
    if (product.financing_available === true) return true;
    return isVehicle(product);
}
