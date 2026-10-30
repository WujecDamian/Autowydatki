import bcrypt from "bcrypt";
import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { requireLogin } from "../passport.js";
import { loginLimiter } from "../rateLimit.js";
import { loginSchema } from "../schemas.js";

export const authRouter = Router();

const googleClient = new OAuth2Client();

// Compared against when the email is unknown, so a missing account takes as long as a wrong
// password and response time does not reveal which emails are registered.
const dummyPasswordHash = bcrypt.hashSync("not-a-real-password", 10);

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, env.jwtSecret, {
    expiresIn: "7d",
  });

authRouter.post("/login", loginLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({ message: "Podaj email i hasło.", code: "VALIDATION" });
      return;
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    // Google-only accounts have no password, so they cannot log in this way.
    const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? dummyPasswordHash);

    if (!user?.passwordHash || !passwordMatches) {
      // A fixed "event" makes failed logins easy to count and alert on in the log service.
      req.log.warn({ event: "login_failed" }, "login failed");
      res.status(401).json({ message: "Nieprawidłowy email lub hasło." });
      return;
    }

    res.json({ token: signToken(user) });
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ message: "Nie udało się zalogować." });
  }
});

authRouter.post("/auth/google", loginLimiter, async (req, res) => {
  const credential = typeof req.body?.credential === "string" ? req.body.credential : "";

  if (!env.googleClientId) {
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
      audience: env.googleClientId,
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
    req.log.error(error);
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
    req.log.error(error);
    res.status(500).json({ message: "Nie udało się pobrać konta." });
  }
});
