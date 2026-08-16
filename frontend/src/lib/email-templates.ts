export type EmailType = 'WELCOME' | 'VERIFY_EMAIL' | 'ORDER_PLACED' | 'ORDER_DELIVERED' | 'ORDER_COMPLETED' | 'CHANGE_PASSWORD' | 'PROMOTIONAL' | 'SELLER_WELCOME' | 'SELLER_APPROVED' | 'SELLER_PAYOUT_REQUEST' | 'ADMIN_NEW_KYC' | 'PLAN_EXPIRY' | 'SELLER_NEW_ORDER' | 'SELLER_IMAGE_REQUEST' | 'NEGOTIATION_REQUEST' | 'NEGOTIATION_ACCEPTED' | 'NEGOTIATION_REJECTED' | 'COUNTER_OFFER_DECLINED' | 'ORDER_CANCELLED' | 'RETURN_REQUESTED' | 'RETURN_UPDATED' | 'ORDER_SHIPPED' | 'ORDER_INQUIRY' | 'NEW_DISPUTE' | 'RESTOCK_ALERT' | 'BUYER_ORDER_MESSAGE' | 'NEW_CHAT_MESSAGE' | 'SELLER_PAYOUT_COMPLETED' | 'SELLER_PAYOUT_FAILED' | 'ESCROW_RELEASED' | 'DISPUTE_RESOLVED' | 'SYSTEM_ALERT' | 'QUOTE_PAYMENT_RECEIPT';

interface EmailTemplatePayload {
    name?: string;
    // Quote payment receipt (guest checkout on a seller's invoice link).
    // `title` already exists further down this interface.
    quoteUrl?: string;
    balance?: string | null;
    code?: string;
    orderId?: string;
    productName?: string;
    amount?: number;
    trackingUrl?: string;
    sellerName?: string;
    promoContent?: string;
    storeUrl?: string;
    orderIds?: string[];
    businessName?: string;
    ownerEmail?: string;
    daysRemaining?: number;
    planName?: string;
    reviewUrl?: string;
    buyerName?: string;
    dashboardUrl?: string;
    customerName?: string;
    message?: string;
    newStatus?: string;
    resetLink?: string;
    productLink?: string;
    senderName?: string;
    subject?: string;
    title?: string;
    data?: Record<string, any>;
}

const BRAND_COLOR = "#059669";

export function BaseTemplate(title: string, contentHTML: string, brandColor: string = BRAND_COLOR) {
    return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${title}</title>
    <!--[if mso]>
    <style>
        table {border-collapse:collapse;border-spacing:0;border:none;margin:0;}
        div, td {padding:0;}
        div {margin:0 !important;}
    </style>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        :root {
            color-scheme: light dark;
            supported-color-schemes: light dark;
        }
        body, table, td, p, a, h1, h2, h3 {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .wrapper { background-color: #f5f5f7; }
        .card { background-color: #ffffff; border: 1px solid #e5e5ea; }
        .text-main { color: #1d1d1f; }
        .text-muted { color: #86868b; }
        .code-box { background-color: #f5f5f7; border-color: #d2d2d7; }
        .code-text { color: ${brandColor}; }
        .btn { background-color: ${brandColor}; color: #ffffff; }
        .feature-box { background-color: #f9fafb; border-color: #e5e7eb; }
        .divider { border-top-color: #e5e5ea; }
        
        @media (prefers-color-scheme: dark) {
            .wrapper { background-color: #151516 !important; }
            .card { background-color: #1e1e1f !important; border-color: #333336 !important; }
            .text-main { color: #f5f5f7 !important; }
            .text-muted { color: #a1a1a6 !important; }
            .code-box { background-color: #2c2c2e !important; border-color: #48484a !important; }
            .code-text { color: #34d399 !important; }
            .btn { background-color: #34d399 !important; color: #ffffff !important; }
            .feature-box { background-color: #2c2c2e !important; border-color: #333336 !important; }
            .divider { border-top-color: #333336 !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;word-spacing:normal;background-color:#f5f5f7;" class="wrapper">
    <div role="article" aria-roledescription="email" lang="en" style="text-size-adjust:100%;-webkit-text-size-adjust:100%;ms-text-size-adjust:100%;background-color:#f5f5f7;" class="wrapper">
        <table role="presentation" style="width:100%;border:none;border-spacing:0;">
            <tr>
                <td align="center" style="padding:16px 8px;">
                    <table role="presentation" style="width:100%;max-width:600px;border:none;border-spacing:0;text-align:left;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.04);" class="card">
                        <tr>
                            <td style="padding:24px 16px;">
                                <div style="text-align:center;margin-bottom:32px;">
                                    <div style="display:inline-block;width:48px;height:48px;border-radius:14px;overflow:hidden;background-color:#f5f5f7;border:1px solid rgba(0,0,0,0.08);box-shadow:0 4px 12px rgba(34,197,94,0.15);margin:0 auto 16px auto;position:relative;">
                                        <img src="https://fairprice-ten.vercel.app/logo.png" alt="FairPrice Logo" style="width:100%;height:100%;object-fit:cover;transform:scale(1.3);filter:drop-shadow(0 2px 4px rgba(0,0,0,0.1));" />
                                    </div>
                                    <div style="margin-top:-8px;margin-bottom:20px;">
                                        <h1 style="margin:0;font-size:24px;font-weight:900;letter-spacing:-1px;color:#15803d;line-height:1;text-shadow:0 1px 2px rgba(0,0,0,0.05);">
                                            FairPrice.ng
                                        </h1>
                                        <div style="font-size:10px;font-weight:700;font-style:italic;margin-top:6px;text-transform:uppercase;letter-spacing:0.1em;color:#ca8a04;line-height:1;">
                                            Buy & Sell with no wahala
                                        </div>
                                    </div>
                                    <h2 style="margin:8px 0 0 0;font-size:24px;font-weight:700;color:#1d1d1f;letter-spacing:-0.5px;" class="text-main">${title}</h2>
                                </div>
                                <div style="font-size:16px;line-height:24px;color:#1d1d1f;font-weight:500;" class="text-main">
                                    ${contentHTML}
                                </div>
                                <div style="margin-top:40px;padding-top:24px;border-top:1px solid #e5e5ea;text-align:center;" class="divider">
                                    <p style="margin:0;font-size:13px;color:#86868b;font-weight:500;" class="text-muted">
                                        If you need help, please contact us at <a href="mailto:hello@fairprice.ng" style="color:${BRAND_COLOR};text-decoration:none;">hello@fairprice.ng</a>
                                    </p>
                                </div>
                            </td>
                        </tr>
                    </table>
                    <table role="presentation" style="width:100%;max-width:600px;border:none;border-spacing:0;text-align:center;margin-top:24px;">
                        <tr>
                            <td style="padding:0;font-size:13px;color:#86868b;line-height:20px;font-weight:500;" class="text-muted">
                                <p style="margin:0;">&copy; ${new Date().getFullYear()} FairPrice.ng. All rights reserved.</p>
                                <p style="margin:4px 0 0 0;">Buy & Sell with no wahala.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
    `;
}

export function buildEmailTemplate(type: EmailType, payload: EmailTemplatePayload): { subject: string; html: string } {
    const { name = "Customer" } = payload;
    let subject = "";
    let html = "";

    switch (type) {
        case 'WELCOME':
            subject = "Welcome to FairPrice! 🎉";
            html = BaseTemplate("Welcome to FairPrice!", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">We're absolutely thrilled to have you join FairPrice! You've just unlocked access to Nigeria's smartest, most reliable marketplace.</p>

<p style="margin:0 0 16px 0;font-weight:700;">Whether you're here to:</p>

<table role="presentation" style="width:100%;border:none;border-spacing:0;margin-bottom:32px;">
    <tr>
        <td style="padding:16px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:12px;display:block;" class="feature-box">
            <table role="presentation" style="width:100%;border:none;border-spacing:0;">
                <tr>
                    <td style="width:32px;font-size:24px;vertical-align:top;padding-right:12px;">🔍</td>
                    <td style="font-size:15px;line-height:22px;color:#86868b;" class="text-muted">
                        <strong style="color:#1d1d1f;display:block;margin-bottom:2px;" class="text-main">Find out the real fair price of products with our AI.</strong>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td style="padding:16px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:12px;display:block;margin-top:12px;" class="feature-box">
            <table role="presentation" style="width:100%;border:none;border-spacing:0;">
                <tr>
                    <td style="width:32px;font-size:24px;vertical-align:top;padding-right:12px;">🤝</td>
                    <td style="font-size:15px;line-height:22px;color:#86868b;" class="text-muted">
                        <strong style="color:#1d1d1f;display:block;margin-bottom:2px;" class="text-main">Negotiate directly with sellers using <strong>Ziva AI</strong>.</strong>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td style="padding:16px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;display:block;margin-top:12px;" class="feature-box">
            <table role="presentation" style="width:100%;border:none;border-spacing:0;">
                <tr>
                    <td style="width:32px;font-size:24px;vertical-align:top;padding-right:12px;">🛍️</td>
                    <td style="font-size:15px;line-height:22px;color:#86868b;" class="text-muted">
                        <strong style="color:#1d1d1f;display:block;margin-bottom:2px;" class="text-main">Launch your own store and reach buyers across Nigeria.</strong>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Explore the Marketplace</a>
</div>
            `);
            break;

        case 'VERIFY_EMAIL':
            subject = `Your FairPrice code: ${payload.code || '------'}`;
            html = BaseTemplate("Verify Your Email", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 32px 0;">Please use the verification code below to confirm your email address and secure your account.</p>

<div style="padding:24px;text-align:center;border-radius:16px;border:2px dashed #d2d2d7;margin-bottom:32px;" class="code-box">
    <div style="font-size:40px;font-weight:900;letter-spacing:12px;margin:0;" class="code-text">${payload.code || "------"}</div>
</div>

<p style="margin:0;font-size:14px;color:#86868b;text-align:center;" class="text-muted">If you didn't request this code, you can safely ignore this email.</p>
            `);
            break;

        case 'ORDER_PLACED':
            subject = `Order Confirmation: ${payload.orderId}`;
            html = BaseTemplate("Order Confirmed! 🛍️", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">Awesome news! Your order has been successfully placed and the funds are safely secured in <strong style="color:${BRAND_COLOR}">FairPrice Escrow</strong>.</p>

<table role="presentation" style="width:100%;border:none;border-spacing:0;margin-bottom:32px;">
    <tr>
        <td style="padding:16px;background-color:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;" class="feature-box">
            <table role="presentation" style="width:100%;border:none;border-spacing:0;">
                <tr>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;" class="divider text-muted">Order ID</td>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;text-align:right;font-weight:700;font-family:monospace;" class="divider text-main">${payload.orderId}</td>
                </tr>
                <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #e5e5ea;" class="divider text-muted">Item</td>
                    <td style="padding:12px 0;border-bottom:1px solid #e5e5ea;text-align:right;font-weight:700;" class="divider text-main">${payload.productName}</td>
                </tr>
                <tr>
                    <td style="padding-top:12px;" class="text-muted">Total Amount</td>
                    <td style="padding-top:12px;text-align:right;font-weight:900;font-size:18px;color:${BRAND_COLOR};" class="code-text">₦${payload.amount?.toLocaleString() || "0"}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="margin:0 0 32px 0;font-size:14px;color:#86868b;text-align:center;" class="text-muted">Your funds will not be released to the merchant until you confirm delivery.</p>

<div style="text-align:center;">
    <a href="${payload.trackingUrl || "https://www.fairprice.ng/account/orders"}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Track Your Order</a>
</div>
            `);
            break;

        case 'ORDER_DELIVERED':
            subject = `Order Delivered: ${payload.orderId}`;
            html = BaseTemplate("Your Order has Arrived! 📦", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">Great news! Your order <strong style="font-family:monospace;">${payload.orderId}</strong> has been marked as <strong>delivered</strong>.</p>
<p style="margin:0 0 24px 0;">Please log in to your FairPrice account to confirm receipt of your item so we can release the funds securely to the seller.</p>

<div style="background-color:#fee2e2;border:1px solid #fca5a5;border-radius:12px;padding:16px;margin-bottom:32px;">
    <p style="margin:0;color:#dc2626;font-size:14px;font-weight:700;text-align:center;">
        ⚠️ IMPORTANT: If you do not confirm receipt or file a dispute within 24 hours, the funds will be automatically released to the seller for payout.
    </p>
</div>

<div style="text-align:center;">
    <a href="${payload.trackingUrl || "https://www.fairprice.ng/account/orders"}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Confirm Receipt & Finish Order</a>
</div>
            `);
            break;

        case 'ORDER_COMPLETED':
            subject = `Order Complete: ${payload.orderId}`;
            html = BaseTemplate("Your Purchase is Complete! ✨", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">We're happy to inform you that your order <strong style="font-family:monospace;">${payload.orderId}</strong> for <strong>${payload.productName}</strong> is now officially complete.</p>
<p style="margin:0 0 24px 0;">The escrow funds have been released to the seller. Thank you for choosing FairPrice for your secure transaction.</p>

<div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:32px;text-align:center;">
    <p style="margin:0 0 8px 0;color:#16a34a;font-size:14px;font-weight:700;">Transaction Summary</p>
    <p style="margin:0;color:#15803d;font-size:24px;font-weight:800;">₦${Number(payload.amount).toLocaleString()}</p>
</div>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng/account/orders/${payload.orderId}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">View Order History</a>
</div>
`);
            break;

        case 'SELLER_NEW_ORDER':
            subject = `Your Store has a New Order 🛒 (${payload.orderId})`;
            html = BaseTemplate("You Have a New Order!", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">Congratulations! A customer just placed an order on your store, and the funds have been secured in Escrow.</p>

<table role="presentation" style="width:100%;border:none;border-spacing:0;margin-bottom:32px;">
    <tr>
        <td style="padding:16px;background-color:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;" class="feature-box">
            <table role="presentation" style="width:100%;border:none;border-spacing:0;">
                <tr>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;" class="divider text-muted">Order ID</td>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;text-align:right;font-weight:700;font-family:monospace;" class="divider text-main">${payload.orderId}</td>
                </tr>
                <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #e5e5ea;" class="divider text-muted">Item</td>
                    <td style="padding:12px 0;border-bottom:1px solid #e5e5ea;text-align:right;font-weight:700;" class="divider text-main">${payload.productName}</td>
                </tr>
                <tr>
                    <td style="padding-top:12px;" class="text-muted">Expected Payout</td>
                    <td style="padding-top:12px;text-align:right;font-weight:900;font-size:18px;color:${BRAND_COLOR};" class="code-text">₦${payload.amount?.toLocaleString() || "0"}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="margin:0 0 32px 0;font-size:14px;color:#86868b;text-align:center;" class="text-muted">Please fulfill this order within your SLA timeframe to maintain your store rating.</p>

<div style="text-align:center;">
    <a href="${payload.trackingUrl || "https://www.fairprice.ng/seller/orders"}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;text-align:center;color:white; font-weight:700;font-size:16px;" class="btn">View Order Dashboard</a>
</div>
            `);
            break;

        case 'CHANGE_PASSWORD':
            subject = "FairPrice Password Reset";
            html = BaseTemplate("Password Change Request", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">We received a request to change the password for your FairPrice account.</p>
<p style="margin:0 0 32px 0;">If you made this request, click the button below to securely update your credentials:</p>

<div style="text-align:center;">
    <a href="${payload.resetLink || 'https://www.fairprice.ng/login'}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Reset Password</a>
</div>

<p style="margin:32px 0 0 0;font-size:14px;color:#86868b;text-align:center;" class="text-muted">If you didn't request a password change, please ignore this email or contact support immediately.</p>
            `);
            break;

        case 'PROMOTIONAL':
            subject = `Special Offer from ${payload.sellerName || "a FairPrice Partner"}`;
            html = BaseTemplate("Exclusive Store Offer", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<div style="margin-bottom:32px;">
    ${payload.promoContent || "<p style='margin:0;'>We have some exciting new drops you won't want to miss!</p>"}
</div>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Shop Now</a>
</div>
            `);
            break;

        case 'SELLER_WELCOME':
            subject = "Welcome to FairPrice Sellers! 💼";
            html = BaseTemplate("Your Seller Journey Begins", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 16px 0;line-height:24px;">Thank you for registering to become a verified FairPrice Seller! We are excited to partner with you.</p>
<p style="margin:0 0 32px 0;line-height:24px;">Our administration team is currently reviewing your KYC verification documents and business profile. This process helps us keep FairPrice the safest marketplace in Africa.</p>

<div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin-bottom:32px;">
    <h3 style="margin:0 0 8px 0;color:#1e3a8a;font-size:16px;">What happens next?</h3>
    <ul style="margin:0;padding-left:20px;color:#1e40af;font-size:14px;line-height:22px;">
        <li>Your documents will be reviewed within 24-48 hours.</li>
        <li>You will receive another email once you are Approved.</li>
        <li>In the meantime, you can explore your seller dashboard!</li>
    </ul>
</div>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng/seller/dashboard" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Go to Dashboard</a>
</div>
            `);
            break;

        case 'SELLER_APPROVED':
            subject = "Your FairPrice Store is Live! 🎉";
            html = BaseTemplate("Congratulations!", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 16px 0;">We are thrilled to let you know that your KYC documents have been reviewed and approved!</p>
<p style="margin:0 0 24px 0;">Your FairPrice Seller profile is now fully active, and your products will be visible to millions of shoppers across the global platform.</p>

<div style="padding:16px;text-align:center;border-radius:12px;border:1px solid #e5e7eb;background-color:#f9fafb;margin-bottom:32px;font-family:monospace;font-size:16px;font-weight:700;" class="feature-box text-main border-divider">
    www.fairprice.ng/store/${payload.storeUrl || "your-store"}
</div>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng/store/${payload.storeUrl || "your-store"}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">View your Public Store</a>
</div>
            `);
            break;

        case 'SELLER_PAYOUT_REQUEST':
            subject = `New Payout Request from ${payload.sellerName || "a Seller"}`;
            html = BaseTemplate("Action Required: Payout Request", `
<p style="margin:0 0 16px 0;">Hi Admin,</p>
<p style="margin:0 0 24px 0;">A new payout has been requested by a seller for an order that has been delivered.</p>

<table role="presentation" style="width:100%;border:none;border-spacing:0;margin-bottom:32px;">
    <tr>
        <td style="padding:16px;background-color:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;" class="feature-box">
            <table role="presentation" style="width:100%;border:none;border-spacing:0;">
                <tr>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;" class="divider text-muted">Seller Account</td>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;text-align:right;font-weight:700;" class="divider text-main">${payload.sellerName || "Unknown Seller"}</td>
                </tr>
                <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #e5e5ea;" class="divider text-muted">Order ID(s)</td>
                    <td style="padding:12px 0;border-bottom:1px solid #e5e5ea;text-align:right;font-weight:700;font-family:monospace;" class="divider text-main">${payload.orderIds?.join(', ') || "N/A"}</td>
                </tr>
                <tr>
                    <td style="padding-top:12px;" class="text-muted">Requested Payout</td>
                    <td style="padding-top:12px;text-align:right;font-weight:900;font-size:18px;color:${BRAND_COLOR};" class="code-text">₦${payload.amount?.toLocaleString() || "0"}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="margin:0 0 32px 0;font-size:14px;color:#86868b;text-align:center;" class="text-muted">Please review the payout details and proceed with the bank transfer via the dashboard.</p>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng/admin/payouts" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Review Payout Request</a>
</div>
            `);
            break;

        case 'ADMIN_NEW_KYC':
            subject = `New Seller KYC Submitted: ${payload.businessName || "New Business"}`;
            html = BaseTemplate("New Seller Registration", `
<p style="margin:0 0 16px 0;">Hi Admin,</p>
<p style="margin:0 0 24px 0;">A new seller has completed their KYC onboarding and is awaiting your approval.</p>

<table role="presentation" style="width:100%;border:none;border-spacing:0;margin-bottom:32px;">
    <tr>
        <td style="padding:16px;background-color:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;" class="feature-box">
            <table role="presentation" style="width:100%;border:none;border-spacing:0;">
                <tr>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;" class="divider text-muted">Business Name</td>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;text-align:right;font-weight:700;" class="divider text-main">${payload.businessName || "Unknown"}</td>
                </tr>
                <tr>
                    <td style="padding-top:12px;" class="text-muted">Owner Email</td>
                    <td style="padding-top:12px;text-align:right;font-weight:700;" class="text-main">${payload.ownerEmail || "N/A"}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<div style="text-align:center;">
    <a href="${payload.reviewUrl || "https://www.fairprice.ng/admin/users"}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Review & Approve</a>
</div>
            `);
            break;

        case 'PLAN_EXPIRY':
            subject = payload.daysRemaining === 0
                ? `Your ${payload.planName || ""} plan has expired`
                : `Your ${payload.planName || ""} plan expires in ${payload.daysRemaining} day${(payload.daysRemaining || 0) > 1 ? 's' : ''}`;
            html = BaseTemplate(
                payload.daysRemaining === 0 ? "Plan Expired" : "Plan Expiring Soon",
                `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
${payload.daysRemaining === 0 ? `
<p style="margin:0 0 24px 0;">Your <strong>${payload.planName || ""}</strong> plan for <strong>${payload.businessName || "your store"}</strong> has expired. Your second store and its products are now inactive and hidden from the marketplace.</p>
<div style="background-color:#fee2e2;border:1px solid #fca5a5;border-radius:12px;padding:16px;margin-bottom:32px;">
    <p style="margin:0;color:#dc2626;font-size:14px;font-weight:700;text-align:center;">
        ⚠️ Your store is now inactive. Renew your plan to restore it.
    </p>
</div>
` : `
<p style="margin:0 0 24px 0;">Your <strong>${payload.planName || ""}</strong> plan for <strong>${payload.businessName || "your store"}</strong> will expire in <strong>${payload.daysRemaining} day${(payload.daysRemaining || 0) > 1 ? 's' : ''}</strong>. After expiry, your store and products will be hidden from the marketplace.</p>
`}
<div style="text-align:center;">
    <a href="https://www.fairprice.ng/seller/settings/billing" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">${payload.daysRemaining === 0 ? 'Renew Now' : 'Renew Your Plan'}</a>
</div>
            `);
            break;

        case 'SELLER_IMAGE_REQUEST':
            subject = `📸 Image Request for ${payload.productName || "a Product"} (Order ${payload.orderId || ""})`;
            html = BaseTemplate("Product Image Requested", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">A buyer has requested <strong>real-time photos</strong> of the actual product unit from your warehouse or inventory.</p>

<table role="presentation" style="width:100%;border:none;border-spacing:0;margin-bottom:32px;">
    <tr>
        <td style="padding:16px;background-color:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;" class="feature-box">
            <table role="presentation" style="width:100%;border:none;border-spacing:0;">
                <tr>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;" class="divider text-muted">Product</td>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;text-align:right;font-weight:700;" class="divider text-main">${payload.productName || "Unknown"}</td>
                </tr>
                <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #e5e5ea;" class="divider text-muted">Order ID</td>
                    <td style="padding:12px 0;border-bottom:1px solid #e5e5ea;text-align:right;font-weight:700;font-family:monospace;" class="divider text-main">${payload.orderId || "N/A"}</td>
                </tr>
                <tr>
                    <td style="padding-top:12px;" class="text-muted">Requested By</td>
                    <td style="padding-top:12px;text-align:right;font-weight:700;" class="text-main">${payload.buyerName || "A Buyer"}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="margin:0 0 32px 0;font-size:14px;color:#86868b;text-align:center;" class="text-muted">Please upload clear photos of the actual unit as soon as possible. Responding promptly improves your seller trust score.</p>

<div style="text-align:center;">
    <a href="${payload.dashboardUrl || "https://www.fairprice.ng/seller/dashboard/messages"}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Upload Photos Now</a>
</div>
            `);
            break;
        case 'NEGOTIATION_REQUEST':
            subject = `New Negotiation Offer: ${payload.productName}`;
            html = BaseTemplate("📥 New Negotiation Offer", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">You have received a new price negotiation offer for one of your products on FairPrice.</p>

<table role="presentation" style="width:100%;border:none;border-spacing:0;margin-bottom:32px;">
    <tr>
        <td style="padding:16px;background-color:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;" class="feature-box">
            <table role="presentation" style="width:100%;border:none;border-spacing:0;">
                <tr>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;" class="divider text-muted">Customer</td>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;text-align:right;font-weight:700;" class="divider text-main">${payload.customerName || "A Customer"}</td>
                </tr>
                <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #e5e5ea;" class="divider text-muted">Product</td>
                    <td style="padding:12px 0;border-bottom:1px solid #e5e5ea;text-align:right;font-weight:700;" class="divider text-main">${payload.productName}</td>
                </tr>
                <tr>
                    <td style="padding-top:12px;" class="text-muted">Offered Price</td>
                    <td style="padding-top:12px;text-align:right;font-weight:900;font-size:18px;color:${BRAND_COLOR};" class="code-text">${payload.amount}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="margin:0 0 32px 0;font-size:14px;color:#86868b;text-align:center;" class="text-muted">Respond quickly to secure the sale! You can accept, reject, or counter-offer.</p>

<div style="text-align:center;">
    <a href="${payload.dashboardUrl || "https://www.fairprice.ng/seller/dashboard/messages"}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">View & Respond to Offer</a>
</div>
            `);
            break;

        case 'NEGOTIATION_ACCEPTED':
            subject = `Good News! Your offer for ${payload.productName} was Accepted 🎉`;
            html = BaseTemplate("Offer Accepted! 🤝", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">Great news! The seller has <strong>accepted</strong> your negotiation offer for <strong>${payload.productName}</strong>.</p>

<div style="padding:24px;text-align:center;border-radius:16px;border:2px dashed #d2d2d7;margin-bottom:32px;" class="code-box">
    <div style="font-size:24px;font-weight:900;margin:0;color:#1d1d1f;" class="text-main">Agreed Price</div>
    <div style="font-size:32px;font-weight:900;letter-spacing:1px;margin-top:8px;" class="code-text">${payload.amount}</div>
</div>

<p style="margin:0 0 32px 0;font-size:14px;color:#86868b;text-align:center;" class="text-muted">Your negotiated price is locked in for a limited time. Complete your checkout now to secure the deal.</p>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng/account/negotiations" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Checkout Now</a>
</div>
            `);
            break;

        case 'NEGOTIATION_REJECTED':
            subject = `Update on your offer for ${payload.productName}`;
            html = BaseTemplate("Offer Update", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">${payload.message || `The seller has reviewed your negotiation offer for <strong>${payload.productName}</strong> but unfortunately could not accept it at this time.`}</p>

<p style="margin:0 0 32px 0;font-size:14px;color:#86868b;text-align:center;" class="text-muted">Don't worry! You can still browse other sellers offering the same product, or buy it at the listed price.</p>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng/account/negotiations" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">View Details</a>
</div>
            `);
            break;

        case 'COUNTER_OFFER_DECLINED':
            subject = `Offer Update: Counter-Offer Declined for ${payload.productName}`;
            html = BaseTemplate("Counter-Offer Update", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">The buyer has reviewed your counter-offer for <strong>${payload.productName}</strong> but has decided not to proceed at this time.</p>

<p style="margin:0 0 32px 0;font-size:14px;color:#86868b;text-align:center;" class="text-muted">You can wait for other offers or reach out to the customer via the messaging dashboard.</p>

<div style="text-align:center;">
    <a href="${payload.dashboardUrl || 'https://www.fairprice.ng/seller/dashboard/messages'}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">View Message Dashboard</a>
</div>
            `);
            break;

        case 'ORDER_CANCELLED':
            subject = `Order Cancelled — #${payload.orderId || ''}`;
            html = BaseTemplate(subject, `
<p style="margin:0 0 16px 0;">Hi ${payload.name || payload.sellerName || 'User'},</p>
<p style="margin:0 0 16px 0;">Order <strong>#${payload.orderId || ''}</strong>${payload.productName ? ` for <strong>${payload.productName}</strong>` : ''} has been successfully cancelled.</p>
<p style="margin:0 0 24px 0;font-size:14px;color:#86868b;" class="text-muted">If a payment was made, your funds are safely returning from escrow to your original payment method immediately.</p>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng/account/orders" class="btn" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">View Your Orders</a>
</div>
            `);
            break;

        case 'RETURN_REQUESTED':
            subject = 'Return Requested - Action Required';
            html = BaseTemplate(subject, `
<p style="margin:0 0 16px 0;">Hi ${payload.sellerName || 'Seller'},</p>
<p style="margin:0 0 16px 0;">A return has been initiated by the buyer for Order <strong>#${payload.orderId || ''}</strong>.</p>
<p style="margin:0 0 24px 0;font-size:14px;color:#86868b;" class="text-muted">Please check your dashboard to review the evidence provided by the buyer. Escrow funds are paused until this dispute is securely resolved.</p>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng/seller/orders" class="btn" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">Manage Returns</a>
</div>
            `);
            break;

        case 'RETURN_UPDATED':
            subject = 'Return Request Update';
            html = BaseTemplate(subject, `
<p style="margin:0 0 16px 0;">Hi ${payload.name || 'Customer'},</p>
<p style="margin:0 0 16px 0;">Your return request for Order <strong>#${payload.orderId || ''}</strong> has been <strong>${payload.newStatus || 'updated'}</strong>.</p>
<p style="margin:0 0 24px 0;font-size:14px;color:#86868b;" class="text-muted">If approved, your escrow funds will be fully refunded shortly.</p>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng/account/orders" class="btn" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">View Order Status</a>
</div>
            `);
            break;

        case 'ORDER_SHIPPED':
            subject = `Your order has shipped — #${payload.orderId || ''}`;
            html = BaseTemplate(subject, `
<p style="margin:0 0 16px 0;">Hi ${payload.name || 'Customer'},</p>
<p style="margin:0 0 16px 0;">Order <strong>#${payload.orderId || ''}</strong>${payload.productName ? ` — <strong>${payload.productName}</strong>` : ''} has left the merchant's warehouse and is currently in transit.</p>
<p style="margin:0 0 24px 0;font-size:14px;color:#86868b;" class="text-muted">You can track its live status below. Remember, your funds remain safe in escrow until delivery is confirmed.</p>

<div style="text-align:center;">
    <a href="${payload.trackingUrl || "https://www.fairprice.ng/account/orders"}" class="btn" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">Track Package</a>
</div>
            `);
            break;

        case 'ORDER_INQUIRY':
            subject = 'New Order Inquiry from Buyer';
            html = BaseTemplate(subject, `
<p style="margin:0 0 16px 0;">Hi ${payload.sellerName || 'Seller'},</p>
<p style="margin:0 0 16px 0;">The buyer has an inquiry regarding Order <strong>#${payload.orderId || ''}</strong>.</p>
<div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:0 0 24px 0;" class="feature-box">
    <p style="font-size:15px;margin:0;font-style:italic;" class="text-main">"${payload.message || 'I have a question about this order.'}"</p>
</div>
<p style="margin:0 0 24px 0;font-size:14px;color:#86868b;" class="text-muted">Please respond as soon as possible via the messaging dashboard to ensure a smooth Escrow transaction.</p>

<div style="text-align:center;">
    <a href="${payload.dashboardUrl || 'https://www.fairprice.ng/seller/dashboard/messages'}" class="btn" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">Reply to Customer</a>
</div>
            `);
            break;

        case 'NEW_DISPUTE':
            subject = `Dispute Filed: Order #${payload.orderId || ''} — ${payload.productName || 'Product'}`;
            html = BaseTemplate("Dispute Action Required ⚠️", `
<p style="margin:0 0 16px 0;">Hi ${payload.sellerName || 'Seller'},</p>
<p style="margin:0 0 16px 0;">A dispute was just filed by the customer on Order <strong>#${payload.orderId || ''}</strong>${payload.productName ? ` for <strong>${payload.productName}</strong>` : ''}.</p>
<div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:0 0 24px 0;">
    <p style="font-size:15px;margin:0;color:#dc2626;"><strong>Issue:</strong> "${payload.message || 'Issue not specified.'}"</p>
</div>
<p style="margin:0 0 24px 0;font-size:14px;color:#86868b;" class="text-muted">Your escrow payment for this transaction has been temporarily frozen. Please navigate to your dashboard immediately to review the dispute and provide evidence or a resolution.</p>

<div style="text-align:center;">
    <a href="${payload.dashboardUrl || 'https://www.fairprice.ng/seller/orders'}" class="btn" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">Review Dispute</a>
</div>
            `);
            break;

        case 'RESTOCK_ALERT':
            subject = `🔔 Good News! ${payload.productName} is Back in Stock!`;
            html = BaseTemplate("Back in Stock!", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">You asked us to notify you when <strong>${payload.productName}</strong> became available again.</p>
<p style="margin:0 0 24px 0;">Great news! It's back in stock and ready to be ordered. Hurry before it runs out again!</p>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng${payload.productLink}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Order Now</a>
</div>
            `);
            break;

        case 'BUYER_ORDER_MESSAGE':
            subject = `New message regarding your order #${payload.orderId || ''}`;
            html = BaseTemplate("You have a new message!", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 16px 0;">The ${payload.sellerName || 'Seller'} has sent you a new message regarding your order <strong>#${payload.orderId || ''}</strong>.</p>
<div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:0 0 24px 0;" class="feature-box">
    <p style="font-size:15px;margin:0;font-style:italic;" class="text-main">"${payload.message || 'Please log in to view the message.'}"</p>
</div>
<p style="margin:0 0 24px 0;font-size:14px;color:#86868b;" class="text-muted">You can reply directly via the Ziva Order Concierge on your dashboard.</p>

<div style="text-align:center;">
    <a href="${payload.dashboardUrl || 'https://www.fairprice.ng/account/orders'}" class="btn" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">Reply in Concierge</a>
</div>
            `);
            break;

        case 'NEW_CHAT_MESSAGE':
            subject = `New message from ${payload.senderName || 'FairPrice User'}`;
            html = BaseTemplate("New Message Received", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 16px 0;">You have a new message from <strong>${payload.senderName || 'a user'}</strong> on FairPrice.</p>
<div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:0 0 24px 0;" class="feature-box">
    <p style="font-size:15px;margin:0;font-style:italic;" class="text-main">"${payload.message || 'Please log in to view the message.'}"</p>
</div>

<div style="text-align:center;">
    <a href="${payload.dashboardUrl || 'https://www.fairprice.ng/account/messages'}" class="btn" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">View Message</a>
</div>
            `);
            break;

        case 'SELLER_PAYOUT_COMPLETED':
            subject = `💰 Payout Sent: ₦${payload.amount?.toLocaleString() || '0'} to your bank account`;
            html = BaseTemplate("Payout Successful! 💰", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">Great news! Your payout has been <strong style="color:${BRAND_COLOR}">successfully processed</strong> and the funds are on their way to your bank account.</p>

<table role="presentation" style="width:100%;border:none;border-spacing:0;margin-bottom:32px;">
    <tr>
        <td style="padding:16px;background-color:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;" class="feature-box">
            <table role="presentation" style="width:100%;border:none;border-spacing:0;">
                <tr>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;" class="divider text-muted">Store</td>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;text-align:right;font-weight:700;" class="divider text-main">${payload.sellerName || payload.businessName || 'Your Store'}</td>
                </tr>
                <tr>
                    <td style="padding-top:12px;" class="text-muted">Amount Sent</td>
                    <td style="padding-top:12px;text-align:right;font-weight:900;font-size:18px;color:${BRAND_COLOR};" class="code-text">₦${payload.amount?.toLocaleString() || '0'}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="margin:0 0 32px 0;font-size:14px;color:#86868b;text-align:center;" class="text-muted">Funds typically arrive within 1-24 hours depending on your bank. You can view your settlement history on your dashboard.</p>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng/seller/wallet" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">View Balance & Settlements</a>
</div>
            `);
            break;

        case 'ESCROW_RELEASED':
            subject = `💰 Funds Released: Order #${payload.orderId || ''}`;
            html = BaseTemplate("Funds Released! 💰", `
<p style="margin:0 0 16px 0;">Hi ${payload.sellerName || 'Seller'},</p>
<p style="margin:0 0 24px 0;">Great news! The escrow funds for Order <strong>#${payload.orderId || ''}</strong> have been released and are now available in your store balance.</p>

<table role="presentation" style="width:100%;border:none;border-spacing:0;margin-bottom:32px;">
    <tr>
        <td style="padding:16px;background-color:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;" class="feature-box">
            <table role="presentation" style="width:100%;border:none;border-spacing:0;">
                <tr>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;" class="divider text-muted">Product</td>
                    <td style="padding-bottom:12px;border-bottom:1px solid #e5e5ea;text-align:right;font-weight:700;" class="divider text-main">${payload.productName || 'Product'}</td>
                </tr>
                <tr>
                    <td style="padding-top:12px;" class="text-muted">Amount Released</td>
                    <td style="padding-top:12px;text-align:right;font-weight:900;font-size:18px;color:${BRAND_COLOR};" class="code-text">₦${payload.amount?.toLocaleString() || '0'}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="margin:0 0 32px 0;font-size:14px;color:#86868b;text-align:center;" class="text-muted">You can now request a payout for these funds via your wallet dashboard.</p>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng/seller/dashboard/wallet" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">View Wallet balance</a>
</div>
            `);
            break;

        case 'DISPUTE_RESOLVED':
            subject = `Dispute Resolved: Order #${payload.orderId || ''}`;
            html = BaseTemplate("Dispute Resolution ⚖️", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">Our administrative team has reached a final decision regarding the dispute on Order <strong>#${payload.orderId || ''}</strong>.</p>

<div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin-bottom:32px;">
    <h3 style="margin:0 0 8px 0;color:#1e3a8a;font-size:16px;">Resolution Detail:</h3>
    <p style="margin:0;color:#1e40af;font-size:15px;font-weight:700;">
        ${payload.newStatus === 'resolved_refund' ? 'Full Refund Issued to Buyer' : 'Escrow Funds Released to Seller'}
    </p>
    ${payload.message ? `<p style="margin:12px 0 0 0;font-size:14px;color:#1e40af;font-style:italic;">Admin Notes: "${payload.message}"</p>` : ''}
</div>

<p style="margin:0 0 32px 0;font-size:14px;color:#86868b;text-align:center;" class="text-muted">This decision is final and has been applied to the escrow transaction. Thank you for your cooperation.</p>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng/account/orders/${payload.orderId || ''}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">View Order Detail</a>
</div>
            `);
            break;

        case 'SELLER_PAYOUT_FAILED':
            subject = `⚠️ Payout Issue: ₦${payload.amount?.toLocaleString() || '0'} transfer needs attention`;
            html = BaseTemplate("Payout Update ⚠️", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">We encountered an issue processing your payout of <strong>₦${payload.amount?.toLocaleString() || '0'}</strong> to your bank account.</p>

<div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:32px;">
    <p style="margin:0;color:#dc2626;font-size:14px;font-weight:700;text-align:center;">
        ⚠️ This is usually caused by incorrect bank details. Please verify your account information.
    </p>
</div>

<p style="margin:0 0 16px 0;font-size:14px;" class="text-main">What you can do:</p>
<ul style="margin:0 0 32px 0;padding-left:20px;font-size:14px;line-height:22px;" class="text-muted">
    <li>Check that your bank account number is correct</li>
    <li>Verify your bank name matches your Paystack records</li>
    <li>Contact our support team if the issue persists</li>
</ul>

<div style="text-align:center;">
    <a href="https://www.fairprice.ng/seller/settings/payouts" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Review Bank Details</a>
</div>
            `);
            break;

        case 'QUOTE_PAYMENT_RECEIPT':
            subject = `Payment received — ${payload.title || "your invoice"}`;
            html = BaseTemplate("Payment received ✅", `
<p style="margin:0 0 16px 0;">Thanks — your payment went through.</p>
<table role="presentation" style="width:100%;border:none;border-spacing:0;margin:0 0 24px 0;">
    <tr><td style="padding:20px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
        <p style="margin:0 0 8px 0;font-size:13px;color:#15803d;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Amount paid</p>
        <p style="margin:0 0 16px 0;font-size:28px;font-weight:900;color:#14532d;">${payload.amount || ""}</p>
        <p style="margin:0;font-size:14px;color:#166534;">For: <strong>${payload.title || "Invoice"}</strong><br/>Seller: <strong>${payload.sellerName || "Seller"}</strong></p>
    </td></tr>
</table>
${payload.balance ? `<p style="margin:0 0 24px 0;font-size:15px;color:#86868b;">Balance still outstanding: <strong style="color:#b45309;">${payload.balance}</strong>. You can pay the rest any time from the same link.</p>` : `<p style="margin:0 0 24px 0;font-size:15px;color:#86868b;">This invoice is now fully paid. Nothing further is owed.</p>`}
${payload.quoteUrl ? `<p style="margin:0;"><a href="${payload.quoteUrl}" style="display:inline-block;padding:14px 28px;background-color:#059669;color:#ffffff;text-decoration:none;border-radius:99px;font-weight:700;">View invoice</a></p>` : ""}
`);
            break;

        case 'SYSTEM_ALERT':
            subject = payload.subject || `🚨 System Alert: Action Required`;
            html = BaseTemplate("Admin Security Alert 🚨", `
<div style="background-color:#1e293b;border-radius:16px;padding:32px;color:#f8fafc;">
    <div style="display:inline-block;padding:8px 16px;background-color:#ef4444;border-radius:99px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:24px;">
        Critical Notification
    </div>
    <h2 style="font-size:24px;font-weight:900;margin:0 0 16px 0;letter-spacing:-0.02em;">${payload.title || 'System Notification'}</h2>
    <p style="font-size:16px;line-height:28px;color:#cbd5e1;margin:0 0-24px 0;">
        ${payload.message || 'No details provided.'}
    </p>
</div>

<div style="margin-top:32px;padding:24px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;">
    <h3 style="font-size:12px;font-weight:900;text-transform:uppercase;color:#64748b;margin:0 0 16px 0;letter-spacing:0.05em;">Alert Parameters</h3>
    <table style="width:100%;border-collapse:collapse;">
        ${Object.entries(payload.data || {}).map(([key, val]) => `
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:12px 0;font-size:13px;color:#94a3b8;font-weight:600;">${key.replace(/_/g, ' ').toUpperCase()}</td>
            <td style="padding:12px 0;font-size:13px;color:#1e293b;font-weight:700;text-align:right;">${val}</td>
        </tr>
        `).join('')}
    </table>
</div>

<div style="text-align:center;margin-top:32px;">
    <a href="${payload.dashboardUrl || 'https://www.fairprice.ng/admin'}" style="display:inline-block;padding:16px 32px;background-color:#4f46e5;color:white;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;box-shadow:0 10px 15px -3px rgba(79, 70, 229, 0.2);">Access Admin Control</a>
</div>
            `, "#4f46e5");
            break;

        default:
            // Silenced to reduce operations costs and inbox spam.
            // Catch-all notifications are now handled purely via in-app alerts.
            subject = '';
            html = '';
            break;
    }

    return { subject, html };
}
