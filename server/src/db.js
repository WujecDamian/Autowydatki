import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.js";
import { PrismaClient } from "./generated/prisma/client.ts";

// Supabase requires TLS; set DATABASE_SSL=false for a local PostgreSQL.
// Set DATABASE_CA (PEM contents) to verify the server certificate; without it the
// connection is encrypted but the certificate is not checked.
const ssl = !env.databaseSsl
  ? false
  : process.env.DATABASE_CA
    ? { ca: process.env.DATABASE_CA.replace(/\\n/g, "\n"), rejectUnauthorized: true }
    : { rejectUnauthorized: false };

if (env.isProduction && ssl && !ssl.rejectUnauthorized) {
  console.warn("DATABASE_CA is not set: the database certificate is not verified");
}

// The timeout turns an unreachable database into an error instead of a silent hang.
const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
  ssl,
  connectionTimeoutMillis: 15000,
});

export const prisma = new PrismaClient({ adapter });

// Prisma returns DATE columns as Date objects at UTC midnight; the API sends "YYYY-MM-DD".
export const toDateString = (date) => date.toISOString().slice(0, 10);
export const fromDateString = (value) => new Date(`${value}T00:00:00.000Z`);

// Tables come from `prisma migrate deploy`; this only makes sure the admin account exists.
export const ensureAdminUser = async () => {
  const email = env.adminEmail;
  const password = env.adminPassword;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, passwordHash } });
};
