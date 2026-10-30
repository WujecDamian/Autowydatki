import { rateLimit } from "express-rate-limit";

const tooMany = {
  message: "Zbyt wiele prób. Spróbuj ponownie za kilka minut.",
  code: "RATE_LIMITED",
};

// Same response as before, plus a log line that log-based alerts can match on.
const onLimit = (req, res, next, options) => {
  req.log.warn({ event: "rate_limited" }, "rate limit hit");
  res.status(options.statusCode).json(tooMany);
};

// Failed and successful attempts both count, so a leaked demo password cannot be hammered.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: onLimit,
});

// Generous cap for the whole API; it only stops runaway clients.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: onLimit,
});
