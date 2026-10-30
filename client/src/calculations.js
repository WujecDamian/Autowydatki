export const fuelTypes = ["PETROL", "LPG", "ELECTRIC"];

// 0.1 + 0.2 is 0.30000000000000004 in floating point. Money is added in whole grosze
// (integers are exact) and converted back, so totals are always the sum a person would expect.
export const roundMoney = (value) => Math.round(value * 100) / 100;
export const sumMoney = (items, amountOf) =>
  items.reduce((sum, item) => sum + Math.round(amountOf(item) * 100), 0) / 100;

// Entries saved before LPG support have no fuel type and are petrol.
const fuelTypeOf = (entry) => entry.fuelType ?? "PETROL";

// Full-tank method: each fill-up's amount (litres, or kWh for an electric car) covers the distance since the previous fill of the same fuel.
const getConsumption = (entries) => {
  const sorted = [...entries].sort((a, b) => a.odometerKm - b.odometerKm);
  const perFill = [];
  let quantity = 0;
  let distance = 0;

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = sorted[index - 1];
    const gap = current.odometerKm - previous.odometerKm;

    if (gap <= 0) {
      perFill.push({ id: current.id, per100km: null });
      continue;
    }

    perFill.push({
      id: current.id,
      per100km: (current.quantity / gap) * 100,
    });
    quantity += current.quantity;
    distance += gap;
  }

  return { perFill, averagePer100km: distance > 0 ? (quantity / distance) * 100 : null };
};

export const getSummary = (fuelEntries, serviceEntries) => {
  const fuelCost = sumMoney(fuelEntries, (entry) => entry.totalCost);
  const serviceCost = sumMoney(serviceEntries, (entry) => entry.cost);
  const inspectionCost = sumMoney(
    serviceEntries.filter((entry) => entry.kind === "INSPECTION"),
    (entry) => entry.cost,
  );
  const perFill = [];
  const byFuelType = {};

  // Each fuel is measured separately; mixing them would compare LPG litres with petrol kilometres.
  for (const fuelType of fuelTypes) {
    const entries = fuelEntries.filter((entry) => fuelTypeOf(entry) === fuelType);
    const consumption = getConsumption(entries);

    perFill.push(...consumption.perFill);
    const cost = sumMoney(entries, (entry) => entry.totalCost);
    const quantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);

    byFuelType[fuelType] = {
      count: entries.length,
      cost,
      quantity,
      averagePer100km: consumption.averagePer100km,
      // Average consumption at the average price paid per litre.
      costPer100km:
        consumption.averagePer100km !== null && quantity > 0
          ? consumption.averagePer100km * (cost / quantity)
          : null,
    };
  }

  return {
    fuelCost,
    serviceCost,
    repairCost: roundMoney(serviceCost - inspectionCost),
    inspectionCost,
    totalCost: roundMoney(fuelCost + serviceCost),
    // A car has either petrol or electric fill-ups, so one of the two is null.
    averagePer100km: byFuelType.PETROL.averagePer100km ?? byFuelType.ELECTRIC.averagePer100km,
    byFuelType,
    perFill,
  };
};

const monthKey = (year, monthIndex) => `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

// Fuel plus service spending for each of the last `months` calendar months, oldest first.
export const getMonthlyCosts = (fuelEntries, serviceEntries, now = new Date(), months = 6) => {
  const buckets = [];

  for (let back = months - 1; back >= 0; back -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - back, 1);
    buckets.push({
      key: monthKey(date.getFullYear(), date.getMonth()),
      monthIndex: date.getMonth(),
      fuel: 0,
      service: 0,
    });
  }

  const addTo = (entries, field, amountOf) => {
    for (const entry of entries) {
      const bucket = buckets.find((item) => item.key === entry.entryDate.slice(0, 7));

      if (bucket) {
        bucket[field] = roundMoney(bucket[field] + amountOf(entry));
      }
    }
  };

  addTo(fuelEntries, "fuel", (entry) => entry.totalCost);
  addTo(serviceEntries, "service", (entry) => entry.cost);

  return buckets.map((bucket) => ({ ...bucket, total: roundMoney(bucket.fuel + bucket.service) }));
};

// Running cost per driven kilometre: fuel and service over the odometer span of all entries.
export const getCostPerKm = (fuelEntries, serviceEntries) => {
  const odometers = [...fuelEntries, ...serviceEntries].map((entry) => entry.odometerKm);

  if (odometers.length < 2) {
    return null;
  }

  const distance = Math.max(...odometers) - Math.min(...odometers);

  if (distance <= 0) {
    return null;
  }

  const cost =
    sumMoney(fuelEntries, (entry) => entry.totalCost) +
    sumMoney(serviceEntries, (entry) => entry.cost);

  return cost / distance;
};

// Price per litre (or kWh) over time for each fuel, plus the amount bought and the latest fill-up.
export const getFuelStats = (fuelEntries) => {
  const byFuelType = {};

  for (const fuelType of fuelTypes) {
    const entries = fuelEntries
      .filter((entry) => fuelTypeOf(entry) === fuelType)
      .sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.odometerKm - b.odometerKm);
    const quantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const cost = sumMoney(entries, (entry) => entry.totalCost);
    const series = entries.map((entry) => ({ date: entry.entryDate, price: entry.totalCost / entry.quantity }));

    byFuelType[fuelType] = {
      series,
      averagePrice: quantity > 0 ? cost / quantity : null,
      latestPrice: series.length > 0 ? series[series.length - 1].price : null,
    };
  }

  const newest = [...fuelEntries].sort(
    (a, b) => b.entryDate.localeCompare(a.entryDate) || b.odometerKm - a.odometerKm,
  )[0];

  return {
    totalQuantity: fuelEntries.reduce((sum, entry) => sum + entry.quantity, 0),
    byFuelType,
    last: newest ?? null,
  };
};
