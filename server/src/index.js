import cors from "cors";
import express from "express";
import passport from "passport";
import { ensureAdminUser } from "./db.js";
import "./passport.js";
import { authRouter } from "./routes/auth.js";
import { carsRouter } from "./routes/cars.js";
import { fuelRouter } from "./routes/fuel.js";
import { servicesRouter } from "./routes/services.js";
import { stationsRouter } from "./routes/stations.js";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(passport.initialize());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", authRouter);
app.use("/api/cars", carsRouter);
app.use("/api/fuel", fuelRouter);
app.use("/api/services", servicesRouter);
app.use("/api/stations", stationsRouter);

const port = Number(process.env.PORT) || 3001;

ensureAdminUser()
  .then(() => {
    app.listen(port, () => {
      console.log(`API listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error("Database is not connected");
    console.error(error);
    process.exit(1);
  });
