// Built-in station names come from the fuel_stations seed migration.
// Logos were downloaded once from each brand's own website (see README). Custom stations get a
// letter avatar instead, and home charging has no brand so the component draws a house icon.
const logoFiles = {
  Orlen: "orlen.png",
  BP: "bp.png",
  Shell: "shell.png",
  "Circle K": "circlek.png",
  MOL: "mol.png",
  "Amic Energy": "amic.png",
  Auchan: "auchan.png",
  Intermarché: "intermarche.png",
  Leclerc: "leclerc.png",
  Moya: "moya.png",
  Avia: "avia.png",
  Huzar: "huzar.png",
  Carrefour: "carrefour.png",
  // Charging networks; the Orlen and Shell ones reuse the parent brand's logo.
  "Orlen Charge": "orlen.png",
  "Shell Recharge": "shell.png",
  GreenWay: "greenway.png",
  "Tesla Supercharger": "tesla.png",
  Ionity: "ionity.png",
  PowerDot: "powerdot.png",
  Elocity: "elocity.png",
};

export const homeChargingName = "Ładowanie w domu";

export const stationLogoUrl = (name) => (logoFiles[name] ? `/station-logos/${logoFiles[name]}` : null);

// A stable hue per name, so a custom station always gets the same colour.
export const stationHue = (name) => {
  let hash = 0;

  for (const character of name) {
    hash = (hash * 31 + character.codePointAt(0)) % 360;
  }

  return hash;
};
