import { ZodError } from "zod";

// Thrown by routes for expected failures; the error middleware turns it into a JSON response.
export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Express 5 forwards rejected promises to the error middleware, so handlers can just throw.
export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: "Nie znaleziono.", code: "NOT_FOUND" });
};

const prismaMessages = {
  P2002: [409, "Taki wpis już istnieje.", "DUPLICATE"],
  P2003: [400, "Powiązany wpis nie istnieje.", "BAD_REFERENCE"],
  P2025: [404, "Nie znaleziono wpisu.", "NOT_FOUND"],
  P2020: [400, "Wartość jest poza dozwolonym zakresem.", "OUT_OF_RANGE"],
  P2000: [400, "Wartość jest zbyt długa.", "OUT_OF_RANGE"],
};

// Always answers with { message, code, fields? } so the client has one shape to read.
export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message, code: error.code ?? "ERROR" });
    return;
  }

  if (error instanceof ZodError) {
    const fields = {};

    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.message;
    }

    res.status(400).json({
      message: Object.values(fields)[0],
      code: "VALIDATION",
      fields,
    });
    return;
  }

  if (error.type === "entity.parse.failed") {
    res.status(400).json({ message: "Nieprawidłowy format danych.", code: "BAD_JSON" });
    return;
  }

  if (error.type === "entity.too.large") {
    res.status(413).json({ message: "Dane są zbyt duże.", code: "TOO_LARGE" });
    return;
  }

  if (error.name === "MulterError") {
    const message =
      error.code === "LIMIT_FILE_SIZE" ? "Zdjęcie jest zbyt duże (maks. 15 MB)." : "Nie udało się wysłać zdjęcia.";
    res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message, code: "UPLOAD" });
    return;
  }

  const prismaCase = prismaMessages[error.code];

  if (prismaCase) {
    const [status, message, code] = prismaCase;
    res.status(status).json({ message, code });
    return;
  }

  // req.log carries the request id, so this line can be matched to the user's report.
  (req.log ?? console).error(error);
  res.status(500).json({ message: "Coś poszło nie tak. Spróbuj ponownie.", code: "INTERNAL" });
};
