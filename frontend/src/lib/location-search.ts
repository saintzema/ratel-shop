import { NIGERIAN_STATES } from "@/lib/nigerian-states";

export interface ParsedLocation {
    state: string | null;
    city: string | null;
    remainingQuery: string; // the search text with the location phrase stripped out
}

// Flat lookup of every (city, state) pair once, not per-call.
const CITY_INDEX: { city: string; state: string }[] = NIGERIAN_STATES.flatMap((s) =>
    s.cities.map((c) => ({ city: c, state: s.state }))
);
const STATE_NAMES = NIGERIAN_STATES.map((s) => s.state);

/**
 * Best-effort extraction of a Nigerian state/city from free-text search, e.g.
 * "cars in Maitama, Abuja" → { city: "Maitama", state: "Abuja (FCT)",
 * remainingQuery: "cars" }. Matches longest city names first so "Wuse 2"
 * doesn't get shadowed by a search that would otherwise only find "Wuse".
 */
export function parseLocationFromQuery(query: string): ParsedLocation {
    const q = query.trim();
    if (!q) return { state: null, city: null, remainingQuery: q };

    let remaining = q;
    let matchedCity: string | null = null;
    let matchedState: string | null = null;

    const sortedCities = [...CITY_INDEX].sort((a, b) => b.city.length - a.city.length);
    for (const { city, state } of sortedCities) {
        const re = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (re.test(remaining)) {
            matchedCity = city;
            matchedState = state;
            remaining = remaining.replace(re, "").trim();
            break;
        }
    }

    if (!matchedState) {
        const sortedStates = [...STATE_NAMES].sort((a, b) => b.length - a.length);
        for (const state of sortedStates) {
            const bare = state.replace(/\s*\(FCT\)/i, "");
            const re = new RegExp(`\\b${bare.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
            if (re.test(remaining)) {
                matchedState = state;
                remaining = remaining.replace(re, "").trim();
                break;
            }
        }
    }

    // Strip filler words left behind ("in", "at", trailing/leading commas) so the
    // remaining text is just the product query, e.g. "cars in Maitama" → "cars".
    remaining = remaining
        .replace(/\b(in|at|near)\b/gi, " ")
        .replace(/,/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return { state: matchedState, city: matchedCity, remainingQuery: remaining };
}

// Tiering used to rank/group results by locality — lower number = closer/more relevant.
export function locationTier(
    target: { state: string | null; city: string | null },
    sellerState: string | null | undefined,
    sellerCity: string | null | undefined
): number {
    if (!target.state && !target.city) return 0; // no location constraint — everyone's tier 0
    if (target.city && sellerCity && sellerCity.toLowerCase() === target.city.toLowerCase()) return 0; // exact city
    if (target.state && sellerState && sellerState.toLowerCase() === target.state.toLowerCase()) return 1; // same state, different city
    return 2; // everywhere else
}
