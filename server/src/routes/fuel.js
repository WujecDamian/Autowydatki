import { Router } from "express";
import { pool } from "../db.js";
import { requireLogin } from "../passport.js";
import { findOwnedCar } from "./cars.js";

export const fuelRouter = Router();

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

const isBlank = (value) => value === undefined || value === null || value === "";

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

    const result = await pool.query(
      `SELECT id,
              entry_date AS "entryDate",
              odometer_km AS "odometerKm",
              liters,
              total_cost AS "totalCost"
       FROM fuel_entries
       WHERE user_id = $1 AND car_id = $2
       ORDER BY entry_date DESC, id DESC`,
      [req.user.id, car.id],
    );

    res.json(result.rows);
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

    const result = await pool.query(
      `INSERT INTO fuel_entries (user_id, car_id, entry_date, odometer_km, liters, total_cost)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id,
                 entry_date AS "entryDate",
                 odometer_km AS "odometerKm",
                 liters,
                 total_cost AS "totalCost"`,
      [req.user.id, car.id, fuel.entryDate, fuel.odometerKm, fuel.liters, fuel.totalCost],
    );

    res.status(201).json(result.rows[0]);
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

    const result = await pool.query("DELETE FROM fuel_entries WHERE id = $1 AND user_id = $2", [
      id,
      req.user.id,
    ]);

    if (result.rowCount === 0) {
      res.status(404).json({ message: "Nie znaleziono tankowania." });
      return;
    }

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się usunąć tankowania." });
  }
});
