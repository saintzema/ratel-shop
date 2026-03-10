import { db } from './src/lib/db';

async function main() {
    const email = 'apple-review@fairprice.app'.toLowerCase();
    const password = 'Reviewer2026!';

    const user = await db.user.upsert({
        where: { email },
        update: {
            password,
        },
        create: {
            email,
            name: 'Apple Reviewer',
            password,
            role: 'customer'
        }
    });

    console.log(`✅ Upserted Apple Review account: ${user.email} | ID: ${user.id}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
