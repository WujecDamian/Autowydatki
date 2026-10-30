import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { prisma } from "../db.js";
import { HttpError } from "../errors.js";
import { requireLogin } from "../passport.js";
import { parseId } from "../schemas.js";
import { photoUrls, removeFiles, saveFile, thumbnailPath } from "../storage.js";
import { findOwnedCar } from "./cars.js";

export const photosRouter = Router();

const maximumPhotosPerCar = 30;
const maximumUploadBytes = 15 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maximumUploadBytes, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new HttpError(400, "To nie jest zdjęcie. Użyj JPG, PNG albo WebP.", "NOT_AN_IMAGE"));
      return;
    }

    callback(null, true);
  },
});

// multer reports its errors (e.g. a file that is too big) through next(error).
const receivePhoto = (req, res, next) => {
  upload.single("photo")(req, res, (error) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ message: error.message, code: error.code });
      return;
    }

    if (error?.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: "Zdjęcie jest za duże (maks. 15 MB).", code: "TOO_LARGE" });
      return;
    }

    if (error) {
      res.status(400).json({ message: "Nie udało się odebrać zdjęcia." });
      return;
    }

    next();
  });
};

const serializePhoto = (photo) => ({
  id: photo.id,
  createdAt: photo.createdAt,
  ...photoUrls(photo.storagePath),
});

const photoFields = { id: true, storagePath: true, createdAt: true };

photosRouter.get("/cars/:id/photos", requireLogin, async (req, res) => {
  try {
    const car = await findOwnedCar(req.user.id, req.params.id);

    if (!car) {
      res.status(404).json({ message: "Nie znaleziono auta." });
      return;
    }

    const photos = await prisma.carPhoto.findMany({
      where: { carId: car.id },
      select: photoFields,
      orderBy: { id: "desc" },
    });

    res.json(photos.map(serializePhoto));
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ message: "Nie udało się pobrać zdjęć." });
  }
});

photosRouter.post("/cars/:id/photos", requireLogin, receivePhoto, async (req, res) => {
  let savedPaths = [];

  try {
    const car = await findOwnedCar(req.user.id, req.params.id);

    if (!car) {
      res.status(404).json({ message: "Nie znaleziono auta." });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "Wybierz zdjęcie." });
      return;
    }

    const count = await prisma.carPhoto.count({ where: { carId: car.id } });

    if (count >= maximumPhotosPerCar) {
      res.status(400).json({ message: `Auto może mieć najwyżej ${maximumPhotosPerCar} zdjęć.` });
      return;
    }

    let full;
    let thumbnail;

    try {
      // rotate() applies the EXIF orientation from phone cameras before the metadata is dropped.
      const image = sharp(req.file.buffer).rotate();
      full = await image
        .clone()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      thumbnail = await image
        .clone()
        .resize({ width: 400, height: 400, fit: "cover" })
        .webp({ quality: 75 })
        .toBuffer();
    } catch {
      res.status(400).json({ message: "Nie udało się odczytać zdjęcia. Użyj JPG, PNG albo WebP." });
      return;
    }

    const storagePath = `${req.user.id}/${car.id}/${randomUUID()}.webp`;
    await saveFile(storagePath, full, "image/webp");
    savedPaths.push(storagePath);
    await saveFile(thumbnailPath(storagePath), thumbnail, "image/webp");
    savedPaths.push(thumbnailPath(storagePath));

    const photo = await prisma.$transaction(async (tx) => {
      const created = await tx.carPhoto.create({
        data: { carId: car.id, userId: req.user.id, storagePath },
        select: photoFields,
      });

      // The first photo of a car becomes its cover.
      await tx.car.updateMany({
        where: { id: car.id, coverPhotoId: null },
        data: { coverPhotoId: created.id },
      });

      return created;
    });

    savedPaths = [];
    res.status(201).json(serializePhoto(photo));
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ message: "Nie udało się zapisać zdjęcia." });
  } finally {
    // Files without a database row would never be shown or cleaned up.
    if (savedPaths.length > 0) {
      await removeFiles(savedPaths).catch((error) => req.log.error(error));
    }
  }
});

photosRouter.delete("/photos/:id", requireLogin, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    const photo = await prisma.carPhoto.findFirst({
      where: { id, userId: req.user.id },
      select: { id: true, carId: true, storagePath: true },
    });

    if (!photo) {
      res.status(404).json({ message: "Nie znaleziono zdjęcia." });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Deleting the cover clears cars.cover_photo_id (ON DELETE SET NULL).
      await tx.carPhoto.delete({ where: { id: photo.id } });

      const newest = await tx.carPhoto.findFirst({
        where: { carId: photo.carId },
        select: { id: true },
        orderBy: { id: "desc" },
      });

      if (newest) {
        await tx.car.updateMany({
          where: { id: photo.carId, coverPhotoId: null },
          data: { coverPhotoId: newest.id },
        });
      }
    });

    // The row is gone either way; a failed file removal only leaves an orphaned file.
    await removeFiles([photo.storagePath, thumbnailPath(photo.storagePath)]).catch((error) =>
      req.log.error(error),
    );

    res.status(204).end();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }

    req.log.error(error);
    res.status(500).json({ message: "Nie udało się usunąć zdjęcia." });
  }
});
