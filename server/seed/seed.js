// Recreates the demo (admin) account's data from seed/cars.json and seed/photos/*.
//
//   npm run db:seed          asks for confirmation
//   npm run db:seed -- --yes  skips the question
//
// It uses DATABASE_URL and SUPABASE_* from server/.env, so check which database you are pointing at.
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ensureAdminUser, fromDateString, prisma } from "../src/db.js";
import { env } from "../src/env.js";
import { removeFiles, saveFile, thumbnailPath } from "../src/storage.js";

const seedDir = path.dirname(fileURLToPath(import.meta.url));
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// A fixed seed keeps the generated data identical between runs.
const createRandom = (seed) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const random = createRandom(20261031);
const between = (min, max) => min + random() * (max - min);
const integerBetween = (min, max) => Math.round(between(min, max));
const money = (value) => Math.round(value * 100) / 100;
const pick = (list) => list[Math.floor(random() * list.length)];

const shuffled = (list) => {
  const copy = [...list];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }

  return copy;
};

const dateOnly = (date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
const dateString = (date) => date.toISOString().slice(0, 10);
const optionalDate = (value) => (value ? fromDateString(value) : null);

const confirm = async () => {
  if (process.argv.includes("--yes")) {
    return true;
  }

  const host = new URL(env.databaseUrl).host;
  const storage = process.env.SUPABASE_URL ? `Supabase Storage (${process.env.SUPABASE_URL})` : "local server/uploads";

  console.log(`Database: ${host}`);
  console.log(`Photos:   ${storage}`);
  console.log(`User:     ${env.adminEmail}`);
  console.log("This DELETES all cars, fuel, services, notes and photos of that user and recreates them.");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("Continue? (y/N) ");
  rl.close();

  return answer.trim().toLowerCase() === "y";
};

const wipe = async (userId) => {
  const photos = await prisma.carPhoto.findMany({ where: { userId }, select: { storagePath: true } });
  const files = photos.flatMap((photo) => [photo.storagePath, thumbnailPath(photo.storagePath)]);

  for (let index = 0; index < files.length; index += 100) {
    await removeFiles(files.slice(index, index + 100));
  }

  // Fuel entries, services (and their items), notes and photos go with the cars (ON DELETE CASCADE).
  await prisma.car.deleteMany({ where: { userId } });
  console.log(`Removed the old cars and ${photos.length} photos.`);
};

const uploadPhotos = async (userId, carId, folder) => {
  const directory = path.resolve(seedDir, folder);
  let names;

  try {
    names = (await readdir(directory))
      .filter((name) => imageExtensions.has(path.extname(name).toLowerCase()))
      .sort();
  } catch {
    console.warn(`  No photo folder: ${folder}`);
    return 0;
  }

  if (names.length === 0) {
    console.warn(`  No photos in ${folder}`);
    return 0;
  }

  let coverPhotoId = null;

  for (const name of names) {
    // Same processing as POST /cars/:id/photos.
    const image = sharp(await readFile(path.join(directory, name))).rotate();
    const full = await image
      .clone()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const thumbnail = await image
      .clone()
      .resize({ width: 400, height: 400, fit: "cover" })
      .webp({ quality: 75 })
      .toBuffer();

    const storagePath = `${userId}/${carId}/${randomUUID()}.webp`;
    await saveFile(storagePath, full, "image/webp");
    await saveFile(thumbnailPath(storagePath), thumbnail, "image/webp");

    const photo = await prisma.carPhoto.create({
      data: { carId, userId, storagePath },
      select: { id: true },
    });
    coverPhotoId ??= photo.id;
  }

  await prisma.car.update({ where: { id: carId }, data: { coverPhotoId } });
  return names.length;
};

// Rough consumption per 100 km and price per unit, to make the generated fuel entries plausible.
const profileFor = (car) => {
  const premium = Number(car.purchasePrice) > 80000;

  if (car.powertrain === "ELECTRIC") {
    return { consumption: 21, quantity: [35, 75], fuels: [{ type: "ELECTRIC", price: [2.2, 2.4] }] };
  }

  const petrol = {
    type: "PETROL",
    price: [6.35, 6.55],
    consumption: premium ? 12.5 : 6.5,
    quantity: premium ? [42, 62] : [26, 38],
  };

  if (car.hasLpg) {
    return {
      fuels: [petrol, { type: "LPG", price: [3.2, 3.4], consumption: 8.7, quantity: [24, 34] }],
    };
  }

  return { fuels: [petrol] };
};

const startingOdometer = (price) => {
  if (price < 50000) return integerBetween(90000, 140000);
  if (price < 150000) return integerBetween(50000, 90000);
  return integerBetween(10000, 40000);
};

const createFuelEntries = async (userId, car, carId, count, from, to, stations) => {
  const profile = profileFor(car);
  const electric = car.powertrain === "ELECTRIC";
  const usable = stations.filter((station) => station.isCharging === electric);
  const span = to.getTime() - from.getTime();

  let odometer = startingOdometer(Number(car.purchasePrice));
  const dual = profile.fuels.length > 1;
  const entries = [];
  // The app measures each fuel against the distance since the previous fill of the same fuel,
  // so a dual-fuel car alternates strictly and each quantity covers two legs.
  const legs = dual ? 2 : 1;
  const history = [];

  for (let index = 0; index < count; index += 1) {
    const fuel = dual ? profile.fuels[index % profile.fuels.length] : profile.fuels[0];
    const consumption = fuel.consumption ?? profile.consumption;
    const position = (index + 0.5 + between(-0.35, 0.35)) / count;
    // Prices drift up slowly over the year, with only a cent or two of noise between fill-ups.
    const price = fuel.price[0] + (fuel.price[1] - fuel.price[0]) * position + between(-0.015, 0.015);

    let quantity;

    if (dual) {
      const leg = integerBetween(140, 185);
      odometer += leg;
      history.push(odometer);
      const previous = history[index - legs] ?? odometer - leg * legs;
      quantity = money(((odometer - previous) * consumption) / 100 * between(0.97, 1.03));
    } else {
      quantity = money(between(...(fuel.quantity ?? profile.quantity)));
      odometer += Math.round(((quantity / consumption) * 100) * between(0.95, 1.05));
    }

    const date = dateOnly(new Date(from.getTime() + span * position));

    entries.push({
      userId,
      carId,
      entryDate: date,
      odometerKm: odometer,
      quantity,
      totalCost: money(quantity * price),
      stationId: pick(usable).id,
      fuelType: fuel.type,
    });
  }

  await prisma.fuelEntry.createMany({ data: entries });
  return entries;
};

const petrolServices = [
  { title: "Serwis olejowy", items: [["Oleje, płyny i filtry", "Wymiana oleju silnikowego", 180, 480], ["Oleje, płyny i filtry", "Filtr oleju", 30, 90], ["Oleje, płyny i filtry", "Filtr powietrza", 40, 120]] },
  { title: "Hamulce przód", items: [["Hamulce", "Klocki przód", 200, 600], ["Hamulce", "Tarcze przód", 350, 1100]] },
  { title: "Wymiana opon", items: [["Opony i koła", "Sezonowa wymiana opon", 100, 180], ["Opony i koła", "Wyważanie kół", 60, 120]] },
  { title: "Klimatyzacja", items: [["Klimatyzacja", "Serwis klimatyzacji", 180, 350], ["Oleje, płyny i filtry", "Filtr kabinowy", 40, 100]] },
  { title: "Płyny", items: [["Hamulce", "Płyn hamulcowy", 90, 180], ["Oleje, płyny i filtry", "Płyn chłodniczy", 100, 220]] },
  { title: "Diagnostyka", items: [["Elektryka", "Diagnostyka komputerowa", 120, 250], ["Elektryka", "Żarówki", 30, 150]] },
  { title: "Zawieszenie", items: [["Zawieszenie i układ kierowniczy", "Łączniki stabilizatora", 120, 300], ["Zawieszenie i układ kierowniczy", "Geometria kół", 150, 280]] },
  { title: "Akumulator", items: [["Elektryka", "Akumulator", 350, 800]] },
  { title: "Świece zapłonowe", items: [["Silnik", "Świece zapłonowe", 200, 700]] },
  { title: "Wycieraczki", items: [["Nadwozie i szyby", "Wycieraczki", 60, 180]] },
];

const electricServices = [
  { title: "Wymiana opon", items: [["Opony i koła", "Sezonowa wymiana opon", 150, 280], ["Opony i koła", "Wyważanie kół", 80, 160]] },
  { title: "Filtry i płyny", items: [["Filtry i płyny", "Filtr kabinowy", 120, 350], ["Filtry i płyny", "Płyn do spryskiwaczy", 20, 60]] },
  { title: "Hamulce", items: [["Hamulce", "Płyn hamulcowy", 150, 350], ["Hamulce", "Klocki przód", 500, 1400]] },
  { title: "Diagnostyka baterii", items: [["Bateria trakcyjna", "Diagnostyka baterii (SoH)", 250, 600]] },
  { title: "Klimatyzacja", items: [["Klimatyzacja", "Serwis klimatyzacji", 300, 650], ["Klimatyzacja", "Odgrzybianie", 100, 250]] },
  { title: "Geometria", items: [["Zawieszenie i układ kierowniczy", "Geometria kół", 250, 500]] },
  { title: "Oprogramowanie", items: [["Elektryka", "Aktualizacja oprogramowania", 0, 350], ["Elektryka", "Diagnostyka komputerowa", 200, 500]] },
  { title: "Wycieraczki", items: [["Nadwozie i szyby", "Wycieraczki", 120, 320]] },
  { title: "Akumulator 12 V", items: [["Elektryka", "Akumulator 12 V", 500, 1200]] },
  { title: "Olej w reduktorze", items: [["Napęd elektryczny", "Olej w reduktorze", 400, 900]] },
];

const createServices = async (userId, car, carId, count, from, to, fuelEntries) => {
  const pool = shuffled(car.powertrain === "ELECTRIC" ? electricServices : petrolServices);
  const span = to.getTime() - from.getTime();
  const inspectionIndex = Math.floor(count / 2);

  for (let index = 0; index < count; index += 1) {
    const position = (index + 0.5 + between(-0.25, 0.25)) / count;
    const date = dateOnly(new Date(from.getTime() + span * position));
    const dateText = dateString(date);

    // The odometer of the fuel entry closest in time (entries are sorted by date).
    const reference = fuelEntries.findLast((entry) => dateString(entry.entryDate) <= dateText) ?? fuelEntries[0];
    const odometerKm = reference.odometerKm + integerBetween(0, 150);

    const inspection = index === inspectionIndex;
    const template = pool[index % pool.length];

    const items = inspection
      ? [{ category: "Badanie techniczne", name: "Opłata za badanie", cost: 98.4 }]
      : template.items.map(([category, name, min, max]) => ({
          category,
          name,
          cost: money(between(min, max)),
        }));

    await prisma.serviceEntry.create({
      data: {
        userId,
        carId,
        kind: inspection ? "INSPECTION" : "REPAIR",
        entryDate: date,
        odometerKm,
        title: inspection ? "Badanie techniczne" : template.title,
        items: { create: items },
      },
    });
  }
};

const genericNotes = [
  "Ciśnienie w oponach: 2,3 bar przód, 2,2 bar tył",
  "Zapasowy kluczyk w szufladzie w domu",
  "Przed dłuższą trasą sprawdzić poziom płynów i ciśnienie w oponach",
  "OC odnawiać online, porównać oferty miesiąc przed końcem",
  "Zapisać się na przegląd z wyprzedzeniem, w grudniu jest kolejka",
  "Płyn do spryskiwaczy zimowy kupić przed pierwszymi mrozami",
  "Zrobić zdjęcia stanu auta przed sprzedażą",
  "Sprawdzić gwarancję na ostatnią naprawę",
];

const electricNotes = [
  "Ładowarka domowa 11 kW, najtańsza taryfa nocna G12",
  "Na trasie ładować do 80%, powyżej ładowanie mocno zwalnia",
  "Karta do ładowarek publicznych w schowku w drzwiach",
];

const createNotes = async (userId, car, carId, count, fakeNotes) => {
  const own = car.notes ?? [];
  const pool = fakeNotes
    ? shuffled([...(car.powertrain === "ELECTRIC" ? electricNotes : []), ...genericNotes]).slice(0, count)
    : [];
  const bodies = [...own, ...pool];
  const now = Date.now();

  for (const [index, body] of bodies.entries()) {
    const createdAt = new Date(now - (bodies.length - index) * between(2, 9) * 24 * 60 * 60 * 1000);

    await prisma.note.create({
      data: { userId, carId, body, pinned: index === 0 && own.length > 0, createdAt },
    });
  }

  return bodies.length;
};

const main = async () => {
  const config = JSON.parse(await readFile(path.join(seedDir, "cars.json"), "utf8"));
  const history = config.history ?? {};

  if (!(await confirm())) {
    console.log("Cancelled.");
    return;
  }

  await ensureAdminUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: env.adminEmail },
    select: { id: true },
  });

  await wipe(user.id);

  const stations = await prisma.fuelStation.findMany({
    where: { userId: null },
    select: { id: true, isCharging: true },
  });

  if (!stations.some((s) => s.isCharging) || !stations.some((s) => !s.isCharging)) {
    throw new Error("Built-in fuel stations are missing; run the migrations first.");
  }

  const to = dateOnly(new Date());
  to.setUTCDate(to.getUTCDate() - 1);
  const from = fromDateString(history.startDate ?? dateString(new Date(to.getTime() - 365 * 86400000)));

  for (const car of config.cars) {
    const created = await prisma.car.create({
      data: {
        userId: user.id,
        name: car.name,
        purchasePrice: car.purchasePrice ?? null,
        inspectionValidUntil: optionalDate(car.inspectionValidUntil),
        ocValidUntil: optionalDate(car.ocValidUntil),
        acValidUntil: optionalDate(car.acValidUntil),
        powertrain: car.powertrain,
        hasLpg: car.powertrain === "ELECTRIC" ? false : Boolean(car.hasLpg),
      },
      select: { id: true },
    });

    console.log(`Created ${car.name}`);

    const photos = await uploadPhotos(user.id, created.id, car.photosFolder);
    let fuel = 0;
    let services = 0;

    if (history.generateFakeFuelAndServices) {
      fuel = history.fuelEntriesPerCar ?? 12;
      services = history.servicesPerCar ?? 3;
      const entries = await createFuelEntries(user.id, car, created.id, fuel, from, to, stations);
      await createServices(user.id, car, created.id, services, from, to, entries);
    }

    const notes = await createNotes(
      user.id,
      car,
      created.id,
      history.notesPerCar ?? 0,
      Boolean(history.generateFakeNotes),
    );

    console.log(`  ${photos} photos, ${fuel} fuel entries, ${services} services, ${notes} notes`);
  }
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
