export const getSummary = (fuelEntries, serviceEntries) => {
  const fuelCost = fuelEntries.reduce((sum, entry) => sum + entry.totalCost, 0);
  const serviceCost = serviceEntries.reduce((sum, entry) => sum + entry.cost, 0);
  const sortedFuel = [...fuelEntries].sort((a, b) => a.odometerKm - b.odometerKm);
  const perFill = [];
  let liters = 0;
  let distance = 0;

  for (let index = 1; index < sortedFuel.length; index += 1) {
    const current = sortedFuel[index];
    const previous = sortedFuel[index - 1];
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

  return {
    fuelCost,
    serviceCost,
    totalCost: fuelCost + serviceCost,
    averageLitersPer100km: distance > 0 ? (liters / distance) * 100 : null,
    perFill,
  };
};
