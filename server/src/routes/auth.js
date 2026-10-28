import bcrypt from "bcrypt";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      res.status(400).json({ message: "Podaj email i hasło." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!passwordMatches) {
      res.status(401).json({ message: "Nieprawidłowy email lub hasło." });
      return;
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się zalogować." });
  }
});
