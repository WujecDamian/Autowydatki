import { Router } from "express";
import { prisma } from "../db.js";
import { requireLogin } from "../passport.js";
import { noteCreateSchema, noteUpdateSchema, parseId } from "../schemas.js";
import { findOwnedCar } from "./cars.js";

export const notesRouter = Router();

const noteFields = { id: true, body: true, pinned: true, createdAt: true, updatedAt: true };

notesRouter.get("/", requireLogin, async (req, res) => {
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
});

notesRouter.post("/", requireLogin, async (req, res) => {
  const note = noteCreateSchema.parse(req.body ?? {});

  const car = await findOwnedCar(req.user.id, req.body?.carId);

  if (!car) {
    res.status(404).json({ message: "Nie znaleziono auta." });
    return;
  }

  const created = await prisma.note.create({
    data: {
      userId: req.user.id,
      carId: car.id,
      body: note.body,
      pinned: note.pinned,
    },
    select: noteFields,
  });

  res.status(201).json(created);
});

notesRouter.patch("/:id", requireLogin, async (req, res) => {
  const id = parseId(req.params.id);
  // Only the fields that are sent change, so pinning does not need the body.
  const data = noteUpdateSchema.parse(req.body ?? {});

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
});

notesRouter.delete("/:id", requireLogin, async (req, res) => {
  const id = parseId(req.params.id);

  const result = await prisma.note.deleteMany({ where: { id, userId: req.user.id } });

  if (result.count === 0) {
    res.status(404).json({ message: "Nie znaleziono notatki." });
    return;
  }

  res.status(204).end();
});
