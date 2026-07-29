// Selectable delivery carriers — SpeeDAF is the default (auto-fulfillment and
// the picker both start here) with other real Nigerian couriers as alternatives.
// No live carrier API is wired in for any of these yet (see stepFulfillment in
// zema360/process-order/route.ts) — this is what a seller/admin picks, not a
// dispatch integration.
export const CARRIERS = ["SpeeDAF", "GIG Logistics", "DHL Nigeria", "Jumia Logistics", "RedStar Express"] as const;
export const DEFAULT_CARRIER = "SpeeDAF";
