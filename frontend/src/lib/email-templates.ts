export type EmailType = 'WELCOME' | 'VERIFY_EMAIL' | 'ORDER_PLACED' | 'CHANGE_PASSWORD' | 'PROMOTIONAL' | 'SELLER_WELCOME' | 'SELLER_APPROVED';

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
}

const BRAND_COLOR = "#059669"; // brand-green-600
const LOGO_URL = "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&q=80&w=200&h=200"; // Placeholder logo since we don't have a direct public URL for the SVG in emails, but we can also use styled text

function BaseTemplate(title: string, contentHTML: string) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>${title}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; font-size: 16px; line-height: 1.5; margin: 0; padding: 0; background-color: #f9fafb; color: #1f2937; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .card { background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb; }
            .header { text-align: center; margin-bottom: 32px; }
            .logo { height: 40px; border-radius: 8px; margin-bottom: 16px; }
            .title { font-size: 24px; font-weight: 800; color: #111827; margin: 0; letter-spacing: -0.025em; }
            .btn { display: inline-block; padding: 14px 28px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; text-align: center; margin-top: 24px; transition: background-color 0.2s; }
            .footer { text-align: center; margin-top: 32px; color: #6b7280; font-size: 14px; }
            .code-box { background-color: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; font-size: 32px; font-weight: 900; letter-spacing: 0.2em; color: ${BRAND_COLOR}; margin: 24px 0; border: 2px dashed #d1d5db; }
            .info-table { width: 100%; border-collapse: collapse; margin: 24px 0; }
            .info-table td { padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
            .info-label { font-weight: 600; color: #4b5563; }
            .info-value { text-align: right; font-weight: 700; color: #111827; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="header">
                    <div style="font-size: 28px; font-weight: 900; letter-spacing: -1px; color: ${BRAND_COLOR}; margin-bottom: 8px;">
                        FairPrice
                    </div>
                    <h1 class="title">${title}</h1>
                </div>
                ${contentHTML}
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} FairPrice. All rights reserved.</p>
                <p>123 Commerce Avenue, Lagos, Nigeria</p>
            </div>
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
                <p>Hi ${name},</p>
                <p>We're absolutely thrilled to have you join FairPrice! You've just unlocked access to Nigeria's smartest, most secure marketplace.</p>
                <p>Whether you're here to discover incredible deals, negotiate directly with sellers using Ziva AI, or launch your own digital storefront, we've got you covered.</p>
                <center>
                    <a href="https://fairprice.ng" class="btn">Explore the Marketplace</a>
                </center>
            `);
            break;

        case 'VERIFY_EMAIL':
            subject = "Verify your FairPrice account code";
            html = BaseTemplate("Verify Your Email", `
                <p>Hi ${name},</p>
                <p>Please use the verification code below to confirm your email address and secure your account.</p>
                <div class="code-box">
                    ${payload.code || "----"}
                </div>
                <p style="font-size: 14px; color: #6b7280;">If you didn't request this code, you can safely ignore this email.</p>
            `);
            break;

        case 'ORDER_PLACED':
            subject = `Order Confirmation: ${payload.orderId}`;
            html = BaseTemplate("Order Confirmed!", `
                <p>Hi ${name},</p>
                <p>Awesome news! Your order has been successfully placed and is now secured by FairPrice Escrow.</p>
                
                <table class="info-table">
                    <tr>
                        <td class="info-label">Order / Tracking ID</td>
                        <td class="info-value">${payload.orderId}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Item</td>
                        <td class="info-value">${payload.productName}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Total Amount</td>
                        <td class="info-value">₦${payload.amount?.toLocaleString() || "0"}</td>
                    </tr>
                </table>

                <p style="margin-top: 24px;">Your funds are completely safe and will not be released to the merchant until you confirm delivery.</p>
                
                <center>
                    <a href="${payload.trackingUrl || "https://fairprice.ng/account/orders"}" class="btn">Track Your Order</a>
                </center>
            `);
            break;

        case 'CHANGE_PASSWORD':
            subject = "FairPrice Password Reset";
            html = BaseTemplate("Password Change Request", `
                <p>Hi ${name},</p>
                <p>We received a request to change the password for your FairPrice account.</p>
                <p>If you made this request, click the button below to securely update your credentials:</p>
                <center>
                    <a href="https://fairprice.ng/login" class="btn">Reset Password</a>
                </center>
                <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">If you didn't request a password change, please ignore this email or contact support immediately.</p>
            `);
            break;

        case 'PROMOTIONAL':
            subject = `Special Offer from ${payload.sellerName || "a FairPrice Partner"}`;
            html = BaseTemplate("Exclusive Store Offer", `
                <p>Hi ${name},</p>
                ${payload.promoContent || "<p>We have some exciting new drops you won't want to miss!</p>"}
                <center>
                    <a href="https://fairprice.ng" class="btn">Shop Now</a>
                </center>
            `);
            break;

        case 'SELLER_WELCOME':
            subject = "Welcome to FairPrice Sellers! 🚀";
            html = BaseTemplate("Your Seller Journey Begins", `
                <p>Hi ${name},</p>
                <p>Thank you for registering to become a verified FairPrice Seller!</p>
                <p>Our administration team is currently reviewing your KYC verification documents and business profile. This process helps us keep FairPrice the safest marketplace in Africa.</p>
                <center>
                    <a href="https://fairprice.ng/seller/dashboard?kyc=pending" class="btn">Go to Dashboard</a>
                </center>
            `);
            break;

        case 'SELLER_APPROVED':
            subject = "Your FairPrice Store is Live! 🎉";
            html = BaseTemplate("Congratulations!", `
                <p>Hi ${name},</p>
                <p>We are thrilled to let you know that your KYC documents have been reviewed and approved!</p>
                <p>Your FairPrice Seller profile is now fully active, and your products will be visible to millions of shoppers across the global platform.</p>
                <div class="code-box" style="font-size: 16px; letter-spacing: normal; cursor: text;">
                    fairprice.ng/store/${payload.storeUrl || "your-store"}
                </div>
                <center>
                    <a href="https://fairprice.ng/store/${payload.storeUrl || "your-store"}" class="btn">View your Public Store</a>
                </center>
            `);
            break;
    }

    return { subject, html };
}
