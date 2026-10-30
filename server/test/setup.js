// Loaded first by every API test. It points the app at a throwaway database and refuses
// to run against anything else, because the tests create and delete real rows.
const url = process.env.TEST_DATABASE_URL;

if (!url) {
  throw new Error("Set TEST_DATABASE_URL to a database whose name ends with _test");
}

const databaseName = new URL(url).pathname.replace(/^\//, "");

if (!databaseName.endsWith("_test")) {
  throw new Error(`Refusing to run API tests on "${databaseName}": the name must end with _test`);
}

// dotenv never overrides variables that are already set, so these win over server/.env.
process.env.DATABASE_URL = url;
process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-the-tests";
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "admin-password";
process.env.SUPABASE_URL = "";
process.env.LOG_LEVEL = "silent";
process.env.CORS_ORIGIN = "http://localhost:5173";

// Imported after the variables above are set, because env.js reads them at import time.
const { app } = await import("../src/app.js");
const { prisma, ensureAdminUser } = await import("../src/db.js");
const { default: bcrypt } = await import("bcrypt");
const { default: request } = await import("supertest");

export { app, prisma, request };

export const testPassword = "correct-horse-battery";

// Test users all use this domain so they can be found and removed again.
export const testEmailDomain = "@test.local";

export const removeTestData = async () => {
  // Deleting a car removes its fuel, services, notes and photos by cascade, but cars
  // themselves do not cascade from users, so they go first. Stations are removed too.
  const owner = { user: { email: { endsWith: testEmailDomain } } };
  await prisma.car.deleteMany({ where: owner });
  await prisma.fuelStation.deleteMany({ where: owner });
  await prisma.user.deleteMany({ where: { email: { endsWith: testEmailDomain } } });
};

export const prepareDatabase = async () => {
  await removeTestData();
  await ensureAdminUser();
};

export const createUser = async (name) => {
  const email = `${name}${testEmailDomain}`;
  const passwordHash = await bcrypt.hash(testPassword, 4);
  const user = await prisma.user.create({ data: { email, passwordHash } });
  return { ...user, email };
};

// Signs in through the real endpoint so the token goes through the same code as in production.
export const login = async (email, password = testPassword) => {
  const response = await request(app).post("/api/login").send({ email, password });
  return response.body.token;
};

export const auth = (token) => ({ Authorization: `Bearer ${token}` });
