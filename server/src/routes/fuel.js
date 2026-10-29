import { Router } from "express";
import { fromDateString, prisma, toDateString } from "../db.js";
import { requireLogin } from "../passport.js";
import { isBlank, isRealDate } from "../validation.js";
import { findOwnedCar } from "./cars.js";
import { findUsableStation } from "./stations.js";

export const fuelRouter = Router();

const fuelFields = {
  id: true,
  entryDate: true,
  odometerKm: true,
  liters: true,
  totalCost: true,
  station: { select: { id: true, name: true } },
};

const serializeFuelEntry = (entry) => ({ ...entry, entryDate: toDateString(entry.entryDate) });

const readFuelBody = (body) => {
  if (!isRealDate(body.entryDate)) {
    return { error: "Podaj prawidłową datę." };
  }

  const odometerKm = Number(body.odometerKm);
  if (isBlank(body.odometerKm) || !Number.isInteger(odometerKm) || odometerKm < 0) {
    return { error: "Przebieg musi być liczbą całkowitą równą lub większą od 0." };
  }

  const liters = Number(body.liters);
  if (isBlank(body.liters) || !Number.isFinite(liters) || liters <= 0) {
    return { error: "Litry muszą być większe od 0." };
  }

  const totalCost = Number(body.totalCost);
  if (isBlank(body.totalCost) || !Number.isFinite(totalCost) || totalCost < 0) {
    return { error: "Koszt musi być równy lub większy od 0." };
  }

  return {
    entryDate: body.entryDate,
    odometerKm,
    liters,
    totalCost,
  };
};

fuelRouter.get("/", requireLogin, async (req, res) => {
  try {
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się pobrać tankowań." });
  }
});

fuelRouter.post("/", requireLogin, async (req, res) => {
  try {
    const fuel = readFuelBody(req.body ?? {});

    if (fuel.error) {
      res.status(400).json({ message: fuel.error });
      return;
    }

    const car = await findOwnedCar(req.user.id, req.body?.carId);

    if (!car) {
      res.status(404).json({ message: "Nie znaleziono auta." });
      return;
    }

    let stationId = null;

    if (!isBlank(req.body?.stationId)) {
      const station = await findUsableStation(req.user.id, req.body.stationId);

      if (!station) {
        res.status(400).json({ message: "Nie znaleziono stacji." });
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
        stationId,
      },
      select: fuelFields,
    });

    res.status(201).json(serializeFuelEntry(created));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się zapisać tankowania." });
  }
});

fuelRouter.delete("/:id", requireLogin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      res.status(400).json({ message: "Nieprawidłowe id." });
      return;
    }

    const result = await prisma.fuelEntry.deleteMany({ where: { id, userId: req.user.id } });

    if (result.count === 0) {
      res.status(404).json({ message: "Nie znaleziono tankowania." });
      return;
    }

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się usunąć tankowania." });
  }
});
