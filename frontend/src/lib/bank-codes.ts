/**
 * Shared Nigerian bank code mapping for Paystack transfers.
 * Used by both the admin payout approval flow and automated QR payout flow.
 */
export const BANK_CODES: Record<string, string> = {
    "Access Bank": "044",
    "First Bank of Nigeria": "011",
    "Guaranty Trust Bank (GTBank)": "058",
    "GTBank": "058",
    "United Bank for Africa (UBA)": "033",
    "UBA": "033",
    "Zenith Bank": "057",
    "Ecobank Nigeria": "050",
    "Fidelity Bank": "070",
    "First City Monument Bank (FCMB)": "214",
    "FCMB": "214",
    "Heritage Banking Company": "030",
    "Keystone Bank": "082",
    "Polaris Bank": "076",
    "Stanbic IBTC Bank": "221",
    "Standard Chartered Bank": "068",
    "Sterling Bank": "232",
    "Union Bank of Nigeria": "032",
    "Unity Bank": "215",
    "Wema Bank": "035",
    "Kuda Microfinance Bank": "50211",
    "Kuda": "50211",
    "OPay": "100004",
    "Opay": "100004",
    "PalmPay": "100033",
    "Palmpay": "100033",
    "Moniepoint": "50515",
    "Jaiz Bank": "301",
    "ALAT by Wema": "035",
    "Providus Bank": "101",
    "Titan Trust Bank": "102",
    "Globus Bank": "103",
    "TAJ Bank": "302",
    "SunTrust Bank": "100",
    "Parallex Bank": "104",
};

/**
 * Resolve a bank name to its Paystack bank code.
 * Performs a case-insensitive partial match as a fallback.
 */
export function resolveBankCode(bankName: string): string {
    // Direct match
    if (BANK_CODES[bankName]) return BANK_CODES[bankName];

    // Case-insensitive exact match
    const lowerName = bankName.toLowerCase();
    for (const [key, code] of Object.entries(BANK_CODES)) {
        if (key.toLowerCase() === lowerName) return code;
    }

    // Partial match (e.g., "GT Bank" → "Guaranty Trust Bank (GTBank)")
    for (const [key, code] of Object.entries(BANK_CODES)) {
        if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
            return code;
        }
    }

    console.warn(`⚠️ Unknown bank name "${bankName}" — defaulting to Access Bank (044)`);
    return "044"; // Fallback
}
