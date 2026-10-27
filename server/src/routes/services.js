import { Router } from "express";
import { pool } from "../db.js";
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

    const result = await pool.query(
      `SELECT id,
              entry_date AS "entryDate",
              odometer_km AS "odometerKm",
              title,
              cost
       FROM service_entries
       WHERE user_id = $1 AND car_id = $2
       ORDER BY entry_date DESC, id DESC`,
      [req.user.id, car.id],
    );

    res.json(result.rows);
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

    const result = await pool.query(
      `INSERT INTO service_entries (user_id, car_id, entry_date, odometer_km, title, cost)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id,
                 entry_date AS "entryDate",
                 odometer_km AS "odometerKm",
                 title,
                 cost`,
      [req.user.id, car.id, service.entryDate, service.odometerKm, service.title, service.cost],
    );

    res.status(201).json(result.rows[0]);
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

    const result = await pool.query(
      "DELETE FROM service_entries WHERE id = $1 AND user_id = $2",
      [id, req.user.id],
    );

    if (result.rowCount === 0) {
      res.status(404).json({ message: "Nie znaleziono serwisu." });
      return;
    }

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się usunąć serwisu." });
  }
});
