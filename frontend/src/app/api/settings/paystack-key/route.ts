import { NextResponse } from 'next/server';

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
