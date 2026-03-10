import { NextRequest, NextResponse } from "next/server";

let dbModule: any = null;

async function getDb() {
  if (!dbModule) {
    try {
      dbModule = await import("@/lib/db");
    } catch {
      dbModule = null;
    }
  }
  return dbModule?.db ?? null;
}

async function sendWelcomeEmail(email: string, waitlistPosition: number | string) {
  // Only attempt if API key exists
  if (!process.env.RESEND_API_KEY) return;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const logoUrl = "https://fairprice-ten.vercel.app/logo.png";

    const data = await resend.emails.send({
      from: "Ziva from FairPrice <hello@fairprice.zemaai.com>",
      to: email,
      subject: "Welcome to FairPrice — You're officially on the list! 🍾",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:20px auto;background:white;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#059669 0%,#10b981 50%,#34d399 100%);padding:24px 20px;text-align:center;display:flex;align-items:center;justify-content:center;gap:12px;">
      <img src="${logoUrl}" alt="FairPrice" width="40" height="auto" style="display:inline-block;margin:0;max-width:40px;border-radius:8px;" />
      <div style="text-align:left;">
        <h1 style="color:white;font-size:20px;font-weight:900;margin:0;letter-spacing:-0.5px;line-height:1.2;padding:12px">Welcome to FairPrice</h1>
        <p style="color:rgba(255,255,255,0.9);font-size:12px;margin:0;font-weight:600;padding:12px">Africa's First AI-Powered Marketplace</p>
      </div>
    </div>
    <div style="padding:24px 32px 32px;">
      <p style="color:#111827;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
        You're <strong style="color:#059669;">#${waitlistPosition}</strong> on the waitlist! We're thrilled to have you join the movement to end unfair pricing in Nigeria.
      </p>
      <h2 style="color:#111827;font-size:16px;font-weight:800;margin:0 0 16px 0;">Here's what you'll get access to:</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:12px;background:#f0fdf4;border-radius:12px;" valign="top"><strong style="color:#059669;font-size:14px;">AI-Regulated Prices</strong><p style="color:#6b7280;font-size:12px;margin:4px 0 0 0;">Our AI ensures every product is fairly priced.</p></td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="padding:12px;background:#eff6ff;border-radius:12px;" valign="top"><strong style="color:#2563eb;font-size:14px;">Price Negotiation</strong><p style="color:#6b7280;font-size:12px;margin:4px 0 0 0;">Haggle directly with sellers.</p></td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="padding:12px;background:#faf5ff;border-radius:12px;" valign="top"><strong style="color:#7c3aed;font-size:14px;">Global Sourcing</strong><p style="color:#6b7280;font-size:12px;margin:4px 0 0 0;">Get any product from anywhere delivered to your doorstep.</p></td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="padding:12px;background:#fff7ed;border-radius:12px;" valign="top"><strong style="color:#ea580c;font-size:14px;">Free Delivery</strong><p style="color:#6b7280;font-size:12px;margin:4px 0 0 0;">Pay on our platform and enjoy free delivery nationwide.</p></td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="padding:12px;background:#f0fdfa;border-radius:12px;" valign="top"><strong style="color:#0d9488;font-size:14px;">Start Selling</strong><p style="color:#6b7280;font-size:12px;margin:4px 0 0 0;">Register as a seller, open your store in minutes, and reach millions.</p></td></tr>
      </table>
      <div style="text-align:center;margin-top:28px;">
        <a href="https://fairprice.ng" style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:white;text-decoration:none;padding:14px 36px;border-radius:14px;font-weight:800;font-size:14px;box-shadow:0 4px 14px rgba(5,150,105,0.3);">Visit FairPrice.ng</a>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;line-height:1.5;">We'll email you as soon as we launch.<br>Stay tuned — fair pricing is coming.</p>
    </div>
    <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} FairPrice.ng &mdash; Shop Fair. Sell Fair. Live Fair.</p>
    </div>
  </div>
</body>
</html>
      `.trim(),
    });

    if (data.error) {
      console.error(`📧 [Waitlist] Resend error for ${email}:`, data.error);
    } else {
      console.log(`📧 [Waitlist] Welcome email sent to ${email} (ID: ${data.data?.id})`);
    }
  } catch (err) {
    console.error(`📧 [Waitlist] Failed to send email to ${email}:`, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    let position: number | string = "2848+";

    // Try DB — gracefully degrade if not available
    const db = await getDb();
    if (db) {
      try {
        await db.waitlist.upsert({
          where: { email },
          create: { email },
          update: {},
        });
        const count = await db.waitlist.count();
        position = count;
        console.log(`✅ [Waitlist] Signup: ${email} | Position: #${position}`);
      } catch (dbError: any) {
        console.warn("[Waitlist] DB error, continuing without persistence:", dbError.message);
      }
    } else {
      console.warn("[Waitlist] No database connection — signup saved client-side only");
    }

    // Send welcome email
    await sendWelcomeEmail(email, position);

    return NextResponse.json({ message: "Added to waitlist", count: position });
  } catch (err) {
    console.error("[Waitlist] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ emails: [], count: 0 });
    }
    const emails = await db.waitlist.findMany({
      orderBy: { createdAt: "desc" },
      select: { email: true, createdAt: true },
    });
    return NextResponse.json({ emails, count: emails.length });
  } catch (err) {
    console.error("[Waitlist] Error reading from DB:", err);
    return NextResponse.json({ error: "Server error", emails: [], count: 0 }, { status: 500 });
  }
}
