export const money = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});

export const quantityFormat = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const consumption = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const kilometers = new Intl.NumberFormat("pl-PL");

const pluralRules = new Intl.PluralRules("pl-PL");

// plural(2, "pozycja", "pozycje", "pozycji") === "pozycje"
export const plural = (count, one, few, many) => {
  const form = pluralRules.select(count);

  if (form === "one") {
    return one;
  }

  return form === "few" ? few : many;
};

export const formatDate = (value) => {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
};

// Local date as "YYYY-MM-DD", the format of date inputs and the API.
export const todayString = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const relativeDays = new Intl.RelativeTimeFormat("pl-PL", { numeric: "auto" });

// "dzisiaj", "wczoraj", "3 dni temu" for the last week, the date after that.
export const formatRelativeDay = (isoTimestamp, now = new Date()) => {
  const then = new Date(isoTimestamp);
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.round((startOfDay(now) - startOfDay(then)) / (24 * 60 * 60 * 1000));

  if (daysAgo >= 0 && daysAgo < 7) {
    return relativeDays.format(-daysAgo, "day");
  }

  const month = String(then.getMonth() + 1).padStart(2, "0");
  const day = String(then.getDate()).padStart(2, "0");
  return `${day}.${month}.${then.getFullYear()}`;
};

// The API answers { message, code, fields? }. A request that never reached the server
// has status "FETCH_ERROR" and no data, so it gets its own message.
export const errorText = (error, fallback) => {
  if (!error) {
    return "";
  }

  if (error.status === "FETCH_ERROR") {
    return "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.";
  }

  if (error.status === 429) {
    return error.data?.message || "Zbyt wiele prób. Spróbuj ponownie za chwilę.";
  }

  return error.data?.message || fallback;
};

// The message for one input, when the API says which field was wrong.
export const fieldError = (error, name) => error?.data?.fields?.[name] ?? "";

// Splits an API error into per-input messages and one general message.
// `shownFields` are the inputs that display their own error; if the API complained about
// any other field (a list item, a hidden value), the general message is shown instead.
export const formErrors = (error, fallback, shownFields) => {
  const fields = error?.data?.fields;
  const allShown = Boolean(fields) && Object.keys(fields).every((key) => shownFields.includes(key));

  return {
    message: allShown ? "" : errorText(error, fallback),
    field: (name) => fieldError(error, name),
  };
};
