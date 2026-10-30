import { z } from "zod";
import { HttpError } from "./errors.js";
import { serviceCategories } from "./serviceCategories.js";
import { isRealDate } from "./validation.js";

// Column limits: liters DECIMAL(8,2), costs DECIMAL(10,2), purchase price DECIMAL(12,2), INT4 odometer.
// The caps are lower than the columns so absurd values are rejected with a clear message.
export const limits = {
  maximumLiters: 1000,
  maximumFuelCost: 100000,
  maximumServiceCost: 99999999.99,
  maximumPurchasePrice: 100000000,
  maximumOdometerKm: 9999999,
  maximumItems: 50,
  nameLength: 60,
  stationNameLength: 40,
  titleLength: 80,
  itemNameLength: 80,
  noteLength: 5000,
  minimumYear: 1950,
  maximumYear: 2100,
};

const isBlank = (value) => value === undefined || value === null || (typeof value === "string" && value.trim() === "");

// Accepts 12, 12.5 or "12.5". Rejects "1e3", "0x10", " ", NaN and Infinity.
const plainNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  if (typeof value === "string" && /^-?\d+([.,]\d+)?$/.test(value.trim())) {
    return Number(value.trim().replace(",", "."));
  }

  return Number.NaN;
};

const numberField = (message) =>
  z.preprocess(
    (value) => (isBlank(value) ? undefined : plainNumber(value)),
    z.number({ error: message }),
  );

export const positiveInt = z
  .union([z.number(), z.string().regex(/^\d+$/)], { error: "Nieprawidłowe id." })
  .transform(Number)
  .pipe(z.number().int("Nieprawidłowe id.").min(1, "Nieprawidłowe id.").max(2147483647, "Nieprawidłowe id."));

// For :id route params; anything but a positive integer is a 400.
export const parseId = (raw) => {
  const result = positiveInt.safeParse(raw);

  if (!result.success) {
    throw new HttpError(400, "Nieprawidłowe id.", "BAD_ID");
  }

  return result.data;
};

// A date as "YYYY-MM-DD" that really exists and lies within a sane range.
export const dateField = (message = "Podaj prawidłową datę.") =>
  z
    .string({ error: message })
    .refine(isRealDate, message)
    .refine((value) => {
      const year = Number(value.slice(0, 4));
      return year >= limits.minimumYear && year <= limits.maximumYear;
    }, message);

// A date that cannot be in the future (one day of slack covers time zones).
export const pastDateField = (message = "Podaj prawidłową datę.") =>
  dateField(message).refine((value) => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return value <= tomorrow;
  }, "Data nie może być z przyszłości.");

export const odometerField = numberField("Przebieg musi być liczbą całkowitą równą lub większą od 0.").pipe(
  z
    .number()
    .int("Przebieg musi być liczbą całkowitą równą lub większą od 0.")
    .min(0, "Przebieg musi być liczbą całkowitą równą lub większą od 0.")
    .max(limits.maximumOdometerKm, "Przebieg jest zbyt duży."),
);

// "" and null mean "no value".
const optional = (schema) => z.preprocess((value) => (isBlank(value) ? null : value), schema.nullable());

const text = (max, { empty, tooLong }) =>
  z
    .string({ error: empty })
    .trim()
    .min(1, empty)
    .max(max, tooLong);

// ---- fuel ----

export const fuelSchema = z.object({
  fuelType: z.preprocess(
    (value) => (isBlank(value) ? "PETROL" : value),
    z.enum(["PETROL", "LPG"], { error: "Nieznany rodzaj paliwa." }),
  ),
  entryDate: pastDateField(),
  odometerKm: odometerField,
  liters: numberField("Litry muszą być większe od 0.").pipe(
    z
      .number()
      .gt(0, "Litry muszą być większe od 0.")
      .max(limits.maximumLiters, `Litry mogą mieć najwyżej ${limits.maximumLiters}.`),
  ),
  totalCost: numberField("Koszt musi być równy lub większy od 0.").pipe(
    z
      .number()
      .min(0, "Koszt musi być równy lub większy od 0.")
      .max(limits.maximumFuelCost, "Koszt jest zbyt duży."),
  ),
  stationId: optional(positiveInt).optional(),
});

// ---- cars ----

const carName = text(limits.nameLength, {
  empty: "Podaj nazwę auta.",
  tooLong: "Nazwa auta jest za długa.",
});

const purchasePrice = optional(
  numberField("Cena zakupu musi być równa lub większa od 0.").pipe(
    z
      .number()
      .min(0, "Cena zakupu musi być równa lub większa od 0.")
      .max(limits.maximumPurchasePrice, "Cena zakupu jest zbyt duża."),
  ),
);

const validityDate = optional(dateField());

export const carCreateSchema = z.object({
  name: carName,
  purchasePrice: purchasePrice.optional().default(null),
});

export const carUpdateSchema = z.object({
  name: carName.optional(),
  purchasePrice: purchasePrice.optional(),
  hasLpg: z.boolean({ error: "Nieprawidłowa wartość LPG." }).optional(),
  inspectionValidUntil: validityDate.optional(),
  ocValidUntil: validityDate.optional(),
  acValidUntil: validityDate.optional(),
  coverPhotoId: z.union([positiveInt, z.null()], { error: "Nie znaleziono zdjęcia." }).optional(),
});

// ---- services ----

const serviceItemSchema = z.object({
  category: z.enum(serviceCategories, { error: "Nieznana kategoria pozycji." }),
  name: text(limits.itemNameLength, {
    empty: "Każda pozycja musi mieć nazwę.",
    tooLong: "Nazwa pozycji jest za długa.",
  }),
  cost: numberField("Podaj prawidłową cenę pozycji.").pipe(
    z
      .number()
      .min(0, "Podaj prawidłową cenę pozycji.")
      .max(limits.maximumServiceCost, "Podaj prawidłową cenę pozycji."),
  ),
});

export const serviceSchema = z
  .object({
    kind: z.enum(["REPAIR", "INSPECTION"], { error: "Wybierz rodzaj wpisu." }),
    title: z.preprocess(
      (value) => (isBlank(value) ? null : value),
      z.string().trim().max(limits.titleLength, "Tytuł jest za długi.").nullable(),
    ),
    entryDate: pastDateField(),
    odometerKm: odometerField,
    items: z
      .array(serviceItemSchema, { error: "Zaznacz przynajmniej jedną pozycję." })
      .min(1, "Zaznacz przynajmniej jedną pozycję.")
      .max(limits.maximumItems, `Wpis może mieć najwyżej ${limits.maximumItems} pozycji.`),
    nextInspectionDate: optional(dateField()).optional(),
  })
  .transform((service) => ({
    ...service,
    nextInspectionDate: service.kind === "INSPECTION" ? (service.nextInspectionDate ?? null) : null,
  }))
  .refine(
    (service) => !service.nextInspectionDate || service.nextInspectionDate > service.entryDate,
    { message: "Data ważności badania musi być późniejsza niż data badania.", path: ["nextInspectionDate"] },
  );

// ---- notes ----

const noteBody = text(limits.noteLength, {
  empty: "Notatka nie może być pusta.",
  tooLong: `Notatka może mieć najwyżej ${limits.noteLength} znaków.`,
});

export const noteCreateSchema = z.object({
  body: noteBody,
  pinned: z.boolean().optional().default(false),
});

export const noteUpdateSchema = z.object({
  body: noteBody.optional(),
  pinned: z.boolean().optional(),
});

// ---- stations ----

export const stationSchema = z.object({
  name: text(limits.stationNameLength, {
    empty: "Podaj nazwę stacji.",
    tooLong: "Nazwa stacji jest za długa.",
  }),
});

// ---- auth ----

export const loginSchema = z.object({
  email: z.string({ error: "Podaj email i hasło." }).trim().min(1, "Podaj email i hasło.").max(254),
  // bcrypt ignores everything past 72 bytes and long inputs only cost CPU.
  password: z.string({ error: "Podaj email i hasło." }).min(1, "Podaj email i hasło.").max(200),
});
