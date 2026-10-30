import { Router } from "express";
import { fromDateString, prisma, toDateString } from "../db.js";
import { requireLogin } from "../passport.js";
import { parseId, serviceSchema } from "../schemas.js";
import { findOwnedCar } from "./cars.js";

export const servicesRouter = Router();

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

servicesRouter.get("/", requireLogin, async (req, res) => {
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
});

servicesRouter.post("/", requireLogin, async (req, res) => {
  const service = serviceSchema.parse(req.body ?? {});

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
});

servicesRouter.patch("/:id", requireLogin, async (req, res) => {
  const id = parseId(req.params.id);

  const service = serviceSchema.parse(req.body ?? {});

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
});

servicesRouter.delete("/:id", requireLogin, async (req, res) => {
  const id = parseId(req.params.id);

  // Items are removed by the cascade on service_items.
  const result = await prisma.serviceEntry.deleteMany({ where: { id, userId: req.user.id } });

  if (result.count === 0) {
    res.status(404).json({ message: "Nie znaleziono serwisu." });
    return;
  }

  res.status(204).end();
});
