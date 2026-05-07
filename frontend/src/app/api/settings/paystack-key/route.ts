import { NextResponse } from 'next/server';

export async function GET() {
  // In a real app, this would fetch from a secure DB or vault
  // For now, we return the env var to keep it dynamic and configurable via Vercel
  const key = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 
              process.env.NEXT_PUBLIC_PAYSTACK_KEY || 
              "pk_test_mock";
              
  return NextResponse.json({ key });
}
