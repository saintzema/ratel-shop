import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { buildEmailTemplate, EmailType } from '@/lib/email-templates';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY || 're_YxXYZ...');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { to, type, payload } = body as { to: string, type: EmailType, payload: any };

        if (!to || !type) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: to, type' },
                { status: 400 }
            );
        }

        const { subject, html } = buildEmailTemplate(type, payload || {});

        const data = await resend.emails.send({
            from: 'FairPrice <onboarding@resend.dev>', // We use the resend dev email for testing since domain isn't verified in demo
            to: [to],
            subject: subject,
            html: html,
        });

        if (data.error) {
            console.error("Resend Error:", data.error);
            return NextResponse.json({ success: false, error: data.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error("Email dispatcher error:", error);
        return NextResponse.json(
            { success: false, error: 'Internal server error while sending email' },
            { status: 500 }
        );
    }
}
