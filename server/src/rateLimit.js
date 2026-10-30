import { rateLimit } from "express-rate-limit";

const tooMany = {
  message: "Zbyt wiele prób. Spróbuj ponownie za kilka minut.",
  code: "RATE_LIMITED",
};

// Failed and successful attempts both count, so a leaked demo password cannot be hammered.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany,
});

// Generous cap for the whole API; it only stops runaway clients.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany,
});
