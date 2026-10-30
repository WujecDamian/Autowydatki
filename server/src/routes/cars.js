import { Router } from "express";
import { fromDateString, prisma, toDateString } from "../db.js";
import { requireLogin } from "../passport.js";
import { photoUrls, removeFiles, thumbnailPath } from "../storage.js";
import { carCreateSchema, carUpdateSchema, parseId, positiveInt } from "../schemas.js";

export const carsRouter = Router();

const dateFields = ["inspectionValidUntil", "ocValidUntil", "acValidUntil"];

const carFields = {
  id: true,
  name: true,
  purchasePrice: true,
  inspectionValidUntil: true,
  ocValidUntil: true,
  acValidUntil: true,
  hasLpg: true,
  coverPhotoId: true,
  coverPhoto: { select: { storagePath: true } },
};

const serializeCar = ({ coverPhoto, ...car }) => {
  const serialized = { ...car };

  for (const field of dateFields) {
    serialized[field] = car[field] ? toDateString(car[field]) : null;
  }

  const cover = coverPhoto ? photoUrls(coverPhoto.storagePath) : null;
  serialized.coverUrl = cover?.url ?? null;
  serialized.coverThumbUrl = cover?.thumbUrl ?? null;

  return serialized;
};

export const findOwnedCar = async (userId, rawCarId) => {
  const parsed = positiveInt.safeParse(rawCarId);

  if (!parsed.success) {
    return null;
  }

  const carId = parsed.data;

  return prisma.car.findFirst({ where: { id: carId, userId }, select: { id: true, name: true } });
};

carsRouter.get("/", requireLogin, async (req, res) => {
  const cars = await prisma.car.findMany({
    where: { userId: req.user.id },
    select: carFields,
    orderBy: { id: "asc" },
  });

  res.json(cars.map(serializeCar));
});

carsRouter.post("/", requireLogin, async (req, res) => {
  const { name, purchasePrice } = carCreateSchema.parse(req.body ?? {});

  const created = await prisma.car.create({
    data: { userId: req.user.id, name, purchasePrice },
    select: carFields,
  });

  res.status(201).json(serializeCar(created));
});

carsRouter.patch("/:id", requireLogin, async (req, res) => {
  const car = await findOwnedCar(req.user.id, req.params.id);

  if (!car) {
    res.status(404).json({ message: "Nie znaleziono auta." });
    return;
  }

  const { coverPhotoId, ...data } = carUpdateSchema.parse(req.body ?? {});

  for (const field of dateFields) {
    if (data[field]) {
      data[field] = fromDateString(data[field]);
    }
  }

  if (coverPhotoId !== undefined) {
    if (coverPhotoId === null) {
      data.coverPhotoId = null;
    } else {
      // The cover must be one of this car's own photos.
      const photo = await prisma.carPhoto.findFirst({
        where: { id: coverPhotoId, carId: car.id },
        select: { id: true },
      });

      if (!photo) {
        res.status(400).json({ message: "Nie znaleziono zdjęcia.", code: "NOT_FOUND" });
        return;
      }

      data.coverPhotoId = photo.id;
    }
  }

  const updated = await prisma.car.update({
    where: { id: car.id },
    data,
    select: carFields,
  });

  res.json(serializeCar(updated));
});

carsRouter.delete("/:id", requireLogin, async (req, res) => {
  const id = parseId(req.params.id);

  const photos = await prisma.carPhoto.findMany({
    where: { carId: id, userId: req.user.id },
    select: { storagePath: true },
  });

  // Fuel and service entries and photo rows are removed by the database cascade.
  const result = await prisma.car.deleteMany({ where: { id, userId: req.user.id } });

  if (result.count === 0) {
    res.status(404).json({ message: "Nie znaleziono auta." });
    return;
  }

  // Storage is outside the database, so the photo files are removed separately.
  await removeFiles(
    photos.flatMap(({ storagePath }) => [storagePath, thumbnailPath(storagePath)]),
  ).catch((error) => console.error(error));

  res.status(204).end();
});
