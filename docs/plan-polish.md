# Autowydatki: polish round (switcher, stations, LPG, editing, date picker)

## Context
After the post-MVP release, using the app surfaced six things:
1. The car switcher shows tiny thumbnails. People are proud of their cars, so switching should show big photos.
2. The add-car form is crammed into the switcher. It should have its own button.
3. Fuel stations should show brand logos.
4. **Bug:** in the add forms, the date input accepts typing but the calendar never opens.
5. Cars with an LPG installation fuel both petrol and LPG. Fill-ups need to tell them apart.
6. Fill-ups can't be edited, so a typo means deleting and re-adding. Service entries already open for editing when tapped, but nothing on the card shows that.

**Agreed decisions:**
- Add-car button: "+" in the top bar.
- Switcher: photo cards with a blurred glass name bar.
- LPG: an "Instalacja LPG" switch per car; a Benzyna/LPG toggle only for those cars; consumption calculated per fuel.
- Logos: bundled with the app, downloaded once from each brand's official site.

Work on a new branch `polish-lpg` from `main`, with one commit per step and a PR at the end.

## Step 1: Fix the date picker inside drawers (bug) ✅
**Root cause:** in vaul 1.1.2 (`node_modules/vaul/dist/index.mjs`), `onPress` calls `event.target.setPointerCapture()` on every pointerdown inside the drawer content, so the date input never gets the click that opens its picker. It affects every drawer: fuel, service, notes and stations.

**Fix:**
- Drag the drawer only by its handle. `FormDrawer` (`client/src/components/FormDrawer/FormDrawer.jsx`) passes `handleOnly` to `Drawer`.
- In `client/src/components/ui/drawer.jsx`, swap the decorative `<div>` handle bar for `DrawerPrimitive.Handle` with the same classes, so swiping the bar down still closes the sheet.
- Side benefit: scrolling the long service checklist can no longer drag the sheet by accident.

**Check:** in headless Chrome over CDP, dispatch a pointerdown on `#fuel-date` and `#service-date` inside an open drawer. `input.hasPointerCapture(pointerId)` must be false (it's true today). Do the final calendar check by hand on a phone and in desktop Chrome.

## Step 2: Car switcher with big photos, and a separate add-car button ✅
- `client/src/components/CarSwitcher/CarSwitcher.jsx`:
  - Remove `AddCarForm` from the sheet. The sheet becomes "Twoje auta", a list of photo cards.
  - Each card is a `button`, full width, `aspect-[16/9]`, `rounded-3xl`, using `car.coverUrl` (the full image; the 400 px square thumbnail is too small for a wide card) with `object-cover`.
  - A bottom glass bar (`bg-background/40 backdrop-blur-md`) holds the car name (font-heading, lg) and, when `carNeedsAttention` (`client/src/lib/expiry.js`) is true, the most urgent expiry message in red.
  - The selected car gets `ring-2 ring-primary` and a tick.
  - No photo: a purple gradient (`from-primary/40 via-primary/10 to-card`) with a large car icon.
- Header trigger: keep the current compact trigger, with the thumbnail enlarged from size-10 to size-11.
- New `client/src/components/AddCarButton/AddCarButton.jsx`:
  - a round ghost icon button with `Add01Icon` and `aria-label="Dodaj auto"`
  - it opens `FormDrawer` titled "Nowe auto" containing the existing `AddCarForm`
  - after adding: select the new car (`onSelectCar`), close the sheet, navigate to `/auto` so a photo can be added right away
- `AppLayout.jsx`: the header's right side becomes `[AddCarButton][UserMenu]`. The empty state ("Dodaj pierwsze auto") stays as is.

## Step 3: Edit fill-ups, and make editing visible ✅
- **Server** (`server/src/routes/fuel.js`): add `PATCH /:id`.
  - Same `readFuelBody` validation and `findUsableStation` check as POST.
  - Owner-checked with `findFirst({ id, userId })`, as `services.js` PATCH does.
  - Returns the same serialized entry.
- **Client:**
  - `api.js`: add `updateFuel` (invalidates `Fuel`).
  - `FuelForm` in `FuelSection.jsx` takes an optional `entry` and pre-fills it, mirroring `ServiceForm`: `useAdd…`/`useUpdate…` chosen by `entry`, and a `key` on the form.
  - `FuelSection` uses the same `editing` state pattern as `ServiceSection`: `null`, `{ entry: null }` for a new fill-up, or `{ entry }` to edit one.
  - The fuel card becomes a tappable button (layout like the service card) that opens it for editing.
- **Discoverability:** fuel and service cards both get a small edit icon (`PencilEdit02Icon`) next to the delete icon. It's a button with an `aria-label` that opens the same edit sheet, so it's obvious that entries can be edited.

## Step 4: LPG fill-ups ✅
- **Schema** (`server/prisma/schema.prisma`):
  - add `Car.hasLpg Boolean @default(false)`
  - add enum `FuelType { PETROL LPG }` and `FuelEntry.fuelType FuelType @default(PETROL)`
  - Existing entries become PETROL. Write the migration with `migrate diff` and apply it with `migrate deploy`, as before.
- **Server:**
  - `cars.js`: `readCarChanges` accepts a `hasLpg` boolean; add it to `carFields`.
  - `fuel.js`: validate `fuelType` (default `PETROL`) in POST and PATCH, and return it.
- **Calculations** (`client/src/calculations.js`):
  - Compute consumption **within each fuel type** (consecutive full tanks of the same type, sorted by odometer). `perFill` is then always measured against the previous fill of the same fuel.
  - `getSummary` keeps its current fields; `averageLitersPer100km` becomes the PETROL average, so non-LPG cars are unchanged.
  - It also returns `byFuelType: { PETROL: { cost, liters, averageLitersPer100km }, LPG: { … } }`.
  - Extend `calculations.test.js` with: interleaved petrol/LPG fills, LPG-only fills, and unchanged results for a petrol-only car.
- **UI:**
  - `CarDetails.jsx`: an "Instalacja LPG" switch (add the shadcn `switch` component), saved through the existing `updateCar`.
  - `FuelForm`: when `car.hasLpg` (or the edited entry is LPG), show a Benzyna/LPG segmented toggle (the `KindToggle` style from `ServiceForm`). The default is the newest entry's type.
  - Fuel card: an "LPG" badge and the price per litre for that fuel.
  - Pulpit (`Summary.jsx`): for LPG cars, the consumption tile shows both figures ("Benzyna 7,8 · LPG 9,6 l/100 km") and the fuel tile shows the cost split.
  - Note in the UI copy that LPG consumption is per LPG fill-up (km driven on petrol in between are included).

## Step 5: Fuel station logos ✅
- **Assets:**
  - Download each built-in brand's icon once from its official website (apple-touch-icon or the site icon). Brands: Orlen, BP, Shell, Circle K, MOL, Moya, Amic Energy, Avia, Huzar, Auchan, Carrefour, Intermarché, Leclerc.
  - Normalise with sharp to 96×96 PNGs on a transparent or white rounded tile, in `client/public/station-logos/<slug>.png`.
  - A brand whose site has no usable icon falls back to the letter avatar (listed in the PR).
- **Mapping:** `client/src/features/stations/logos.js` maps built-in station names (fixed by the seed migration) to file paths. `StationLogo` (`client/src/components/StationLogo/StationLogo.jsx`) renders the image, or for custom/unknown stations a rounded initial letter with a colour derived from the name.
- **Shown in:**
  - `StationPicker` items and the selected value in the trigger
  - fuel cards, as a round logo at the left of each fill-up
- Logos are trademarks used only to identify the station. The README gets a one-line note.

## Files touched (main)
- **Server:** `prisma/schema.prisma`, a new migration, `src/routes/fuel.js`, `src/routes/cars.js`
- **Client:**
  - `components/ui/drawer.jsx`, `FormDrawer`
  - `CarSwitcher`, `AppLayout`, new `AddCarButton`
  - `FuelSection`, `ServiceSection`, `CarDetails`, `Summary`, `StationPicker`, new `StationLogo`
  - `calculations.js` (+ test), `app/api.js`, `public/station-logos/*`

## Verification
- `npm test --prefix client`: the new LPG calculation tests plus the existing 14
- `npm run lint --prefix client` and `vite build`
- API through `node -e` against the running server:
  - fuel PATCH: own entry 200, someone else's 404, bad station 400, bad `fuelType` 400
  - car `hasLpg` toggle
- Headless Chrome at 390×844 (`shots.mjs` in the scratchpad):
  - the switcher sheet with photo and no-photo cards
  - the "+" sheet, adding a car and landing on `/auto`
  - the fuel form for an LPG car, editing a fill-up
  - logos in the picker and on cards
  - the pointer-capture check from Step 1
- Manual (you): the date calendar opens on a real phone and in desktop Chrome for the fuel and service forms.
