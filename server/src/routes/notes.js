import { Router } from "express";
import { prisma } from "../db.js";
import { requireLogin } from "../passport.js";
import { findOwnedCar } from "./cars.js";

export const notesRouter = Router();

const maximumBodyLength = 5000;

const noteFields = { id: true, body: true, pinned: true, createdAt: true, updatedAt: true };

const readBody = (value) => {
  const body = typeof value === "string" ? value.trim() : "";

  if (!body) {
    return { error: "Notatka nie może być pusta." };
  }

  if (body.length > maximumBodyLength) {
    return { error: `Notatka może mieć najwyżej ${maximumBodyLength} znaków.` };
  }

  return { body };
};

const readNoteId = (rawId) => {
  const id = Number(rawId);
  return Number.isInteger(id) ? id : null;
};

notesRouter.get("/", requireLogin, async (req, res) => {
  try {
    const car = await findOwnedCar(req.user.id, req.query.carId);

    if (!car) {
      res.status(404).json({ message: "Nie znaleziono auta." });
      return;
    }

    const notes = await prisma.note.findMany({
      where: { userId: req.user.id, carId: car.id },
      select: noteFields,
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
    });

    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się pobrać notatek." });
  }
});

notesRouter.post("/", requireLogin, async (req, res) => {
  try {
    const body = readBody(req.body?.body);

    if (body.error) {
      res.status(400).json({ message: body.error });
      return;
    }

    const car = await findOwnedCar(req.user.id, req.body?.carId);

    if (!car) {
      res.status(404).json({ message: "Nie znaleziono auta." });
      return;
    }

    const created = await prisma.note.create({
      data: {
        userId: req.user.id,
        carId: car.id,
        body: body.body,
        pinned: req.body?.pinned === true,
      },
      select: noteFields,
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się zapisać notatki." });
  }
});

notesRouter.patch("/:id", requireLogin, async (req, res) => {
  try {
    const id = readNoteId(req.params.id);

    if (id === null) {
      res.status(400).json({ message: "Nieprawidłowe id." });
      return;
    }

    // Only the fields that are sent change, so pinning does not need the body.
    const data = {};

    if ("body" in (req.body ?? {})) {
      const body = readBody(req.body.body);

      if (body.error) {
        res.status(400).json({ message: body.error });
        return;
      }

      data.body = body.body;
    }

    if ("pinned" in (req.body ?? {})) {
      data.pinned = req.body.pinned === true;
    }

    const existing = await prisma.note.findFirst({
      where: { id, userId: req.user.id },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ message: "Nie znaleziono notatki." });
      return;
    }

    const updated = await prisma.note.update({
      where: { id: existing.id },
      data,
      select: noteFields,
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się zapisać notatki." });
  }
});

notesRouter.delete("/:id", requireLogin, async (req, res) => {
  try {
    const id = readNoteId(req.params.id);

    if (id === null) {
      res.status(400).json({ message: "Nieprawidłowe id." });
      return;
    }

    const result = await prisma.note.deleteMany({ where: { id, userId: req.user.id } });

    if (result.count === 0) {
      res.status(404).json({ message: "Nie znaleziono notatki." });
      return;
    }

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się usunąć notatki." });
  }
});
