export type EmailType = 'WELCOME' | 'VERIFY_EMAIL' | 'ORDER_PLACED' | 'ORDER_DELIVERED' | 'CHANGE_PASSWORD' | 'PROMOTIONAL' | 'SELLER_WELCOME' | 'SELLER_APPROVED' | 'SELLER_PAYOUT_REQUEST' | 'ADMIN_NEW_KYC' | 'PLAN_EXPIRY' | 'SELLER_NEW_ORDER' | 'SELLER_IMAGE_REQUEST' | 'NEGOTIATION_REQUEST' | 'NEGOTIATION_ACCEPTED' | 'NEGOTIATION_REJECTED' | 'ORDER_CANCELLED' | 'RETURN_REQUESTED' | 'RETURN_UPDATED' | 'ORDER_SHIPPED' | 'ORDER_INQUIRY' | 'NEW_DISPUTE';

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
                                            Never overpay again
                                        </div>
                                    </div>
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
                                <p style="margin:0;">&copy; ${new Date().getFullYear()} FairPrice.ng. All rights reserved.</p>
                                <p style="margin:4px 0 0 0;">Never overpay again.</p>
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
    <a href="https://fairprice.ng" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Explore the Marketplace</a>
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
    <a href="${payload.trackingUrl || "https://fairprice.ng/seller/orders"}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;text-align:center;color:white; font-weight:700;font-size:16px;" class="btn">View Order Dashboard</a>
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
    <a href="${payload.reviewUrl || "https://fairprice.ng/admin/users"}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Review & Approve</a>
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
    <a href="https://fairprice.ng/seller/settings/billing" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">${payload.daysRemaining === 0 ? 'Renew Now' : 'Renew Your Plan'}</a>
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
    <a href="${payload.dashboardUrl || "https://fairprice.ng/seller/dashboard/messages"}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Upload Photos Now</a>
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
    <a href="${payload.dashboardUrl || "https://fairprice.ng/seller/dashboard/messages"}" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">View & Respond to Offer</a>
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
    <a href="https://fairprice.ng/account/negotiations" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Checkout Now</a>
</div>
            `);
            break;

        case 'NEGOTIATION_REJECTED':
            subject = `Update on your offer for ${payload.productName}`;
            html = BaseTemplate("Offer Update", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">The seller has reviewed your negotiation offer for <strong>${payload.productName}</strong> but unfortunately could not accept it at this time.</p>

<p style="margin:0 0 32px 0;font-size:14px;color:#86868b;text-align:center;" class="text-muted">Don't worry! You can still browse other sellers offering the same product, or buy it at the listed price.</p>

<div style="text-align:center;">
    <a href="https://fairprice.ng/account/negotiations" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">View Details</a>
</div>
            `);
            break;

        case 'ORDER_CANCELLED':
            subject = `Order Cancelled — #${(payload.orderId || '').substring(0,8)}`;
            html = BaseTemplate(subject, `
<p style="margin:0 0 16px 0;">Hi ${payload.name || payload.sellerName || 'User'},</p>
<p style="margin:0 0 16px 0;">Order <strong>#${(payload.orderId || '').substring(0,8)}</strong>${payload.productName ? ` for <strong>${payload.productName}</strong>` : ''} has been successfully cancelled.</p>
<p style="margin:0 0 24px 0;font-size:14px;color:#86868b;" class="text-muted">If a payment was made, your funds are safely returning from escrow to your original payment method immediately.</p>

<div style="text-align:center;">
    <a href="https://fairprice.ng/account/orders" class="btn" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">View Your Orders</a>
</div>
            `);
            break;

        case 'RETURN_REQUESTED':
            subject = 'Return Requested - Action Required';
            html = BaseTemplate(subject, `
<p style="margin:0 0 16px 0;">Hi ${payload.sellerName || 'Seller'},</p>
<p style="margin:0 0 16px 0;">A return has been initiated by the buyer for Order <strong>#${(payload.orderId || '').substring(0,8)}</strong>.</p>
<p style="margin:0 0 24px 0;font-size:14px;color:#86868b;" class="text-muted">Please check your dashboard to review the evidence provided by the buyer. Escrow funds are paused until this dispute is securely resolved.</p>

<div style="text-align:center;">
    <a href="https://fairprice.ng/seller/orders" class="btn" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">Manage Returns</a>
</div>
            `);
            break;

        case 'RETURN_UPDATED':
            subject = 'Return Request Update';
            html = BaseTemplate(subject, `
<p style="margin:0 0 16px 0;">Hi ${payload.name || 'Customer'},</p>
<p style="margin:0 0 16px 0;">Your return request for Order <strong>#${(payload.orderId || '').substring(0,8)}</strong> has been <strong>${payload.newStatus || 'updated'}</strong>.</p>
<p style="margin:0 0 24px 0;font-size:14px;color:#86868b;" class="text-muted">If approved, your escrow funds will be fully refunded shortly.</p>

<div style="text-align:center;">
    <a href="https://fairprice.ng/account/orders" class="btn" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">View Order Status</a>
</div>
            `);
            break;

        case 'ORDER_SHIPPED':
            subject = `Your order has shipped — #${(payload.orderId || '').substring(0,8)}`;
            html = BaseTemplate(subject, `
<p style="margin:0 0 16px 0;">Hi ${payload.name || 'Customer'},</p>
<p style="margin:0 0 16px 0;">Order <strong>#${(payload.orderId || '').substring(0,8)}</strong>${payload.productName ? ` — <strong>${payload.productName}</strong>` : ''} has left the merchant's warehouse and is currently in transit.</p>
<p style="margin:0 0 24px 0;font-size:14px;color:#86868b;" class="text-muted">You can track its live status below. Remember, your funds remain safe in escrow until delivery is confirmed.</p>

<div style="text-align:center;">
    <a href="https://fairprice.ng/account/orders" class="btn" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">Track Package</a>
</div>
            `);
            break;

        case 'ORDER_INQUIRY':
            subject = 'New Order Inquiry from Buyer';
            html = BaseTemplate(subject, `
<p style="margin:0 0 16px 0;">Hi ${payload.sellerName || 'Seller'},</p>
<p style="margin:0 0 16px 0;">The buyer has an inquiry regarding Order <strong>#${(payload.orderId || '').substring(0,8)}</strong>.</p>
<div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:0 0 24px 0;" class="feature-box">
    <p style="font-size:15px;margin:0;font-style:italic;" class="text-main">"${payload.message || 'I have a question about this order.'}"</p>
</div>
<p style="margin:0 0 24px 0;font-size:14px;color:#86868b;" class="text-muted">Please respond as soon as possible via the messaging dashboard to ensure a smooth Escrow transaction.</p>

<div style="text-align:center;">
    <a href="${payload.dashboardUrl || 'https://fairprice.ng/seller/dashboard/messages'}" class="btn" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">Reply to Customer</a>
</div>
            `);
            break;

        case 'NEW_DISPUTE':
            subject = `Dispute Filed: Order #${(payload.orderId || '').substring(0,8)}`;
            html = BaseTemplate("Dispute Action Required ⚠️", `
<p style="margin:0 0 16px 0;">Hi ${payload.sellerName || 'Seller'},</p>
<p style="margin:0 0 16px 0;">A dispute was just filed by the customer on Order <strong>#${(payload.orderId || '').substring(0,8)}</strong>.</p>
<div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:0 0 24px 0;">
    <p style="font-size:15px;margin:0;color:#dc2626;"><strong>Issue:</strong> "${payload.message || 'Issue not specified.'}"</p>
</div>
<p style="margin:0 0 24px 0;font-size:14px;color:#86868b;" class="text-muted">Your escrow payment for this transaction has been temporarily frozen. Please navigate to your dashboard immediately to review the dispute and provide evidence or a resolution.</p>

<div style="text-align:center;">
    <a href="${payload.dashboardUrl || 'https://fairprice.ng/seller/orders'}" class="btn" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">Review Dispute</a>
</div>
            `);
            break;

        default:
            subject = 'FairPrice Notification';
            html = BaseTemplate("Notification", `
<p style="margin:0 0 16px 0;">Hi ${name},</p>
<p style="margin:0 0 24px 0;">${(payload as any)?.message || 'You have a new notification from FairPrice.'}</p>

<div style="text-align:center;">
    <a href="https://fairprice.ng" style="display:inline-block;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;" class="btn">Visit FairPrice</a>
</div>
            `);
            break;
    }

    return { subject, html };
}
