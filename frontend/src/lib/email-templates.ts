export type EmailType = 'WELCOME' | 'VERIFY_EMAIL' | 'ORDER_PLACED' | 'ORDER_DELIVERED' | 'CHANGE_PASSWORD' | 'PROMOTIONAL' | 'SELLER_WELCOME' | 'SELLER_APPROVED' | 'SELLER_PAYOUT_REQUEST';

interface EmailPayload {
    name?: string;
    code?: string;
    orderId?: string;
    productName?: string;
    amount?: number;
    trackingUrl?: string;
    sellerName?: string;
    promoContent?: string;
    storeUrl?: string;
    orderIds?: string[];
}

const BRAND_COLOR = "#059669";

function BaseTemplate(title: string, contentHTML: string) {
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
        .code-text { color: ${BRAND_COLOR}; }
        .btn { background-color: ${BRAND_COLOR}; color: #ffffff; }
        .feature-box { background-color: #f9fafb; border-color: #e5e7eb; }
        .divider { border-top-color: #e5e5ea; }
        
        @media (prefers-color-scheme: dark) {
            .wrapper { background-color: #151516 !important; }
            .card { background-color: #1e1e1f !important; border-color: #333336 !important; }
            .text-main { color: #f5f5f7 !important; }
            .text-muted { color: #a1a1a6 !important; }
            .code-box { background-color: #2c2c2e !important; border-color: #48484a !important; }
            .code-text { color: #34d399 !important; }
            .btn { background-color: #34d399 !important; color: #151516 !important; }
            .feature-box { background-color: #2c2c2e !important; border-color: #333336 !important; }
            .divider { border-top-color: #333336 !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;word-spacing:normal;background-color:#f5f5f7;" class="wrapper">
    <div role="article" aria-roledescription="email" lang="en" style="text-size-adjust:100%;-webkit-text-size-adjust:100%;ms-text-size-adjust:100%;background-color:#f5f5f7;" class="wrapper">
        <table role="presentation" style="width:100%;border:none;border-spacing:0;">
            <tr>
                <td align="center" style="padding:40px 20px;">
                    <table role="presentation" style="width:100%;max-width:600px;border:none;border-spacing:0;text-align:left;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.04);" class="card">
                        <tr>
                            <td style="padding:48px;">
                                <div style="text-align:center;margin-bottom:32px;">
                                    <h1 style="margin:0;font-size:32px;font-weight:900;letter-spacing:-1px;color:${BRAND_COLOR};">FairPrice</h1>
                                    <h2 style="margin:8px 0 0 0;font-size:24px;font-weight:700;color:#1d1d1f;letter-spacing:-0.5px;" class="text-main">${title}</h2>
                                </div>
                                <div style="font-size:16px;line-height:24px;color:#1d1d1f;font-weight:500;" class="text-main">
                                    ${contentHTML}
                                </div>
                                <div style="margin-top:40px;padding-top:24px;border-top:1px solid #e5e5ea;text-align:center;" class="divider">
                                    <p style="margin:0;font-size:13px;color:#86868b;font-weight:500;" class="text-muted">
                                        If you need help, please contact us at <a href="mailto:support@fairprice.ng" style="color:${BRAND_COLOR};text-decoration:none;">support@fairprice.ng</a>
                                    </p>
                                </div>
                            </td>
                        </tr>
                    </table>
                    <table role="presentation" style="width:100%;max-width:600px;border:none;border-spacing:0;text-align:center;margin-top:24px;">
                        <tr>
                            <td style="padding:0;font-size:13px;color:#86868b;line-height:20px;font-weight:500;" class="text-muted">
                                <p style="margin:0;">&copy; ${new Date().getFullYear()} FairPrice. All rights reserved.</p>
                                <p style="margin:4px 0 0 0;">Africa's first AI-Regulated marketplace for best prices.</p>
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

export function buildEmailTemplate(type: EmailType, payload: EmailPayload): { subject: string; html: string } {
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
                        <strong style="color:#1d1d1f;display:block;margin-bottom:2px;" class="text-main">Price Discovery</strong>
                        Find out the real fair price of products with our AI.
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td style="padding:16px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:12px;display:block;margin-top:12px;" class="feature-box">
            <table role="presentation" style="width:100%;border:none;border-spacing:0;">
                <tr>
                    <td style="width:32px;font-size:24px;vertical-align:top;padding-right:12px;">🤖</td>
                    <td style="font-size:15px;line-height:22px;color:#86868b;" class="text-muted">
                        <strong style="color:#1d1d1f;display:block;margin-bottom:2px;" class="text-main">Smart Negotiation</strong>
                        Negotiate directly with sellers using <strong>Ziva AI</strong>.
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td style="padding:16px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;display:block;margin-top:12px;" class="feature-box">
            <table role="presentation" style="width:100%;border:none;border-spacing:0;">
                <tr>
                    <td style="width:32px;font-size:24px;vertical-align:top;padding-right:12px;">🚀</td>
                    <td style="font-size:15px;line-height:22px;color:#86868b;" class="text-muted">
                        <strong style="color:#1d1d1f;display:block;margin-bottom:2px;" class="text-main">Digital Storefront</strong>
                        Launch your own store and reach buyers across Nigeria.
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<div style="text-align:center;">
    <a href="https://fairprice.ng" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Explore the Marketplace</a>
</div>
            `);
            break;

        case 'VERIFY_EMAIL':
            subject = "Verify your FairPrice account code";
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
    <a href="${payload.trackingUrl || "https://fairprice.ng/account/orders"}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Track Your Order</a>
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
        ⚠️ If you do not confirm within 7 days, the funds will be automatically released to the seller.
    </p>
</div>

<div style="text-align:center;">
    <a href="${payload.trackingUrl || "https://fairprice.ng/account/orders"}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Confirm Receipt</a>
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
    <a href="https://fairprice.ng/login" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Reset Password</a>
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
    <a href="https://fairprice.ng" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Shop Now</a>
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
    <a href="https://fairprice.ng/seller/dashboard" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Go to Dashboard</a>
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
    fairprice.ng/store/${payload.storeUrl || "your-store"}
</div>

<div style="text-align:center;">
    <a href="https://fairprice.ng/store/${payload.storeUrl || "your-store"}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">View your Public Store</a>
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
    <a href="https://fairprice.ng/admin/payouts" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Review Payout Request</a>
</div>
            `);
            break;
    }

    return { subject, html };
}
