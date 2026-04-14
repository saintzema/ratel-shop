import { Client } from 'pg';

async function prepareDatabase() {
    // DBngin default credentials for local postgres
    const connectionString = "postgresql://postgres@localhost:5432/postgres";
    const client = new Client({ connectionString });

    try {
        await client.connect();
        
        // Check if fair_price_ng exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname='fair_price_ng'");
        
        if (res.rowCount === 0) {
            console.log("Database 'fair_price_ng' does not exist. Creating...");
            // CREATE DATABASE cannot run inside a transaction/with certain clients easily, 
            // but we'll try it directly.
            await client.query("CREATE DATABASE fair_price_ng");
            console.log("DONE: Database 'fair_price_ng' created.");
        } else {
            console.log("Database 'fair_price_ng' already exists.");
        }
    } catch (err: any) {
        console.error("ERROR preparing database:", err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

prepareDatabase();
