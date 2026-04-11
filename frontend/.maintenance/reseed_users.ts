// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const prisma = new PrismaClient();

const users = [
    { id: "buyer_123", email: "buyer_test@example.com", name: "Test Buyer", role: "customer", createdAt: "2026-03-19T03:47:32.942Z" },
    { id: "global-user", email: "global@fairprice.app", name: "FairPrice Global", role: "admin", createdAt: "2026-04-05T15:14:51.371Z" },
    { id: "global_partner", email: "techzema@gmail.com", name: "Global Stores", password: "$2b$12$x0lAVdiBmrIkvVulZ5Kx6.Ush3FzCUG.VIns4w.qlX0A2.MQIghz.", role: "seller", createdAt: "2026-03-07T09:45:51.878Z", updatedAt: "2026-04-08T18:53:47.242Z" },
    { id: "guest", email: "guest@fairprice.ng", name: "Guest Buyer", role: "customer", createdAt: "2026-03-13T02:11:45.346Z" },
    { id: "user_abc123def", email: "saintzema@gmail.com", name: "Saint Zema", role: "customer", birthday: "1998-03-22T00:00:00Z", createdAt: "2026-03-18T08:00:00.000Z" },
    { id: "user_f4x2w5f3s", email: "Odogwunabunacfa@gmail.com", name: "Emmanuel King", role: "customer", birthday: "1988-12-25T00:00:00Z", createdAt: "2026-04-06T16:50:05.446Z" },
    { id: "user_loli7uw6a", email: "info.godswillazubike@gmail.com", name: "Godswill Azubike", role: "customer", birthday: "1993-01-02T00:00:00Z", createdAt: "2026-03-20T14:46:13.140Z" },
    { id: "user_qv49db35h", email: "ZemedicAI.com@gmail.com", name: "Zed Med", role: "customer", birthday: "1997-07-09T00:00:00Z", createdAt: "2026-03-14T15:39:43.798Z" },
    { id: "user_techzema@gmail.com", email: "fairprice2026@gmail.com", name: "Admin", password: "$2b$12$UitfgXSuBJe/kRIwwmuqFuv7/JgbsdiPwmFHg5KFwRe59mJumCUnm", role: "admin", createdAt: "2026-03-10T09:51:43.433Z", updatedAt: "2026-03-19T03:51:44.744Z" },
    { id: "user_xyz789ghi", email: "zaborsky@gmail.com", name: "Zaborsky", role: "customer", birthday: "1996-11-10T00:00:00Z", createdAt: "2026-03-22T12:00:00.000Z" },
    { id: "user_y104w587k", email: "Obifedike@gmail.com", name: "Obi Ifedike", role: "customer", birthday: "1995-03-10T00:00:00Z", createdAt: "2026-04-02T09:36:49.062Z", updatedAt: "2026-04-02T09:42:11.373Z" },
    { id: "usr_1773162548417", email: "apple-review@fairprice.app", name: "Apple Reviewer", password: "Reviewer2026!", role: "customer", createdAt: "2026-03-10T17:22:47.964Z" },
    { id: "usr_1773882854634", email: "dev.swtstay@gmail.com", name: "Swt Stay", password: "$2b$12$mvXmRaiiQRMg20l9WIL6TuYFO2c8gdLqrpUpXa6S.YBGFbOugHH0O", role: "customer", birthday: "1998-03-03T00:00:00Z", createdAt: "2026-03-19T01:14:17.103Z", updatedAt: "2026-03-24T12:23:51.799Z" }
];

async function main() {
    console.log("👤 Reseeding Users from local DB...");
    for (const u of users) {
        try {
            const user = await prisma.user.upsert({
                where: { id: u.id },
                update: {
                    email: u.email,
                    name: u.name,
                    role: u.role,
                    password: u.password || null,
                    birthday: u.birthday || null,
                },
                create: {
                    id: u.id,
                    email: u.email,
                    name: u.name,
                    role: u.role,
                    password: u.password || null,
                    birthday: u.birthday || null,
                    createdAt: new Date(u.createdAt)
                }
            });

            // If it's the global_partner, ensure the Seller record exists
            if (u.id === "global_partner") {
                await prisma.seller.upsert({
                    where: { id: "global-partners" },
                    update: { ownerEmail: u.email, businessName: u.name, userId: u.id },
                    create: {
                        id: "global-partners",
                        userId: u.id,
                        businessName: u.name,
                        ownerName: u.name,
                        ownerEmail: u.email,
                        description: "Official Global Stores Marketplace Account",
                        category: "electronics",
                        status: "active",
                        verified: true,
                        trustScore: 70
                    }
                });
                console.log(`📡 Seller Record Created for: ${u.name}`);
            }

            console.log(`✅ Synced: ${u.email} (${u.role})`);
        } catch (e) {
            console.error(`❌ Error syncing ${u.email}:`, e);
        }
    }
    console.log("✨ User Reseed Complete!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
