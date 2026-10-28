import { Router } from "express";
import { fromDateString, prisma, toDateString } from "../db.js";
import { requireLogin } from "../passport.js";
import { findOwnedCar } from "./cars.js";

export const servicesRouter = Router();

const isRealDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const serviceFields = {
  id: true,
  entryDate: true,
  odometerKm: true,
  title: true,
  cost: true,
};

const serializeServiceEntry = (entry) => ({ ...entry, entryDate: toDateString(entry.entryDate) });

const isBlank = (value) => value === undefined || value === null || value === "";

const readServiceBody = (body) => {
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!title) {
    return { error: "Podaj nazwę serwisu." };
  }

  if (!isRealDate(body.entryDate)) {
    return { error: "Podaj prawidłową datę." };
  }

  const odometerKm = Number(body.odometerKm);
  if (isBlank(body.odometerKm) || !Number.isInteger(odometerKm) || odometerKm < 0) {
    return { error: "Przebieg musi być liczbą całkowitą równą lub większą od 0." };
  }

  const cost = Number(body.cost);
  if (isBlank(body.cost) || !Number.isFinite(cost) || cost < 0) {
    return { error: "Koszt musi być równy lub większy od 0." };
  }

  return {
    title,
    entryDate: body.entryDate,
    odometerKm,
    cost,
  };
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

    const created = await prisma.serviceEntry.create({
      data: {
        userId: req.user.id,
        carId: car.id,
        entryDate: fromDateString(service.entryDate),
        odometerKm: service.odometerKm,
        title: service.title,
        cost: service.cost,
      },
      select: serviceFields,
    });

    res.status(201).json(serializeServiceEntry(created));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się zapisać serwisu." });
  }
});

servicesRouter.delete("/:id", requireLogin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      res.status(400).json({ message: "Nieprawidłowe id." });
      return;
    }

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
