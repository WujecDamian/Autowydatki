import { randomUUID } from "node:crypto";
import { pino } from "pino";
import { pinoHttp } from "pino-http";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // Tokens and passwords must never reach the logs.
  redact: ["req.headers.authorization", "req.headers.cookie"],
});

// One log line per request with method, URL, status and duration, tagged with a request id
// that is also sent back as X-Request-Id so a user's error report can be found in the logs.
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = req.headers["x-request-id"]?.toString().slice(0, 64) || randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  autoLogging: { ignore: (req) => req.url === "/health" },
  // Only the fields that help; the default also logs every header.
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
