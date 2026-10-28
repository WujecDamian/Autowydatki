import bcrypt from "bcrypt";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

// Supabase requires TLS; set DATABASE_SSL=false for a local PostgreSQL.
// The timeout turns an unreachable database into an error instead of a silent hang.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

export const prisma = new PrismaClient({ adapter });

// Prisma returns DATE columns as Date objects at UTC midnight; the API sends "YYYY-MM-DD".
export const toDateString = (date) => date.toISOString().slice(0, 10);
export const fromDateString = (value) => new Date(`${value}T00:00:00.000Z`);

// Tables come from `prisma migrate deploy`; this only makes sure the admin account exists.
export const ensureAdminUser = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password || !process.env.JWT_SECRET) {
    throw new Error("ADMIN_EMAIL, ADMIN_PASSWORD, and JWT_SECRET are required");
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, passwordHash } });
};
