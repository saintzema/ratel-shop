
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_SELLER_ID = 'global_partner';
const TARGET_BUYER_ID = 'user_abc123def';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // Simple security gate
    if (key !== 'adopt_metrics_2026') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('--- Starting Production Adoption Bridge ---');

        // 1. Audit Current State
        const validUsers = await prisma.user.findMany({ select: { id: true } });
        const validUserIds = new Set(validUsers.map(u => u.id));

        // 2. Identify Orphans (Linked to non-existent users)
        const orphanedOrders = await prisma.order.findMany({
            where: {
                OR: [
                    { customerId: { notIn: Array.from(validUserIds) } },
                    { sellerId: { notIn: Array.from(validUserIds) } }
                ]
            }
        });

        const orphanedNegotiations = await prisma.negotiationRequest.findMany({
            where: {
                OR: [
                    { customerId: { notIn: Array.from(validUserIds) } },
                    { sellerId: { notIn: Array.from(validUserIds) } }
                ]
            }
        });

        // 3. Adopt Orders
        let totalRevenueAdopted = 0;
        const tasks = [];
        
        for (const order of orphanedOrders) {
            const newCustomerId = validUserIds.has(order.customerId) ? order.customerId : TARGET_BUYER_ID;
            const newSellerId = validUserIds.has(order.sellerId) ? order.sellerId : TARGET_SELLER_ID;

            tasks.push(prisma.order.update({
                where: { id: order.id },
                data: {
                    customerId: newCustomerId,
                    sellerId: newSellerId
                }
            }));
            totalRevenueAdopted += Number(order.amount);
        }

        // 4. Adopt Negotiations
        for (const neg of orphanedNegotiations) {
            const newCustomerId = validUserIds.has(neg.customerId) ? neg.customerId : TARGET_BUYER_ID;
            const newSellerId = validUserIds.has(neg.sellerId) ? neg.sellerId : TARGET_SELLER_ID;

            tasks.push(prisma.negotiationRequest.update({
                where: { id: neg.id },
                data: {
                    customerId: newCustomerId,
                    sellerId: newSellerId
                }
            }));
        }

        await Promise.all(tasks);

        return NextResponse.json({
            success: true,
            results: {
                ordersAdopted: orphanedOrders.length,
                negotiationsAdopted: orphanedNegotiations.length,
                revenueRestored: totalRevenueAdopted
            }
        });

    } catch (error: any) {
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
