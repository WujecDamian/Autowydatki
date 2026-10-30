import { Router } from "express";
import { fromDateString, prisma, toDateString } from "../db.js";
import { requireLogin } from "../passport.js";
import { fuelSchema, parseId } from "../schemas.js";
import { findOwnedCar } from "./cars.js";
import { findUsableStation } from "./stations.js";

export const fuelRouter = Router();

const fuelFields = {
  id: true,
  entryDate: true,
  odometerKm: true,
  liters: true,
  totalCost: true,
  fuelType: true,
  station: { select: { id: true, name: true } },
};

const serializeFuelEntry = (entry) => ({ ...entry, entryDate: toDateString(entry.entryDate) });

fuelRouter.get("/", requireLogin, async (req, res) => {
  const car = await findOwnedCar(req.user.id, req.query.carId);

  if (!car) {
    res.status(404).json({ message: "Nie znaleziono auta." });
    return;
  }

  const entries = await prisma.fuelEntry.findMany({
    where: { userId: req.user.id, carId: car.id },
    select: fuelFields,
    orderBy: [{ entryDate: "desc" }, { id: "desc" }],
  });

  res.json(entries.map(serializeFuelEntry));
});

fuelRouter.post("/", requireLogin, async (req, res) => {
  const fuel = fuelSchema.parse(req.body ?? {});

  const car = await findOwnedCar(req.user.id, req.body?.carId);

  if (!car) {
    res.status(404).json({ message: "Nie znaleziono auta." });
    return;
  }

  let stationId = null;

  if (fuel.stationId) {
    const station = await findUsableStation(req.user.id, fuel.stationId);

    if (!station) {
      res.status(400).json({ message: "Nie znaleziono stacji.", code: "NOT_FOUND" });
      return;
    }

    stationId = station.id;
  }

  const created = await prisma.fuelEntry.create({
    data: {
      userId: req.user.id,
      carId: car.id,
      entryDate: fromDateString(fuel.entryDate),
      odometerKm: fuel.odometerKm,
      liters: fuel.liters,
      totalCost: fuel.totalCost,
      fuelType: fuel.fuelType,
      stationId,
    },
    select: fuelFields,
  });

  res.status(201).json(serializeFuelEntry(created));
});

fuelRouter.patch("/:id", requireLogin, async (req, res) => {
  const id = parseId(req.params.id);

  const fuel = fuelSchema.parse(req.body ?? {});

  const existing = await prisma.fuelEntry.findFirst({
    where: { id, userId: req.user.id },
    select: { id: true },
  });

  if (!existing) {
    res.status(404).json({ message: "Nie znaleziono tankowania." });
    return;
  }

  let stationId = null;

  if (fuel.stationId) {
    const station = await findUsableStation(req.user.id, fuel.stationId);

    if (!station) {
      res.status(400).json({ message: "Nie znaleziono stacji.", code: "NOT_FOUND" });
      return;
    }

    stationId = station.id;
  }

  const updated = await prisma.fuelEntry.update({
    where: { id: existing.id },
    data: {
      entryDate: fromDateString(fuel.entryDate),
      odometerKm: fuel.odometerKm,
      liters: fuel.liters,
      totalCost: fuel.totalCost,
      fuelType: fuel.fuelType,
      stationId,
    },
    select: fuelFields,
  });

  res.json(serializeFuelEntry(updated));
});

fuelRouter.delete("/:id", requireLogin, async (req, res) => {
  const id = parseId(req.params.id);

  const result = await prisma.fuelEntry.deleteMany({ where: { id, userId: req.user.id } });

  if (result.count === 0) {
    res.status(404).json({ message: "Nie znaleziono tankowania." });
    return;
  }

  res.status(204).end();
});
