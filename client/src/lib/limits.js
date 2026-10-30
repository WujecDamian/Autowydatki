// Mirrors `limits` in server/src/schemas.js. The server is the authority; these only
// let the browser stop obviously wrong values before a request is sent.
export const limits = {
  maximumLiters: 1000,
  maximumFuelCost: 100000,
  maximumOdometerKm: 9999999,
  maximumPurchasePrice: 100000000,
};
