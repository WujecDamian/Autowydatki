import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";

const missing = ["DATABASE_URL", "JWT_SECRET", "ADMIN_EMAIL", "ADMIN_PASSWORD"].filter(
  (name) => !process.env[name],
);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

if (isProduction) {
  const weakSecret =
    process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith("dev-only");

  if (weakSecret) {
    throw new Error("JWT_SECRET must be at least 32 characters and not a dev value in production");
  }

  if (!process.env.CORS_ORIGIN) {
    throw new Error("CORS_ORIGIN is required in production");
  }
}

export const env = {
  isProduction,
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL !== "false",
  jwtSecret: process.env.JWT_SECRET,
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  port: Number(process.env.PORT) || 3001,
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
};
