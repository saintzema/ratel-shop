// ISO 3166-1 country code → ISO 4217 currency code, for converting a display
// price to whatever an international visitor actually thinks in. Only needs
// to cover countries FairPrice realistically gets traffic from — unmapped
// countries just don't get a conversion line, which is a safe fallback.
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
    NG: "NGN",
    US: "USD", CA: "USD", GB: "GBP", IE: "EUR",
    DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR",
    PT: "EUR", AT: "EUR", FI: "EUR", GR: "EUR", LU: "EUR", MT: "EUR", CY: "EUR",
    CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK",
    GH: "GHS", KE: "KES", ZA: "ZAR", EG: "EGP", TZ: "TZS", UG: "UGX",
    RW: "RWF", ET: "ETB", ZM: "ZMW", SN: "XOF", CI: "XOF", BJ: "XOF",
    TG: "XOF", ML: "XOF", BF: "XOF", NE: "XOF", CM: "XAF",
    IN: "INR", PK: "PKR", BD: "BDT", CN: "CNY", JP: "JPY", KR: "KRW",
    SG: "SGD", MY: "MYR", ID: "IDR", PH: "PHP", TH: "THB", VN: "VND",
    HK: "HKD", TW: "TWD", AU: "AUD", NZ: "NZD",
    AE: "AED", SA: "SAR", QA: "QAR", KW: "KWD", TR: "TRY", IL: "ILS",
    BR: "BRL", MX: "MXN", AR: "ARS",
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: "$", GBP: "£", EUR: "€", CHF: "CHF ", SEK: "kr", NOK: "kr", DKK: "kr",
    PLN: "zł", CZK: "Kč", GHS: "GH₵", KES: "KSh", ZAR: "R", EGP: "E£",
    TZS: "TSh", UGX: "USh", RWF: "FRw", ETB: "Br", ZMW: "ZK", XOF: "CFA",
    XAF: "FCFA", INR: "₹", PKR: "₨", BDT: "৳", CNY: "¥", JPY: "¥", KRW: "₩",
    SGD: "S$", MYR: "RM", IDR: "Rp", PHP: "₱", THB: "฿", VND: "₫",
    HKD: "HK$", TWD: "NT$", AUD: "A$", NZD: "NZ$", AED: "د.إ", SAR: "﷼",
    QAR: "﷼", KWD: "د.ك", TRY: "₺", ILS: "₪", BRL: "R$", MXN: "$", ARS: "$",
};

/** Convert an NGN amount into another currency using a real NGN-base rate table. */
export function convertFromNgn(amountNgn: number, currencyCode: string, rates: Record<string, number>): number | null {
    const rate = rates[currencyCode];
    if (!rate) return null;
    return amountNgn * rate;
}

/** e.g. "$12.40" — no fixed decimals forced beyond what Intl considers natural for the currency. */
export function formatConverted(amount: number, currencyCode: string): string {
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currencyCode,
            maximumFractionDigits: amount >= 100 ? 0 : 2,
        }).format(amount);
    } catch {
        const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode + " ";
        return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
}
