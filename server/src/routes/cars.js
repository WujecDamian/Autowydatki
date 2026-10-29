import { Router } from "express";
import { fromDateString, prisma, toDateString } from "../db.js";
import { requireLogin } from "../passport.js";
import { isBlank, isRealDate } from "../validation.js";

export const carsRouter = Router();

const maximumNameLength = 60;

const dateFields = ["inspectionValidUntil", "ocValidUntil", "acValidUntil"];

const carFields = {
  id: true,
  name: true,
  purchasePrice: true,
  inspectionValidUntil: true,
  ocValidUntil: true,
  acValidUntil: true,
};

const serializeCar = (car) => {
  const serialized = { ...car };

  for (const field of dateFields) {
    serialized[field] = car[field] ? toDateString(car[field]) : null;
  }

  return serialized;
};

const readName = (value) => {
  const name = typeof value === "string" ? value.trim() : "";

  if (!name) {
    return { error: "Podaj nazwę auta." };
  }

  if (name.length > maximumNameLength) {
    return { error: "Nazwa auta jest za długa." };
  }

  return { name };
};

const readPurchasePrice = (value) => {
  if (isBlank(value)) {
    return { purchasePrice: null };
  }

  const purchasePrice = Number(value);

  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return { error: "Cena zakupu musi być równa lub większa od 0." };
  }

  return { purchasePrice };
};

// Only the fields present in the body are changed; a blank date clears it.
const readCarChanges = (body) => {
  const data = {};

  if ("name" in body) {
    const result = readName(body.name);

    if (result.error) {
      return result;
    }

    data.name = result.name;
  }

  if ("purchasePrice" in body) {
    const result = readPurchasePrice(body.purchasePrice);

    if (result.error) {
      return result;
    }

    data.purchasePrice = result.purchasePrice;
  }

  for (const field of dateFields) {
    if (!(field in body)) {
      continue;
    }

    if (isBlank(body[field])) {
      data[field] = null;
    } else if (isRealDate(body[field])) {
      data[field] = fromDateString(body[field]);
    } else {
      return { error: "Podaj prawidłową datę." };
    }
  }

  return { data };
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

    res.json(cars.map(serializeCar));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się pobrać aut." });
  }
});

carsRouter.post("/", requireLogin, async (req, res) => {
  try {
    const name = readName(req.body?.name);

    if (name.error) {
      res.status(400).json({ message: name.error });
      return;
    }

    const price = readPurchasePrice(req.body?.purchasePrice);

    if (price.error) {
      res.status(400).json({ message: price.error });
      return;
    }

    const created = await prisma.car.create({
      data: { userId: req.user.id, name: name.name, purchasePrice: price.purchasePrice },
      select: carFields,
    });

    res.status(201).json(serializeCar(created));
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

    const changes = readCarChanges(req.body ?? {});

    if (changes.error) {
      res.status(400).json({ message: changes.error });
      return;
    }

    const updated = await prisma.car.update({
      where: { id: car.id },
      data: changes.data,
      select: carFields,
    });

    res.json(serializeCar(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się zapisać auta." });
  }
});

carsRouter.delete("/:id", requireLogin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      res.status(400).json({ message: "Nieprawidłowe id." });
      return;
    }

    // Fuel and service entries are removed by the database cascade.
    const result = await prisma.car.deleteMany({ where: { id, userId: req.user.id } });

    if (result.count === 0) {
      res.status(404).json({ message: "Nie znaleziono auta." });
      return;
    }

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się usunąć auta." });
  }
});
