import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  app,
  auth,
  createUser,
  login,
  prepareDatabase,
  prisma,
  removeTestData,
  request,
  testEmailDomain,
  testPassword,
} from "./setup.js";
import { env } from "../src/env.js";

let alice;
let bob;
let aliceToken;
let bobToken;
let aliceCar;

const validFuel = (carId) => ({
  carId,
  entryDate: "2026-01-02",
  odometerKm: 1000,
  quantity: 40,
  totalCost: 250,
});

before(async () => {
  await prepareDatabase();
  alice = await createUser("alice");
  bob = await createUser("bob");
  aliceToken = await login(alice.email);
  bobToken = await login(bob.email);

  const created = await request(app)
    .post("/api/cars")
    .set(auth(aliceToken))
    .send({ name: "Alice's car" });
  aliceCar = created.body;
});

after(async () => {
  await removeTestData();
  await prisma.$disconnect();
});

describe("health and unknown routes", () => {
  it("reports ok when the database answers", async () => {
    const response = await request(app).get("/health");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { status: "ok" });
  });

  it("tags every response with a request id", async () => {
    const response = await request(app).get("/health").set("X-Request-Id", "abc-123");

    assert.equal(response.headers["x-request-id"], "abc-123");
    assert.ok((await request(app).get("/health")).headers["x-request-id"]);
  });

  it("sends security headers", async () => {
    const response = await request(app).get("/health");

    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.ok(response.headers["strict-transport-security"]);
  });

  it("answers an unknown route with JSON, not HTML", async () => {
    const response = await request(app).get("/api/nope").set(auth(aliceToken));

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "NOT_FOUND");
  });

  it("answers broken JSON with a 400", async () => {
    const response = await request(app)
      .post("/api/cars")
      .set(auth(aliceToken))
      .set("Content-Type", "application/json")
      .send("{not json");

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "BAD_JSON");
  });
});

describe("authentication", () => {
  it("logs in with the right password", async () => {
    const response = await request(app)
      .post("/api/login")
      .send({ email: alice.email, password: testPassword });

    assert.equal(response.status, 200);
    assert.ok(response.body.token);
  });

  it("rejects a wrong password and an unknown email the same way", async () => {
    const wrongPassword = await request(app)
      .post("/api/login")
      .send({ email: alice.email, password: "nope" });
    const unknownEmail = await request(app)
      .post("/api/login")
      .send({ email: `ghost${testEmailDomain}`, password: "nope" });

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.equal(wrongPassword.body.message, unknownEmail.body.message);
  });

  it("rejects a login without a password", async () => {
    const response = await request(app).post("/api/login").send({ email: alice.email });

    assert.equal(response.status, 400);
  });

  it("requires a token", async () => {
    const response = await request(app).get("/api/cars");

    assert.equal(response.status, 401);
  });

  it("rejects a tampered token", async () => {
    const response = await request(app)
      .get("/api/cars")
      .set(auth(`${aliceToken.slice(0, -3)}abc`));

    assert.equal(response.status, 401);
  });

  it("rejects a token signed with another secret", async () => {
    const { default: jwt } = await import("jsonwebtoken");
    const forged = jwt.sign({ id: alice.id, email: alice.email }, "another-secret");
    const response = await request(app).get("/api/cars").set(auth(forged));

    assert.equal(response.status, 401);
  });

  it("rejects an expired token", async () => {
    const { default: jwt } = await import("jsonwebtoken");
    const expired = jwt.sign({ id: alice.id }, process.env.JWT_SECRET, { expiresIn: -10 });
    const response = await request(app).get("/api/cars").set(auth(expired));

    assert.equal(response.status, 401);
  });

  it("returns the signed-in user from /me", async () => {
    const response = await request(app).get("/api/me").set(auth(aliceToken));

    assert.equal(response.status, 200);
    assert.equal(response.body.email, alice.email);
  });
});

describe("one user cannot reach another user's data", () => {
  let fuelEntry;
  let note;

  before(async () => {
    fuelEntry = (
      await request(app).post("/api/fuel").set(auth(aliceToken)).send(validFuel(aliceCar.id))
    ).body;
    note = (
      await request(app)
        .post("/api/notes")
        .set(auth(aliceToken))
        .send({ carId: aliceCar.id, body: "secret" })
    ).body;
  });

  it("does not list Bob's view of Alice's car", async () => {
    const cars = await request(app).get("/api/cars").set(auth(bobToken));

    assert.deepEqual(cars.body, []);
  });

  for (const resource of ["fuel", "services", "notes"]) {
    it(`cannot read Alice's ${resource} list`, async () => {
      const response = await request(app)
        .get(`/api/${resource}?carId=${aliceCar.id}`)
        .set(auth(bobToken));

      assert.equal(response.status, 404);
    });
  }

  it("cannot add a fuel entry to Alice's car", async () => {
    const response = await request(app)
      .post("/api/fuel")
      .set(auth(bobToken))
      .send(validFuel(aliceCar.id));

    assert.equal(response.status, 404);
  });

  it("cannot edit or delete Alice's fuel entry", async () => {
    const edit = await request(app)
      .patch(`/api/fuel/${fuelEntry.id}`)
      .set(auth(bobToken))
      .send(validFuel(aliceCar.id));
    const remove = await request(app).delete(`/api/fuel/${fuelEntry.id}`).set(auth(bobToken));

    assert.equal(edit.status, 404);
    assert.equal(remove.status, 404);
  });

  it("cannot edit or delete Alice's note", async () => {
    const edit = await request(app)
      .patch(`/api/notes/${note.id}`)
      .set(auth(bobToken))
      .send({ body: "hacked" });
    const remove = await request(app).delete(`/api/notes/${note.id}`).set(auth(bobToken));

    assert.equal(edit.status, 404);
    assert.equal(remove.status, 404);
  });

  it("cannot edit or delete Alice's car", async () => {
    const edit = await request(app)
      .patch(`/api/cars/${aliceCar.id}`)
      .set(auth(bobToken))
      .send({ name: "Hacked" });
    const remove = await request(app).delete(`/api/cars/${aliceCar.id}`).set(auth(bobToken));

    assert.equal(edit.status, 404);
    assert.equal(remove.status, 404);
  });

  it("cannot list Alice's photos", async () => {
    const response = await request(app).get(`/api/cars/${aliceCar.id}/photos`).set(auth(bobToken));

    assert.equal(response.status, 404);
  });

  it("left Alice's data unchanged", async () => {
    const entries = await request(app)
      .get(`/api/fuel?carId=${aliceCar.id}`)
      .set(auth(aliceToken));
    const car = await prisma.car.findUnique({ where: { id: aliceCar.id } });

    assert.equal(entries.body.length, 1);
    assert.equal(car.name, "Alice's car");
  });

  it("does not show another user's custom stations", async () => {
    await request(app).post("/api/stations").set(auth(aliceToken)).send({ name: "Alice Oil" });
    const response = await request(app).get("/api/stations").set(auth(bobToken));

    assert.ok(!response.body.some((station) => station.name === "Alice Oil"));
  });

  it("cannot use Alice's station on Bob's fuel entry", async () => {
    const station = (
      await request(app).post("/api/stations").set(auth(aliceToken)).send({ name: "Alice Gas" })
    ).body;
    const bobCar = (
      await request(app).post("/api/cars").set(auth(bobToken)).send({ name: "Bob's car" })
    ).body;
    const response = await request(app)
      .post("/api/fuel")
      .set(auth(bobToken))
      .send({ ...validFuel(bobCar.id), stationId: station.id });

    assert.equal(response.status, 400);
  });
});

describe("electric cars", () => {
  let electricCar;
  let charger;
  let fuelStation;

  const post = (body) => request(app).post("/api/fuel").set(auth(aliceToken)).send(body);

  before(async () => {
    const car = await request(app)
      .post("/api/cars")
      .set(auth(aliceToken))
      .send({ name: "Alice's EV", powertrain: "ELECTRIC" });
    electricCar = car.body;

    const stations = (await request(app).get("/api/stations").set(auth(aliceToken))).body;
    charger = stations.find((station) => station.isCharging);
    fuelStation = stations.find((station) => !station.isCharging);
  });

  it("creates a car with a powertrain and defaults to petrol", async () => {
    assert.equal(electricCar.powertrain, "ELECTRIC");
    assert.equal(aliceCar.powertrain, "PETROL");

    const invalid = await request(app)
      .post("/api/cars")
      .set(auth(aliceToken))
      .send({ name: "Steam", powertrain: "STEAM" });
    assert.equal(invalid.status, 400);
  });

  it("lists built-in chargers apart from fuel stations", async () => {
    assert.ok(charger, "there are built-in charging networks");
    assert.ok(fuelStation, "there are built-in fuel stations");
  });

  it("saves a charge as ELECTRIC without a fuel type in the request", async () => {
    const created = await post({ ...validFuel(electricCar.id), quantity: 32.5, stationId: charger.id });

    assert.equal(created.status, 201);
    assert.equal(created.body.fuelType, "ELECTRIC");
    assert.equal(created.body.quantity, "32.5");
    assert.equal(created.body.station.id, charger.id);
  });

  it("refuses petrol or LPG on an electric car, and electric fuel on a petrol car", async () => {
    const petrol = await post({ ...validFuel(electricCar.id), fuelType: "PETROL" });
    assert.equal(petrol.status, 400);

    const electric = await post({ ...validFuel(aliceCar.id), fuelType: "ELECTRIC" });
    assert.equal(electric.status, 400);
  });

  it("refuses a fuel station on an electric car and a charger on a petrol car", async () => {
    const atStation = await post({ ...validFuel(electricCar.id), stationId: fuelStation.id });
    assert.equal(atStation.status, 400);

    const atCharger = await post({ ...validFuel(aliceCar.id), stationId: charger.id });
    assert.equal(atCharger.status, 400);
  });

  it("keeps the same rules when editing an entry", async () => {
    const created = await post({ ...validFuel(electricCar.id), quantity: 20 });
    const edited = await request(app)
      .patch(`/api/fuel/${created.body.id}`)
      .set(auth(aliceToken))
      .send({ ...validFuel(electricCar.id), fuelType: "LPG" });

    assert.equal(edited.status, 400);
  });

  it("creates a custom charger that fuel stations cannot use", async () => {
    const created = await request(app)
      .post("/api/stations")
      .set(auth(aliceToken))
      .send({ name: "Garage wallbox", isCharging: true });

    assert.equal(created.status, 201);
    assert.equal(created.body.isCharging, true);

    const plain = await request(app).post("/api/stations").set(auth(aliceToken)).send({ name: "Plain Oil" });
    assert.equal(plain.body.isCharging, false);
  });
});

describe("fuel validation", () => {
  const post = (body) => request(app).post("/api/fuel").set(auth(aliceToken)).send(body);

  it("creates, edits and deletes an entry", async () => {
    const created = await post({ ...validFuel(aliceCar.id), quantity: "40,5", fuelType: "LPG" });

    assert.equal(created.status, 201);
    assert.equal(created.body.quantity, "40.5");
    assert.equal(created.body.fuelType, "LPG");

    const edited = await request(app)
      .patch(`/api/fuel/${created.body.id}`)
      .set(auth(aliceToken))
      .send({ ...validFuel(aliceCar.id), quantity: 41 });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.quantity, "41");

    const removed = await request(app)
      .delete(`/api/fuel/${created.body.id}`)
      .set(auth(aliceToken));
    assert.equal(removed.status, 204);
  });

  for (const [name, patch, field] of [
    ["an odometer over the limit", { odometerKm: 99999999999 }, "odometerKm"],
    ["exponent notation", { odometerKm: "1e3" }, "odometerKm"],
    ["zero quantity", { quantity: 0 }, "quantity"],
    ["a negative cost", { totalCost: -5 }, "totalCost"],
    ["a text cost", { totalCost: "abc" }, "totalCost"],
    ["an unknown fuel type", { fuelType: "DIESEL" }, "fuelType"],
    ["an impossible date", { entryDate: "2026-02-30" }, "entryDate"],
    ["a future date", { entryDate: "2999-01-01" }, "entryDate"],
  ]) {
    it(`returns a 400 naming the field for ${name}`, async () => {
      const response = await post({ ...validFuel(aliceCar.id), ...patch });

      assert.equal(response.status, 400);
      assert.equal(response.body.code, "VALIDATION");
      assert.ok(response.body.fields[field], JSON.stringify(response.body));
    });
  }

  it("rejects a non-numeric id in the path", async () => {
    const response = await request(app).delete("/api/fuel/abc").set(auth(aliceToken));

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "BAD_ID");
  });

  it("never answers a bad payload with a 500", async () => {
    for (const body of [{}, { entryDate: [] }, { quantity: {} }, { odometerKm: null }]) {
      const response = await post({ carId: aliceCar.id, ...body });

      assert.ok(response.status < 500, `${JSON.stringify(body)} gave ${response.status}`);
    }
  });
});

describe("cars, services, notes and stations validation", () => {
  // The token only exists after the top-level before() hook has run, so it is read lazily.
  const alicesApi = {
    post: (path, body) => request(app).post(path).set(auth(aliceToken)).send(body),
    patch: (path, body) => request(app).patch(path).set(auth(aliceToken)).send(body),
  };

  it("trims a car name and rejects an empty one", async () => {
    const created = await alicesApi.post("/api/cars", { name: "  Golf  " });
    const empty = await alicesApi.post("/api/cars", { name: "   " });

    assert.equal(created.body.name, "Golf");
    assert.equal(empty.status, 400);
  });

  it("rejects a negative or absurd purchase price", async () => {
    const negative = await alicesApi.post("/api/cars", { name: "A", purchasePrice: -1 });
    const huge = await alicesApi.post("/api/cars", { name: "A", purchasePrice: 1e15 });

    assert.equal(negative.status, 400);
    assert.equal(huge.status, 400);
  });

  it("clears an expiry date with null and rejects an impossible one", async () => {
    await alicesApi.patch(`/api/cars/${aliceCar.id}`, { ocValidUntil: "2030-05-01" });
    const cleared = await alicesApi.patch(`/api/cars/${aliceCar.id}`, { ocValidUntil: null });
    const impossible = await alicesApi.patch(`/api/cars/${aliceCar.id}`, {
      ocValidUntil: "2026-13-40",
    });

    assert.equal(cleared.body.ocValidUntil, null);
    assert.equal(impossible.status, 400);
  });

  it("rejects a cover photo that is not the car's own", async () => {
    const response = await alicesApi.patch(`/api/cars/${aliceCar.id}`, { coverPhotoId: 999999 });

    assert.equal(response.status, 400);
  });

  it("saves a service with items and totals them in cents", async () => {
    const response = await alicesApi.post("/api/services", {
      carId: aliceCar.id,
      kind: "REPAIR",
      entryDate: "2026-01-02",
      odometerKm: 5000,
      items: [
        { category: "Hamulce", name: "Klocki", cost: 0.1 },
        { category: "Hamulce", name: "Tarcze", cost: 0.2 },
      ],
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.cost, 0.3);
  });

  it("accepts the electric car categories", async () => {
    const response = await alicesApi.post("/api/services", {
      carId: aliceCar.id,
      kind: "REPAIR",
      entryDate: "2026-01-02",
      odometerKm: 5000,
      items: [{ category: "Bateria trakcyjna", name: "Diagnostyka baterii (SoH)", cost: 250 }],
    });

    assert.equal(response.status, 201);
  });

  it("rejects a service without items or with a negative cost", async () => {
    const base = { carId: aliceCar.id, kind: "REPAIR", entryDate: "2026-01-02", odometerKm: 1 };
    const none = await alicesApi.post("/api/services", { ...base, items: [] });
    const negative = await alicesApi.post("/api/services", {
      ...base,
      items: [{ category: "Hamulce", name: "X", cost: -1 }],
    });

    assert.equal(none.status, 400);
    assert.equal(negative.status, 400);
  });

  it("sets the car's inspection expiry from a new inspection", async () => {
    await alicesApi.post("/api/services", {
      carId: aliceCar.id,
      kind: "INSPECTION",
      entryDate: "2026-01-02",
      nextInspectionDate: "2027-01-02",
      odometerKm: 5000,
      items: [{ category: "Badanie techniczne", name: "Przegląd", cost: 99 }],
    });
    const car = await prisma.car.findUnique({ where: { id: aliceCar.id } });

    assert.equal(car.inspectionValidUntil.toISOString().slice(0, 10), "2027-01-02");
  });

  it("rejects an empty or oversized note", async () => {
    const empty = await alicesApi.post("/api/notes", { carId: aliceCar.id, body: "  " });
    const huge = await alicesApi.post("/api/notes", { carId: aliceCar.id, body: "x".repeat(5001) });

    assert.equal(empty.status, 400);
    assert.equal(huge.status, 400);
  });

  it("refuses a duplicate station name regardless of case", async () => {
    await alicesApi.post("/api/stations", { name: "Dup Station" });
    const again = await alicesApi.post("/api/stations", { name: "dup STATION" });

    assert.equal(again.status, 409);
  });

  it("rejects a file that is not an image", async () => {
    const response = await request(app)
      .post(`/api/cars/${aliceCar.id}/photos`)
      .set(auth(aliceToken))
      .attach("photo", Buffer.from("hello"), { filename: "a.txt", contentType: "text/plain" });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "NOT_AN_IMAGE");
  });

  it("rejects an upload with no file", async () => {
    const response = await request(app)
      .post(`/api/cars/${aliceCar.id}/photos`)
      .set(auth(aliceToken));

    assert.equal(response.status, 400);
  });
});

describe("database constraints", () => {
  // These bypass the API on purpose: they prove the database refuses bad rows by itself.
  const row = (patch) => ({
    userId: alice.id,
    carId: aliceCar.id,
    entryDate: new Date("2026-01-02T00:00:00Z"),
    odometerKm: 1000,
    quantity: 40,
    totalCost: 250,
    ...patch,
  });

  for (const [name, patch] of [
    ["quantity over the limit", { quantity: 5000 }],
    ["zero quantity", { quantity: 0 }],
    ["an odometer over the limit", { odometerKm: 99999999 }],
    ["a negative cost", { totalCost: -1 }],
    ["a cost over the limit", { totalCost: 999999 }],
  ]) {
    it(`rejects ${name}`, async () => {
      await assert.rejects(prisma.fuelEntry.create({ data: row(patch) }));
    });
  }
});

describe("read-only demo account", () => {
  const withDemoReadOnly = async (run) => {
    env.demoReadOnly = true;
    try {
      await run(await login(env.adminEmail, env.adminPassword));
    } finally {
      env.demoReadOnly = false;
    }
  };

  it("lets the admin read but not write when enabled", () =>
    withDemoReadOnly(async (adminToken) => {
      const read = await request(app).get("/api/cars").set(auth(adminToken));
      const write = await request(app).post("/api/cars").set(auth(adminToken)).send({ name: "x" });

      assert.equal(read.status, 200);
      assert.equal(write.status, 403);
      assert.equal(write.body.code, "DEMO_READ_ONLY");
    }));

  it("does not affect other users", () =>
    withDemoReadOnly(async () => {
      const write = await request(app).post("/api/cars").set(auth(aliceToken)).send({ name: "Second" });
      assert.equal(write.status, 201);
    }));
});

describe("rate limiting", () => {
  it("answers 429 after too many login attempts", async () => {
    const statuses = [];

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const response = await request(app)
        .post("/api/login")
        .send({ email: `limit${testEmailDomain}`, password: "x" });
      statuses.push(response.status);
    }

    assert.ok(statuses.includes(429), statuses.join(","));
    assert.equal(statuses[0], 401);
  });
});
