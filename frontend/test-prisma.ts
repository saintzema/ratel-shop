import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({
    datasourceUrl: "postgresql://dummy"
});
