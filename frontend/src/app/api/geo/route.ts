import { NextResponse } from "next/server";

// Vercel automatically injects x-vercel-ip-country on every request (ISO 3166-1 alpha-2).
// This route exposes it safely — no user input is processed, no PII is stored.
export const dynamic = "force-dynamic";

// ─── Country name lookup ───────────────────────────────────────────────────────
// Covers the most common countries globally. Unknown codes fall back to the
// raw 2-letter code so the UI always has something meaningful to display.
const COUNTRY_NAMES: Record<string, string> = {
    // Africa
    NG: "Nigeria", GH: "Ghana", KE: "Kenya", ZA: "South Africa", EG: "Egypt",
    ET: "Ethiopia", TZ: "Tanzania", UG: "Uganda", SN: "Senegal", CI: "Côte d'Ivoire",
    CM: "Cameroon", ZM: "Zambia", ZW: "Zimbabwe", RW: "Rwanda", MZ: "Mozambique",
    AO: "Angola", BJ: "Benin", TG: "Togo", ML: "Mali", BF: "Burkina Faso",
    NE: "Niger", TD: "Chad", SD: "Sudan", LY: "Libya", TN: "Tunisia",
    DZ: "Algeria", MA: "Morocco", MR: "Mauritania", GM: "Gambia", GN: "Guinea",
    SL: "Sierra Leone", LR: "Liberia", SO: "Somalia", ER: "Eritrea",
    // Europe
    GB: "United Kingdom", DE: "Germany", FR: "France", IT: "Italy", ES: "Spain",
    PT: "Portugal", NL: "Netherlands", BE: "Belgium", CH: "Switzerland",
    AT: "Austria", SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland",
    PL: "Poland", CZ: "Czech Republic", SK: "Slovakia", HU: "Hungary",
    RO: "Romania", BG: "Bulgaria", GR: "Greece", HR: "Croatia", RS: "Serbia",
    IE: "Ireland", IS: "Iceland", LU: "Luxembourg", MT: "Malta", CY: "Cyprus",
    UA: "Ukraine", RU: "Russia", TR: "Turkey",
    // Americas
    US: "United States", CA: "Canada", MX: "Mexico", BR: "Brazil", AR: "Argentina",
    CO: "Colombia", CL: "Chile", PE: "Peru", VE: "Venezuela", EC: "Ecuador",
    BO: "Bolivia", PY: "Paraguay", UY: "Uruguay", GY: "Guyana", SR: "Suriname",
    CR: "Costa Rica", PA: "Panama", GT: "Guatemala", HN: "Honduras", SV: "El Salvador",
    NI: "Nicaragua", JM: "Jamaica", TT: "Trinidad and Tobago", BB: "Barbados",
    HT: "Haiti", DO: "Dominican Republic", CU: "Cuba",
    // Middle East & Asia
    AE: "UAE", SA: "Saudi Arabia", QA: "Qatar", KW: "Kuwait", BH: "Bahrain",
    OM: "Oman", JO: "Jordan", LB: "Lebanon", IL: "Israel", IQ: "Iraq",
    IR: "Iran", PK: "Pakistan", IN: "India", BD: "Bangladesh", LK: "Sri Lanka",
    NP: "Nepal", MM: "Myanmar", TH: "Thailand", VN: "Vietnam", KH: "Cambodia",
    LA: "Laos", MY: "Malaysia", SG: "Singapore", ID: "Indonesia", PH: "Philippines",
    CN: "China", JP: "Japan", KR: "South Korea", KP: "North Korea", TW: "Taiwan",
    HK: "Hong Kong", MO: "Macao", MN: "Mongolia", KZ: "Kazakhstan",
    UZ: "Uzbekistan", AF: "Afghanistan",
    // Oceania
    AU: "Australia", NZ: "New Zealand", FJ: "Fiji", PG: "Papua New Guinea",
};

/** Converts an ISO 3166-1 alpha-2 code to the corresponding flag emoji. */
function codeToFlag(code: string): string {
    try {
        return [...code.toUpperCase()]
            .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
            .join("");
    } catch {
        return "🌍";
    }
}

export async function GET(req: Request) {
    // Vercel sets x-vercel-ip-country on every edge request.
    // In local dev the header is absent; fall back to NG (primary market).
    const raw = req.headers.get("x-vercel-ip-country") ?? "";
    // Sanitise: only accept 2-letter uppercase alpha codes
    const countryCode = /^[A-Z]{2}$/.test(raw.toUpperCase()) ? raw.toUpperCase() : "NG";
    const countryName = COUNTRY_NAMES[countryCode] ?? countryCode;
    const flag = codeToFlag(countryCode);

    return NextResponse.json(
        { countryCode, countryName, flag },
        {
            headers: {
                // Private — personalised per-user; CDN must not share one user's country
                // with another. Browser may cache for 24 h (one page-load session is enough).
                "Cache-Control": "private, max-age=86400",
            },
        }
    );
}
