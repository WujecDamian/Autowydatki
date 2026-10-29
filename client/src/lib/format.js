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

export const errorText = (error, fallback) => error?.data?.message || (error ? fallback : "");
