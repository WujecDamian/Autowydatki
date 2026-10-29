import { Router } from "express";
import { prisma } from "../db.js";
import { requireLogin } from "../passport.js";

export const stationsRouter = Router();

const maximumNameLength = 40;

const stationFields = { id: true, name: true, userId: true };

const serializeStation = (station) => ({
  id: station.id,
  name: station.name,
  isCustom: station.userId !== null,
});

// Built-in brands (no owner) and the user's own stations are both usable.
const usableBy = (userId) => ({ OR: [{ userId: null }, { userId }] });

export const findUsableStation = async (userId, rawStationId) => {
  const stationId = Number(rawStationId);

  if (!Number.isInteger(stationId)) {
    return null;
  }

  return prisma.fuelStation.findFirst({
    where: { id: stationId, ...usableBy(userId) },
    select: { id: true },
  });
};

stationsRouter.get("/", requireLogin, async (req, res) => {
  try {
    const stations = await prisma.fuelStation.findMany({
      where: usableBy(req.user.id),
      select: stationFields,
      orderBy: [{ userId: { sort: "asc", nulls: "first" } }, { name: "asc" }],
    });

    res.json(stations.map(serializeStation));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się pobrać stacji." });
  }
});

stationsRouter.post("/", requireLogin, async (req, res) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!name) {
      res.status(400).json({ message: "Podaj nazwę stacji." });
      return;
    }

    if (name.length > maximumNameLength) {
      res.status(400).json({ message: "Nazwa stacji jest za długa." });
      return;
    }

    const existing = await prisma.fuelStation.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, ...usableBy(req.user.id) },
      select: { id: true },
    });

    if (existing) {
      res.status(409).json({ message: "Taka stacja już jest na liście." });
      return;
    }

    const created = await prisma.fuelStation.create({
      data: { userId: req.user.id, name },
      select: stationFields,
    });

    res.status(201).json(serializeStation(created));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się dodać stacji." });
  }
});

stationsRouter.delete("/:id", requireLogin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      res.status(400).json({ message: "Nieprawidłowe id." });
      return;
    }

    // Built-in brands have no owner, so they can never match here.
    const result = await prisma.fuelStation.deleteMany({ where: { id, userId: req.user.id } });

    if (result.count === 0) {
      res.status(404).json({ message: "Nie znaleziono stacji." });
      return;
    }

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się usunąć stacji." });
  }
});
