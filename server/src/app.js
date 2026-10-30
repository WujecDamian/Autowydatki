import cors from "cors";
import express from "express";
import helmet from "helmet";
import passport from "passport";
import { prisma } from "./db.js";
import { env } from "./env.js";
import { errorHandler, notFoundHandler } from "./errors.js";
import { requestLogger } from "./logger.js";
import "./passport.js";
import { apiLimiter } from "./rateLimit.js";
import { localUploadsRoute, uploadsDir } from "./storage.js";
import { authRouter } from "./routes/auth.js";
import { carsRouter } from "./routes/cars.js";
import { photosRouter } from "./routes/photos.js";
import { fuelRouter } from "./routes/fuel.js";
import { notesRouter } from "./routes/notes.js";
import { servicesRouter } from "./routes/services.js";
import { stationsRouter } from "./routes/stations.js";

export const app = express();

app.set("trust proxy", 1);
app.use(requestLogger);
// The API only returns JSON; images are served from storage, so they must be embeddable.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: env.corsOrigins }));
app.use(express.json({ limit: "100kb" }));
app.use(passport.initialize());

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch (error) {
    console.error(error);
    res.status(503).json({ status: "database unavailable" });
  }
});

app.use("/api", apiLimiter);
app.use("/api", authRouter);
app.use("/api/cars", carsRouter);
app.use("/api/fuel", fuelRouter);
app.use("/api/services", servicesRouter);
app.use("/api/stations", stationsRouter);
app.use("/api/notes", notesRouter);
app.use("/api", photosRouter);
// Only used when Supabase Storage is not configured (local development).
app.use(localUploadsRoute, express.static(uploadsDir));

app.use(notFoundHandler);
app.use(errorHandler);
