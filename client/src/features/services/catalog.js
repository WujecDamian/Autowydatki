// Category names must match server/src/serviceCategories.js.
export const inspectionCategory = "Badanie techniczne";
export const inspectionFeeItem = "Opłata za badanie";
export const otherCategory = "Inne";

export const serviceCatalog = [
  {
    category: "Oleje, płyny i filtry",
    items: [
      "Wymiana oleju silnikowego",
      "Filtr oleju",
      "Filtr powietrza",
      "Filtr kabinowy",
      "Filtr paliwa",
      "Płyn chłodniczy",
    ],
  },
  {
    category: "Silnik",
    items: [
      "Rozrząd",
      "Pasek osprzętu",
      "Świece zapłonowe",
      "Świece żarowe",
      "Pompa wody",
      "Wtryskiwacze",
      "Turbosprężarka",
    ],
  },
  {
    category: "Hamulce",
    items: ["Klocki przód", "Klocki tył", "Tarcze przód", "Tarcze tył", "Płyn hamulcowy"],
  },
  {
    category: "Zawieszenie i układ kierowniczy",
    items: [
      "Amortyzatory",
      "Wahacze",
      "Łączniki stabilizatora",
      "Końcówki drążków",
      "Sprężyny",
      "Geometria kół",
    ],
  },
  {
    category: "Napęd i skrzynia biegów",
    items: ["Sprzęgło", "Koło dwumasowe", "Olej w skrzyni biegów", "Przegub / półoś"],
  },
  {
    category: "Opony i koła",
    items: ["Sezonowa wymiana opon", "Nowe opony", "Wyważanie kół", "Naprawa opony"],
  },
  {
    category: "Elektryka",
    items: ["Akumulator", "Alternator", "Rozrusznik", "Żarówki", "Diagnostyka komputerowa"],
  },
  {
    category: "Klimatyzacja",
    items: ["Serwis klimatyzacji", "Odgrzybianie", "Sprężarka klimatyzacji"],
  },
  {
    category: "Układ wydechowy",
    items: ["Tłumik", "Katalizator", "Filtr DPF"],
  },
  {
    category: "Nadwozie i szyby",
    items: ["Lakierowanie", "Blacharstwo", "Szyba", "Wycieraczki"],
  },
  {
    category: inspectionCategory,
    items: [inspectionFeeItem],
  },
  {
    category: otherCategory,
    items: [],
  },
];

export const categoryNames = serviceCatalog.map((group) => group.category);
