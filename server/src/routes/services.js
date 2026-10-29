import { Router } from "express";
import { fromDateString, prisma, toDateString } from "../db.js";
import { requireLogin } from "../passport.js";
import { serviceCategories } from "../serviceCategories.js";
import { isBlank, isRealDate } from "../validation.js";
import { findOwnedCar } from "./cars.js";

export const servicesRouter = Router();

const serviceKinds = ["REPAIR", "INSPECTION"];
const maximumItems = 50;
const maximumTitleLength = 80;
const maximumItemNameLength = 80;
// DECIMAL(10, 2) holds at most 99 999 999.99.
const maximumCost = 99999999.99;

const serviceFields = {
  id: true,
  kind: true,
  entryDate: true,
  odometerKm: true,
  title: true,
  items: {
    select: { id: true, category: true, name: true, cost: true },
    orderBy: { id: "asc" },
  },
};

const serializeServiceEntry = (entry) => {
  const cents = entry.items.reduce((sum, item) => sum + Math.round(Number(item.cost) * 100), 0);

  return { ...entry, entryDate: toDateString(entry.entryDate), cost: cents / 100 };
};

const readItem = (item) => {
  const category = typeof item?.category === "string" ? item.category : "";
  const name = typeof item?.name === "string" ? item.name.trim() : "";
  const cost = Number(item?.cost);

  if (!serviceCategories.includes(category)) {
    return { error: "Nieznana kategoria pozycji." };
  }

  if (!name) {
    return { error: "Każda pozycja musi mieć nazwę." };
  }

  if (name.length > maximumItemNameLength) {
    return { error: "Nazwa pozycji jest za długa." };
  }

  if (isBlank(item?.cost) || !Number.isFinite(cost) || cost < 0 || cost > maximumCost) {
    return { error: `Podaj prawidłową cenę dla „${name}”.` };
  }

  return { category, name, cost };
};

const readServiceBody = (body) => {
  const kind = serviceKinds.includes(body.kind) ? body.kind : null;
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!kind) {
    return { error: "Wybierz rodzaj wpisu." };
  }

  if (title.length > maximumTitleLength) {
    return { error: "Tytuł jest za długi." };
  }

  if (!isRealDate(body.entryDate)) {
    return { error: "Podaj prawidłową datę." };
  }

  const odometerKm = Number(body.odometerKm);
  if (isBlank(body.odometerKm) || !Number.isInteger(odometerKm) || odometerKm < 0) {
    return { error: "Przebieg musi być liczbą całkowitą równą lub większą od 0." };
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return { error: "Zaznacz przynajmniej jedną pozycję." };
  }

  if (body.items.length > maximumItems) {
    return { error: `Wpis może mieć najwyżej ${maximumItems} pozycji.` };
  }

  let nextInspectionDate = null;

  if (kind === "INSPECTION" && !isBlank(body.nextInspectionDate)) {
    if (!isRealDate(body.nextInspectionDate) || body.nextInspectionDate <= body.entryDate) {
      return { error: "Data ważności badania musi być późniejsza niż data badania." };
    }

    nextInspectionDate = body.nextInspectionDate;
  }

  const items = [];

  for (const rawItem of body.items) {
    const item = readItem(rawItem);

    if (item.error) {
      return { error: item.error };
    }

    items.push(item);
  }

  return {
    kind,
    title: title || null,
    entryDate: body.entryDate,
    odometerKm,
    items,
    nextInspectionDate,
  };
};

// A new inspection date on the entry also becomes the car's inspection expiry.
const inspectionUpdate = (carId, service) =>
  service.nextInspectionDate
    ? [
        prisma.car.update({
          where: { id: carId },
          data: { inspectionValidUntil: fromDateString(service.nextInspectionDate) },
        }),
      ]
    : [];

const readEntryId = (rawId) => {
  const id = Number(rawId);
  return Number.isInteger(id) ? id : null;
};

servicesRouter.get("/", requireLogin, async (req, res) => {
  try {
    const car = await findOwnedCar(req.user.id, req.query.carId);

    if (!car) {
      res.status(404).json({ message: "Nie znaleziono auta." });
      return;
    }

    const entries = await prisma.serviceEntry.findMany({
      where: { userId: req.user.id, carId: car.id },
      select: serviceFields,
      orderBy: [{ entryDate: "desc" }, { id: "desc" }],
    });

    res.json(entries.map(serializeServiceEntry));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się pobrać serwisów." });
  }
});

servicesRouter.post("/", requireLogin, async (req, res) => {
  try {
    const service = readServiceBody(req.body ?? {});

    if (service.error) {
      res.status(400).json({ message: service.error });
      return;
    }

    const car = await findOwnedCar(req.user.id, req.body?.carId);

    if (!car) {
      res.status(404).json({ message: "Nie znaleziono auta." });
      return;
    }

    // The nested create writes the entry and its items; the car update joins the same transaction.
    const [created] = await prisma.$transaction([
      prisma.serviceEntry.create({
        data: {
          userId: req.user.id,
          carId: car.id,
          kind: service.kind,
          entryDate: fromDateString(service.entryDate),
          odometerKm: service.odometerKm,
          title: service.title,
          items: { create: service.items },
        },
        select: serviceFields,
      }),
      ...inspectionUpdate(car.id, service),
    ]);

    res.status(201).json(serializeServiceEntry(created));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się zapisać serwisu." });
  }
});

servicesRouter.patch("/:id", requireLogin, async (req, res) => {
  try {
    const id = readEntryId(req.params.id);

    if (id === null) {
      res.status(400).json({ message: "Nieprawidłowe id." });
      return;
    }

    const service = readServiceBody(req.body ?? {});

    if (service.error) {
      res.status(400).json({ message: service.error });
      return;
    }

    const existing = await prisma.serviceEntry.findFirst({
      where: { id, userId: req.user.id },
      select: { id: true, carId: true },
    });

    if (!existing) {
      res.status(404).json({ message: "Nie znaleziono serwisu." });
      return;
    }

    // The item list is replaced as a whole, in the same transaction as the entry.
    const [updated] = await prisma.$transaction([
      prisma.serviceEntry.update({
        where: { id: existing.id },
        data: {
          kind: service.kind,
          entryDate: fromDateString(service.entryDate),
          odometerKm: service.odometerKm,
          title: service.title,
          items: { deleteMany: {}, create: service.items },
        },
        select: serviceFields,
      }),
      ...inspectionUpdate(existing.carId, service),
    ]);

    res.json(serializeServiceEntry(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się zapisać serwisu." });
  }
});

servicesRouter.delete("/:id", requireLogin, async (req, res) => {
  try {
    const id = readEntryId(req.params.id);

    if (id === null) {
      res.status(400).json({ message: "Nieprawidłowe id." });
      return;
    }

    // Items are removed by the cascade on service_items.
    const result = await prisma.serviceEntry.deleteMany({ where: { id, userId: req.user.id } });

    if (result.count === 0) {
      res.status(404).json({ message: "Nie znaleziono serwisu." });
      return;
    }

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się usunąć serwisu." });
  }
});
