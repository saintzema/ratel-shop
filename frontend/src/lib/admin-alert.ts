import { Resend } from "resend";
import { buildEmailTemplate } from "@/lib/email-templates";
import { notifyAdmins } from "@/lib/admin-notify";

const resend = new Resend(process.env.RESEND_API_KEY || 're_YxXYZ...');

const ADMIN_ALERT_EMAILS = ["fairprice2026@gmail.com", "techzema@gmail.com"];

/**
 * Early-days fallback for the "we don't have enough registered
 * experts/couriers yet" gap — a request lands as both an in-app admin
 * notification AND a direct email to the two operator inboxes, so the team
 * can manually match a real person while the marketplace side is still thin.
 * Best-effort: swallows its own failures so a notify problem never blocks
 * the request that triggered it.
 */
export async function sendAdminAlert(opts: {
    title: string;
    message: string;
    data?: Record<string, string>;
    link?: string;
}): Promise<void> {
    try {
        await notifyAdmins(opts.message, { type: "system", link: opts.link });
    } catch {
        // best-effort
    }

    try {
        const { subject, html } = buildEmailTemplate("SYSTEM_ALERT", {
            title: opts.title,
            message: opts.message,
            data: opts.data || {},
            dashboardUrl: opts.link ? `https://www.fairprice.ng${opts.link}` : "https://www.fairprice.ng/admin",
        });
        if (html) {
            await resend.emails.send({
                from: '🛍️ FairPrice Shop <hello@fairprice.ng>',
                to: ADMIN_ALERT_EMAILS,
                subject: subject || opts.title,
                html,
            });
        }
    } catch (err) {
        console.error("[sendAdminAlert] email failed:", err);
    }
}
