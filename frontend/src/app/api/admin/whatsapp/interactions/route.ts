import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/jwt";

const RETENTION_DAYS = 90;

function parseInteraction(i: { id: string; phoneNumber: string; interaction_type: string; payload: string | null; createdAt: Date }) {
    let messageText = "";
    let direction: "inbound" | "outbound" = "inbound";
    let metadata: any = {};

    try {
        const payload = i.payload ? JSON.parse(i.payload) : {};
        messageText = payload.text || payload.fullText || payload.iceBreaker || payload.bodyText || i.payload || "";
        direction = i.interaction_type === "outbound_message" ? "outbound" : "inbound";
        metadata = payload;
    } catch {
        messageText = i.payload || "";
    }

    return {
        id: i.id,
        phoneNumber: i.phoneNumber,
        messageText,
        direction,
        type: i.interaction_type.split("_")[0],
        rawType: i.interaction_type,
        metadata,
        createdAt: i.createdAt,
    };
}

export async function GET(req: Request) {
    try {
        // Admin login uses this app's own JWT (fp_token), not NextAuth OAuth —
        // getServerSession alone always returned null here, 401'ing every poll
        // and making the page render as permanently empty.
        const jwtAdmin = getUserFromRequest(req);
        const isJwtAdmin = jwtAdmin?.role === "admin";
        const session = isJwtAdmin ? null : await getServerSession(authOptions);
        if (!isJwtAdmin && (!session || (session as any).user?.role !== "admin")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Opportunistic retention cleanup — a full deleteMany on every 10s poll from
        // every open admin tab would be wasteful, so this only fires ~5% of requests.
        // The range delete is indexed on createdAt and cheap when it does run.
        if (Math.random() < 0.05) {
            const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
            db.whatsAppInteraction.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => {});
        }

        const { searchParams } = new URL(req.url);
        const view = searchParams.get("view");
        const phoneNumber = searchParams.get("phoneNumber");
        const cursor = searchParams.get("cursor") || undefined;
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

        // ── Single-contact thread, paginated ────────────────────────────────
        if (phoneNumber) {
            const rows = await db.whatsAppInteraction.findMany({
                where: { phoneNumber },
                orderBy: { createdAt: "desc" },
                take: limit + 1,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            });
            const hasMore = rows.length > limit;
            const page = hasMore ? rows.slice(0, limit) : rows;
            return NextResponse.json({
                interactions: page.map(parseInteraction),
                nextCursor: hasMore ? page[page.length - 1].id : null,
            });
        }

        // ── Grouped contact list ─────────────────────────────────────────────
        // Prisma has no cheap "latest row per group" query, so pull a bounded
        // recent window and group in memory — 1000 rows is a trivial fetch and
        // comfortably covers "who messaged recently" without a raw SQL query.
        if (view === "contacts") {
            const recent = await db.whatsAppInteraction.findMany({
                orderBy: { createdAt: "desc" },
                take: 1000,
            });

            const byPhone = new Map<string, typeof recent>();
            for (const row of recent) {
                const list = byPhone.get(row.phoneNumber) || [];
                list.push(row);
                byPhone.set(row.phoneNumber, list);
            }

            const phones = Array.from(byPhone.keys());

            // Resolve a display name + logo for each number, if registered on the
            // platform, so the list shows "Global Stores" instead of a bare number.
            const [users, sellers] = await Promise.all([
                db.user.findMany({
                    where: { whatsappNumber: { in: phones } },
                    select: { whatsappNumber: true, name: true },
                }),
                db.seller.findMany({
                    where: { whatsappNumber: { in: phones } },
                    select: { whatsappNumber: true, businessName: true, logoUrl: true, storeUrl: true, id: true },
                }),
            ]);
            const sellerByPhone = new Map(sellers.map(s => [s.whatsappNumber as string, s]));
            const userByPhone = new Map(users.map(u => [u.whatsappNumber as string, u]));

            const contacts = phones.map(phone => {
                const list = byPhone.get(phone)!;
                const latest = list[0];
                const seller = sellerByPhone.get(phone);
                const user = userByPhone.get(phone);
                const parsedLatest = parseInteraction(latest);
                return {
                    phoneNumber: phone,
                    displayName: seller?.businessName || user?.name || null,
                    logoUrl: seller?.logoUrl || null,
                    storeUrl: seller?.storeUrl || null,
                    sellerId: seller?.id || null,
                    messageCount: list.length,
                    lastMessage: parsedLatest.messageText,
                    lastMessageAt: latest.createdAt,
                    lastDirection: parsedLatest.direction,
                };
            }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

            const startIdx = cursor ? contacts.findIndex(c => c.phoneNumber === cursor) + 1 : 0;
            const page = contacts.slice(startIdx, startIdx + limit);
            const hasMore = startIdx + limit < contacts.length;

            return NextResponse.json({
                contacts: page,
                nextCursor: hasMore ? page[page.length - 1]?.phoneNumber || null : null,
                totalContacts: contacts.length,
            });
        }

        // ── Legacy flat view (back-compat) ──────────────────────────────────
        const rawInteractions = await db.whatsAppInteraction.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        return NextResponse.json(rawInteractions.map(parseInteraction));
    } catch (error: any) {
        console.error("Failed to fetch WhatsApp interactions:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
