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
  quantity: true,
  totalCost: true,
  fuelType: true,
  station: { select: { id: true, name: true } },
};

const allowedFuelTypes = { PETROL: ["PETROL", "LPG"], ELECTRIC: ["ELECTRIC"] };

// Checks the entry fits the car (fuel type, fuel station or charger) and returns the fields to save.
const resolveFuel = async (userId, powertrain, fuel) => {
  const fuelType = fuel.fuelType ?? allowedFuelTypes[powertrain][0];

  if (!allowedFuelTypes[powertrain].includes(fuelType)) {
    return { error: { message: "Ten rodzaj paliwa nie pasuje do napędu auta.", code: "VALIDATION" } };
  }

  let stationId = null;

  if (fuel.stationId) {
    const station = await findUsableStation(userId, fuel.stationId);

    if (!station) {
      return { error: { message: "Nie znaleziono stacji.", code: "NOT_FOUND" } };
    }

    if (station.isCharging !== (powertrain === "ELECTRIC")) {
      return { error: { message: "Ta stacja nie pasuje do napędu auta.", code: "VALIDATION" } };
    }

    stationId = station.id;
  }

  return {
    data: {
      entryDate: fromDateString(fuel.entryDate),
      odometerKm: fuel.odometerKm,
      quantity: fuel.quantity,
      totalCost: fuel.totalCost,
      fuelType,
      stationId,
    },
  };
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

  const resolved = await resolveFuel(req.user.id, car.powertrain, fuel);

  if (resolved.error) {
    res.status(400).json(resolved.error);
    return;
  }

  const created = await prisma.fuelEntry.create({
    data: { userId: req.user.id, carId: car.id, ...resolved.data },
    select: fuelFields,
  });

  res.status(201).json(serializeFuelEntry(created));
});

fuelRouter.patch("/:id", requireLogin, async (req, res) => {
  const id = parseId(req.params.id);

  const fuel = fuelSchema.parse(req.body ?? {});

  const existing = await prisma.fuelEntry.findFirst({
    where: { id, userId: req.user.id },
    select: { id: true, car: { select: { powertrain: true } } },
  });

  if (!existing) {
    res.status(404).json({ message: "Nie znaleziono tankowania." });
    return;
  }

  const resolved = await resolveFuel(req.user.id, existing.car.powertrain, fuel);

  if (resolved.error) {
    res.status(400).json(resolved.error);
    return;
  }

  const updated = await prisma.fuelEntry.update({
    where: { id: existing.id },
    data: resolved.data,
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
