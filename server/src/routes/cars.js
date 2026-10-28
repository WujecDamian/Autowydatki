import { Router } from "express";
import { prisma } from "../db.js";
import { requireLogin } from "../passport.js";

export const carsRouter = Router();

const maximumNameLength = 60;

const carFields = { id: true, name: true, purchasePrice: true };

const readPurchasePrice = (value) => {
  if (value === undefined || value === null || value === "") {
    return { purchasePrice: null };
  }

  const purchasePrice = Number(value);

  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return { error: "Cena zakupu musi być równa lub większa od 0." };
  }

  return { purchasePrice };
};

export const findOwnedCar = async (userId, rawCarId) => {
  const carId = Number(rawCarId);

  if (!Number.isInteger(carId)) {
    return null;
  }

  return prisma.car.findFirst({ where: { id: carId, userId }, select: { id: true, name: true } });
};

carsRouter.get("/", requireLogin, async (req, res) => {
  try {
    const cars = await prisma.car.findMany({
      where: { userId: req.user.id },
      select: carFields,
      orderBy: { id: "asc" },
    });

    res.json(cars);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się pobrać aut." });
  }
});

carsRouter.post("/", requireLogin, async (req, res) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!name) {
      res.status(400).json({ message: "Podaj nazwę auta." });
      return;
    }

    if (name.length > maximumNameLength) {
      res.status(400).json({ message: "Nazwa auta jest za długa." });
      return;
    }

    const price = readPurchasePrice(req.body?.purchasePrice);

    if (price.error) {
      res.status(400).json({ message: price.error });
      return;
    }

    const created = await prisma.car.create({
      data: { userId: req.user.id, name, purchasePrice: price.purchasePrice },
      select: carFields,
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się dodać auta." });
  }
});

carsRouter.patch("/:id", requireLogin, async (req, res) => {
  try {
    const car = await findOwnedCar(req.user.id, req.params.id);

    if (!car) {
      res.status(404).json({ message: "Nie znaleziono auta." });
      return;
    }

    const price = readPurchasePrice(req.body?.purchasePrice);

    if (price.error) {
      res.status(400).json({ message: price.error });
      return;
    }

    const updated = await prisma.car.update({
      where: { id: car.id },
      data: { purchasePrice: price.purchasePrice },
      select: carFields,
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się zapisać ceny zakupu." });
  }
});
