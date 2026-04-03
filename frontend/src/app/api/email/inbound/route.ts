import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';

// Production-safe log path (relative to project root)
const LOG_FILE_PATH = path.join(process.cwd(), 'inbound_emails.log');
const VIEWER_SECRET = "FP_SECRET_2025"; 

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Resend Inbound Webhook Handler (POST)
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const timestamp = new Date().toISOString();
        
        const emailData = body.data || body; 
        
        // Use Official Resend SDK to fetch the full email body
        let fullHtml = 'No html content';
        let fullText = 'No text content';
        let fetchStatus = "Not attempted";

        if (emailData.email_id) {
            if (!process.env.RESEND_API_KEY) {
                fetchStatus = "FAILED: RESEND_API_KEY is missing from environment";
            } else {
                try {
                    const response = await resend.emails.get(emailData.email_id);
                    
                    if (response.data) {
                        fullHtml = (response.data as any).html || 'No HTML in API response';
                        fullText = (response.data as any).text || 'No Text in API response';
                        fetchStatus = "SUCCESS";
                    } else if (response.error) {
                        fetchStatus = `FAILED: SDK Error - ${JSON.stringify(response.error)}`;
                    }
                } catch (err: any) {
                    fetchStatus = `FAILED: Exception - ${err.message}`;
                }
            }
        }

        // 3. Optional: Forward to iPhone (Personal Inbox)
        if (process.env.ESCALATION_EMAIL && fetchStatus === "SUCCESS") {
            try {
                await resend.emails.send({
                    from: "FairPrice Support <hello@fairprice.ng>",
                    to: process.env.ESCALATION_EMAIL,
                    replyTo: emailData.from, // This allows the user to hit 'Reply' on their iPhone!
                    subject: `[Fwd] ${emailData.subject || 'Inbound Email'}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <p><strong>From:</strong> ${emailData.from}</p>
                            <p><strong>To:</strong> ${emailData.to}</p>
                            <p><strong>Subject:</strong> ${emailData.subject}</p>
                            <hr />
                            ${fullHtml}
                        </div>
                    `
                });
                console.log(`[Inbound Email] Forwarded to ${process.env.ESCALATION_EMAIL}`);
            } catch (err) {
                console.error("Failed to forward email:", err);
            }
        }

        const logEntry = `
--------------------------------------------------
TIMESTAMP: ${timestamp}
FROM: ${emailData.from}
TO: ${emailData.to}
SUBJECT: ${emailData.subject}
FETCH STATUS: ${fetchStatus}

TEXT CONTENT:
${fullText}

HTML CONTENT:
${fullHtml}

RAW WEBHOOK PAYLOAD:
${JSON.stringify(body, null, 2)}
--------------------------------------------------
\n`;

        // Append to log file in the project root
        fs.appendFileSync(LOG_FILE_PATH, logEntry);
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Inbound email error:", error);
        return NextResponse.json({ success: false, error: 'Failed to process inbound email' }, { status: 500 });
    }
}

/**
 * Log Viewer (GET)
 * Access via: https://fairprice.ng/api/email/inbound?secret=FP_SECRET_2025
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== VIEWER_SECRET) {
        return new NextResponse("Unauthorized", { status: 403 });
    }

    try {
        if (!fs.existsSync(LOG_FILE_PATH)) {
            return new NextResponse("No emails received yet.", { status: 200 });
        }
        const logs = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
        return new NextResponse(logs, { 
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    } catch (error) {
        return new NextResponse("Error reading logs", { status: 500 });
    }
}
