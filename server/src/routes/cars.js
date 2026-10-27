import { Router } from "express";
import { pool } from "../db.js";
import { requireLogin } from "../passport.js";

export const carsRouter = Router();

const maximumNameLength = 60;

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

  const result = await pool.query("SELECT id, name FROM cars WHERE id = $1 AND user_id = $2", [
    carId,
    userId,
  ]);

  return result.rows[0] ?? null;
};

carsRouter.get("/", requireLogin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, purchase_price AS "purchasePrice"
       FROM cars
       WHERE user_id = $1
       ORDER BY id`,
      [req.user.id],
    );

    res.json(result.rows);
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

    const result = await pool.query(
      `INSERT INTO cars (user_id, name, purchase_price)
       VALUES ($1, $2, $3)
       RETURNING id, name, purchase_price AS "purchasePrice"`,
      [req.user.id, name, price.purchasePrice],
    );

    res.status(201).json(result.rows[0]);
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

    const result = await pool.query(
      `UPDATE cars
       SET purchase_price = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, name, purchase_price AS "purchasePrice"`,
      [price.purchasePrice, car.id, req.user.id],
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się zapisać ceny zakupu." });
  }
});
