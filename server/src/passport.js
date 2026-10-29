import passport from "passport";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { prisma } from "./db.js";

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.id },
          select: { id: true, email: true },
        });

        if (!user) {
          done(null, false);
          return;
        }

        done(null, user);
      } catch (error) {
        done(error, false);
      }
    },
  ),
);

export const requireLogin = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (error, user) => {
    if (error) {
      console.error(error);
      res.status(500).json({ message: "Nie udało się sprawdzić logowania." });
      return;
    }

    if (!user) {
      res.status(401).json({ message: "Zaloguj się." });
      return;
    }

    req.user = user;
    next();
  })(req, res, next);
};
