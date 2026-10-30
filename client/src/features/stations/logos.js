// Built-in station names come from the fuel_stations seed migration.
// Logos were downloaded once from each brand's own website (see README); brands without a usable
// icon (Moya, Avia, Huzar, Carrefour) and custom stations get a letter avatar instead.
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
};

export const stationLogoUrl = (name) => (logoFiles[name] ? `/station-logos/${logoFiles[name]}` : null);

// A stable hue per name, so a custom station always gets the same colour.
export const stationHue = (name) => {
  let hash = 0;

  for (const character of name) {
    hash = (hash * 31 + character.codePointAt(0)) % 360;
  }

  return hash;
};
