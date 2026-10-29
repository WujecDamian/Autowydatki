export const money = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});

export const litersFormat = new Intl.NumberFormat("pl-PL", {
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

export const errorText = (error, fallback) => error?.data?.message || (error ? fallback : "");
