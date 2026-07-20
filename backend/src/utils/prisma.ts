import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
	__pgPool?: pg.Pool;
	__prisma?: PrismaClient;
};

const pool =
	globalForPrisma.__pgPool ??
	new pg.Pool({
		connectionString: process.env.DATABASE_URL,
		max: Number(process.env.DB_POOL_MAX ?? 5),
	});

const adapter = new PrismaPg(pool);

const prisma = globalForPrisma.__prisma ?? new PrismaClient({ adapter });

globalForPrisma.__pgPool = pool;
globalForPrisma.__prisma = prisma;

export { prisma };
