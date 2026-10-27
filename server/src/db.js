import { readFile } from "node:fs/promises";
import bcrypt from "bcrypt";
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const DATE_TYPE_ID = 1082;
pg.types.setTypeParser(DATE_TYPE_ID, (value) => value);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

// Supabase requires TLS; set DATABASE_SSL=false for a local PostgreSQL.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

const attachEntriesWithoutACar = async () => {
  await pool.query(`
    INSERT INTO cars (user_id, name)
    SELECT DISTINCT entries.user_id, 'Moje auto'
    FROM (
      SELECT user_id FROM fuel_entries WHERE car_id IS NULL
      UNION
      SELECT user_id FROM service_entries WHERE car_id IS NULL
    ) AS entries
    WHERE NOT EXISTS (
      SELECT 1 FROM cars WHERE cars.user_id = entries.user_id
    )
  `);

  await pool.query(`
    UPDATE fuel_entries
    SET car_id = (
      SELECT id FROM cars
      WHERE cars.user_id = fuel_entries.user_id
      ORDER BY id
      LIMIT 1
    )
    WHERE car_id IS NULL
  `);

  await pool.query(`
    UPDATE service_entries
    SET car_id = (
      SELECT id FROM cars
      WHERE cars.user_id = service_entries.user_id
      ORDER BY id
      LIMIT 1
    )
    WHERE car_id IS NULL
  `);
};

export const initDatabase = async () => {
  const schemaUrl = new URL("../sql/schema.sql", import.meta.url);
  const schema = await readFile(schemaUrl, "utf8");
  await pool.query(schema);
  await attachEntriesWithoutACar();
  await pool.query(`
    ALTER TABLE fuel_entries ALTER COLUMN car_id SET NOT NULL;
    ALTER TABLE service_entries ALTER COLUMN car_id SET NOT NULL;
  `);

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password || !process.env.JWT_SECRET) {
    throw new Error("ADMIN_EMAIL, ADMIN_PASSWORD, and JWT_SECRET are required");
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);

  if (existing.rows.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query("INSERT INTO users (email, password_hash) VALUES ($1, $2)", [
    email,
    passwordHash,
  ]);
};
