export const fuelTypes = ["PETROL", "LPG"];

// Entries saved before LPG support have no fuel type and are petrol.
const fuelTypeOf = (entry) => entry.fuelType ?? "PETROL";

// Full-tank method: each fill-up's litres cover the distance since the previous fill of the same fuel.
const getConsumption = (entries) => {
  const sorted = [...entries].sort((a, b) => a.odometerKm - b.odometerKm);
  const perFill = [];
  let liters = 0;
  let distance = 0;

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = sorted[index - 1];
    const gap = current.odometerKm - previous.odometerKm;

    if (gap <= 0) {
      perFill.push({ id: current.id, litersPer100km: null });
      continue;
    }

    perFill.push({
      id: current.id,
      litersPer100km: (current.liters / gap) * 100,
    });
    liters += current.liters;
    distance += gap;
  }

  return { perFill, averageLitersPer100km: distance > 0 ? (liters / distance) * 100 : null };
};

export const getSummary = (fuelEntries, serviceEntries) => {
  const fuelCost = fuelEntries.reduce((sum, entry) => sum + entry.totalCost, 0);
  const serviceCost = serviceEntries.reduce((sum, entry) => sum + entry.cost, 0);
  const inspectionCost = serviceEntries
    .filter((entry) => entry.kind === "INSPECTION")
    .reduce((sum, entry) => sum + entry.cost, 0);
  const perFill = [];
  const byFuelType = {};

  // Petrol and LPG are measured separately; mixing them would compare LPG litres with petrol kilometres.
  for (const fuelType of fuelTypes) {
    const entries = fuelEntries.filter((entry) => fuelTypeOf(entry) === fuelType);
    const consumption = getConsumption(entries);

    perFill.push(...consumption.perFill);
    byFuelType[fuelType] = {
      count: entries.length,
      cost: entries.reduce((sum, entry) => sum + entry.totalCost, 0),
      liters: entries.reduce((sum, entry) => sum + entry.liters, 0),
      averageLitersPer100km: consumption.averageLitersPer100km,
    };
  }

  return {
    fuelCost,
    serviceCost,
    repairCost: serviceCost - inspectionCost,
    inspectionCost,
    totalCost: fuelCost + serviceCost,
    averageLitersPer100km: byFuelType.PETROL.averageLitersPer100km,
    byFuelType,
    perFill,
  };
};
