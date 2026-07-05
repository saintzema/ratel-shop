import { NextResponse } from 'next/server';

// This route has no cookie/header reads, so Next.js App Router would otherwise
// statically cache the response at build time — permanently baking in whatever
// PAYSTACK_PUBLIC_KEY happened to be set during that build. force-dynamic makes
// sure a live env var change always takes effect immediately, no rebuild needed.
export const dynamic = "force-dynamic";

export async function GET() {
  // Read from server-only env var (no NEXT_PUBLIC_ prefix = not baked into client bundle).
  // In Vercel, set: PAYSTACK_PUBLIC_KEY = pk_live_xxxx
  // Fallback chain covers common naming variations.
  const key =
    process.env.PAYSTACK_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_PAYSTACK_KEY ||
    "";

  if (!key) {
    console.warn("[paystack-key] No Paystack public key configured. Set PAYSTACK_PUBLIC_KEY in Vercel env.");
  }

  return NextResponse.json({ key });
}
