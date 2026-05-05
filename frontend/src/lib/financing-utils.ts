/**
 * FairPrice.ng Financing Calculator Logic
 * Implements the specific rules for Cars, Solar, and General products.
 */

export interface FinancingTerms {
    type: 'individual' | 'business';
    assetValue: number;
    securityDeposit: number;
    monthlyRepayment: number;
    tenureMonths: number;
    insuranceAnnual?: number;
    interestRate: string;
    collateralRequired: boolean;
}

export const FINANCING_CONSTANTS = {
    CAR_MIN_DEPOSIT: 3000000,
    CAR_INTEREST_RATE: "36% p.a.",
    SOLAR_DEPOSIT_PCT: 0.20, // 20%
    GENERAL_DEPOSIT_PCT: 0.20,
    CONTRACT_1_RATE: 0.36, // 36% p.a.
    CONTRACT_2_6M: 0.11, // 11% flat
    CONTRACT_2_12M: 0.20, // 20% flat
    INSURANCE_FLAT_CAR: 1000000,
    INSURANCE_FLAT_GENERAL_PCT: 0.02, // 2% for Contract 2
};

export function calculateFinancing(
    amount: number,
    type: 'individual' | 'business',
    tenureMonths: number = 12,
    isCar: boolean = false
): FinancingTerms {
    // 1. Car Financing Case (Specific 20M example logic extrapolated)
    if (isCar || amount >= 15000000) {
        return {
            type,
            assetValue: amount,
            securityDeposit: 3000000,
            tenureMonths: 24, // Fixed for cars as per request
            monthlyRepayment: 985870.03,
            insuranceAnnual: 1000000,
            interestRate: "36% p.a.",
            collateralRequired: true
        };
    }

    // 2. Solar / General (20% Deposit Rule)
    const deposit = amount * FINANCING_CONSTANTS.SOLAR_DEPOSIT_PCT;
    const fundedAmount = amount - deposit;
    
    // Contract 1: 36% p.a.
    const monthlyRate = 0.36 / 12;
    const numerator = fundedAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths);
    const denominator = Math.pow(1 + monthlyRate, tenureMonths) - 1;
    const monthlyRepayment = numerator / denominator;

    return {
        type,
        assetValue: amount,
        securityDeposit: deposit,
        tenureMonths,
        monthlyRepayment: Math.round(monthlyRepayment * 100) / 100,
        interestRate: "36% p.a.",
        collateralRequired: true
    };
}

export function getRequiredDocuments(type: 'individual' | 'business', isCar: boolean = false) {
    if (isCar) {
        return [
            "CAC Documents",
            "2 Years Audited Financials",
            "Cash Flow Projection",
            "1 Year Statement of Account",
            "Company Profile",
            "Energy Audit (if applicable)"
        ];
    }

    if (type === 'business') {
        return [
            "CAC (Form 1 & 2)",
            "1 Year Bank Statement",
            "Vendor's Invoice",
            "Business Application Form"
        ];
    }

    return [
        "6 Months Bank Statement",
        "Confirmation Letter",
        "Individual Application Form",
        "Vendor's Invoice"
    ];
}

// ─── COMPATIBILITY EXPORTS ──────────────────────────────────

export function hasFinancing(product: any): boolean {
    if (!product) return false;
    const cat = product.category?.toLowerCase() || '';
    const price = product.price || 0;
    
    // Auto-enable for cars and expensive items
    if (cat.includes('car') || cat.includes('vehicle')) return true;
    if (cat.includes('solar') || cat.includes('inverter')) return true;
    if (price >= 200000) return true;
    
    return !!product.financingAvailable;
}

export function isVehicle(product: any): boolean {
    if (!product) return false;
    const cat = product.category?.toLowerCase() || '';
    return cat.includes('car') || cat.includes('vehicle');
}

export function getVehicleDepositPercent(): number {
    return 0.15; // 15% as per system setting default
}

export function calculateMonthlyPayment(product: any, tenureOrType?: number | string, condition?: string) {
    const amount = typeof product === 'number' ? product : (product?.price || 0);
    const isCar = typeof product === 'number' ? (condition === 'foreign_used' || amount >= 5000000) : isVehicle(product);
    
    // Support (amount, type, condition) or (product, tenureYears)
    let tenure = 12;
    if (typeof tenureOrType === 'number') {
        tenure = tenureOrType * 12;
    } else if (isCar) {
        tenure = 24;
    }

    const terms = calculateFinancing(amount, 'individual', tenure, isCar);
    
    return {
        monthlyPayment: terms.monthlyRepayment,
        deposit: terms.securityDeposit,
        tenureMonths: terms.tenureMonths,
        tenorMonths: terms.tenureMonths, // Alias for compatibility
        interestRate: terms.interestRate,
        interestRateNumber: 0.36, // Numeric version for calculations
        totalAmount: terms.monthlyRepayment * terms.tenureMonths + terms.securityDeposit,
        total_repayment: terms.monthlyRepayment * terms.tenureMonths + terms.securityDeposit
    };
}

export const calculateProductMonthlyPayment = calculateMonthlyPayment;

export function getProductPaymentRange(product: any) {
    const loan = calculateMonthlyPayment(product);
    return {
        min: loan.monthlyPayment,
        max: loan.monthlyPayment,
        deposit: loan.deposit
    };
}

export function formatNaira(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0
    }).format(amount);
}
