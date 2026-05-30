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
    // 1. Car Financing Case
    if (isCar || amount >= 15000000) {
        return {
            type,
            assetValue: amount,
            securityDeposit: amount * 0.15, // 15% deposit for cars
            tenureMonths: tenureMonths, // Use provided duration
            monthlyRepayment: Math.round(((amount * 0.85) * (1 + 0.36 * (tenureMonths / 12))) / tenureMonths),
            insuranceAnnual: amount * 0.05, // 5% flat insurance placeholder
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

export function getFinancingThreshold(): number {
    if (typeof window !== 'undefined') {
        try {
            const config = localStorage.getItem("fairprice_admin_settings");
            if (config) {
                const parsed = JSON.parse(config);
                if (parsed.bnplThreshold) return Number(parsed.bnplThreshold);
            }
        } catch { /* ignore */ }
    }
    return 400000; // Strict default
}

export function hasFinancing(product: any): boolean {
    if (!product) return false;

    // Seller explicitly disabled it → never show, regardless of price or category
    if (product.financing_available === false) return false;

    const price = product.price || 0;
    const threshold = getFinancingThreshold();
    // Strict enforcement: No financing under threshold regardless of category
    if (price < threshold) return false;

    // Seller explicitly enabled it → show (price already passed threshold above)
    if (product.financing_available === true) return true;

    // financing_available not set (legacy products) → auto-qualify by category/price
    const cat = product.category?.toLowerCase() || '';
    if (cat.includes('car') || cat.includes('vehicle')) return true;
    if (cat.includes('solar') || cat.includes('inverter')) return true;

    return true; // Above threshold with no explicit setting → show
}

export function isVehicle(product: any): boolean {
    if (!product) return false;
    const cat = product.category?.toLowerCase() || '';
    return cat.includes('car') || cat.includes('vehicle');
}

export function isSolar(product: any): boolean {
    if (!product) return false;
    const cat = product.category?.toLowerCase() || '';
    const name = product.name?.toLowerCase() || '';
    return cat.includes('solar') || cat.includes('inverter') || name.includes('solar') || name.includes('inverter') || name.includes('panel') || name.includes('battery');
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
        tenure = 48; // Default to 4 years for cars
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
