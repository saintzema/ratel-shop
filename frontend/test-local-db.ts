// import { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

async function testConnection() {
    const localUrl = "postgresql://postgres:postgres@localhost:5432/fair_price_ng";
    console.log("Testing connection to:", localUrl);
    
    const pool = new Pool({ connectionString: localUrl });
    try {
        const client = await pool.connect();
        console.log("SUCCESS: Local database is reachable.");
        client.release();
    } catch (err: any) {
        console.error("FAILED: Could not reach local database.", err.message);
    } finally {
        await pool.end();
    }
}

testConnection();
