import bcrypt from "bcrypt";
import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { requireLogin } from "../passport.js";

export const authRouter = Router();

const googleClient = new OAuth2Client();

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

authRouter.post("/login", async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      res.status(400).json({ message: "Podaj email i hasło." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Google-only accounts have no password, so they cannot log in this way.
    const passwordMatches = user?.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!passwordMatches) {
      res.status(401).json({ message: "Nieprawidłowy email lub hasło." });
      return;
    }

    res.json({ token: signToken(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się zalogować." });
  }
});

authRouter.post("/auth/google", async (req, res) => {
  const credential = typeof req.body?.credential === "string" ? req.body.credential : "";

  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(503).json({ message: "Logowanie przez Google nie jest skonfigurowane." });
    return;
  }

  if (!credential) {
    res.status(400).json({ message: "Brak tokenu Google." });
    return;
  }

  let payload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    res.status(401).json({ message: "Nie udało się potwierdzić konta Google." });
    return;
  }

  if (!payload?.email || !payload.email_verified) {
    res.status(401).json({ message: "Konto Google nie ma potwierdzonego adresu email." });
    return;
  }

  try {
    const profile = { name: payload.name ?? null, avatarUrl: payload.picture ?? null };
    let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });

    if (user) {
      user = await prisma.user.update({ where: { id: user.id }, data: profile });
    } else {
      // An existing email/password account with the same verified email gets linked.
      user = await prisma.user.upsert({
        where: { email: payload.email },
        update: { googleId: payload.sub, ...profile },
        create: { email: payload.email, googleId: payload.sub, ...profile },
      });
    }

    res.json({ token: signToken(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się zalogować." });
  }
});

authRouter.get("/me", requireLogin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nie udało się pobrać konta." });
  }
});
