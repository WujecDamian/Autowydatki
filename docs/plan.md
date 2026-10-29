# Autowydatki — post-MVP feature plan

## Context
Autowydatki is a hard MVP: one shared admin account (public credentials so a recruiter can log in), cars with a purchase price, fuel entries, flat service entries (title + cost), and a summary. The goal is to make it a real app for Polish drivers:

1. Google sign-in, keeping the email/password demo login for the interviewer.
2. Fuel station per fill-up (Polish brands + user's custom stations).
3. Repairs and MoT (badanie techniczne) as itemised checklists with automatic totals.
4. MoT and OC/AC expiry tracking with days-left warnings.
5. Car cover photo and photo gallery (Supabase Storage).
6. Notes per car.
7. A dark-only, purple, mobile-first redesign.

**Agreed decisions:** Supabase Storage for photos · shared Repair/MoT checklist with categories and custom items · stations are brand only (+ custom) · order is Google Auth → restyle → features.

**Stack today:** Express 5 + Prisma 7 (Postgres/Supabase) + passport-jwt in `server/`. React 19 + RTK Query + Tailwind v4 + shadcn in `client/`. All UI text is Polish.

## Step 0 — Housekeeping ✅
- Copy this plan to `docs/plan.md` in the repo and tick steps off as they land.
- Work on a feature branch, with one commit per step below.
- Move the duplicated `isRealDate`/`isBlank` (in `server/src/routes/fuel.js` and `services.js`) into `server/src/validation.js`. The new routes will reuse them.
- Every schema change goes in `server/prisma/schema.prisma` and runs through `npm run db:migrate` (data moves are hand-edited into the generated SQL).

## Step 1 — Google Auth (keep demo login) ✅
**Approach:** use Google Identity Services. The client gets a Google ID token and the server verifies it, then issues our existing JWT. There are no sessions or redirects, so the rest of the auth stays unchanged.
- Schema `User`:
  - `passwordHash` becomes nullable
  - add `googleId String? @unique`, `name String?`, `avatarUrl String?`
- Server: `POST /api/auth/google` in `server/src/routes/auth.js`
  - verifies the `credential` with `google-auth-library` (`OAuth2Client.verifyIdToken`, audience `GOOGLE_CLIENT_ID`)
  - finds the user by `googleId`; failing that, links an existing user by verified email; failing that, creates one
  - signs the JWT exactly like `/login` (extract a shared `signToken(user)`)
- `/login` rejects users with a null `passwordHash` (Google-only accounts).
- Add `GET /api/me` (name, email, avatar) so the header can show who is logged in.
- Client:
  - add `@react-oauth/google`
  - wrap `main.jsx` in `GoogleOAuthProvider` (`VITE_GOOGLE_CLIENT_ID`)
  - `Login.jsx` shows a "Zaloguj przez Google" button as the main action. The email/password form and the "Dane dla rekrutera" card stay below it.
- Env and README:
  - `GOOGLE_CLIENT_ID` (server), `VITE_GOOGLE_CLIENT_ID` (client)
  - Google Cloud Console setup: OAuth client of type Web, with authorized JS origins `http://localhost:5173` and the Pages domain

## Step 2 — Dark purple, mobile-first restyle ✅
- **Theme**, in `client/src/index.css`:
  - dark only, so the purple dark palette goes directly in `:root`
  - delete the light palette and the `.dark` block. `<html class="dark">` is set permanently, so the ui components' `dark:` variants still apply
  - add `color-scheme: dark`
  - palette direction: background near-black violet (`oklch(0.16 0.03 290)`), cards a step lighter, primary vivid purple (`oklch(0.65 0.22 295)`), a subtle violet glow/gradient on hero cards
  - status colors for expiry: green/amber/red tokens
  - `index.html`: `<meta name="theme-color">`, `viewport-fit=cover`
- **Navigation:** add `react-router` (library mode) so the phone back button and deep links work.
  - Routes: `/` Pulpit (summary + expiry alerts), `/paliwo`, `/serwis`, `/notatki`, `/auto` (details, dates, photos)
  - All routes are scoped to the selected car, remembered in localStorage and passed to pages through the layout's `<Outlet context>`
- **Layout shell:** replace `CarSidebar` + the header in `App.jsx`.
  - Top bar: car switcher (cover thumbnail + name, opens a bottom sheet listing cars + "Dodaj auto") and the user avatar menu (logout).
  - Fixed bottom tab bar (Hugeicons, matching the shadcn config) with safe-area padding. It starts with 4 tabs; Step 7 adds Notatki.
  - On `md+`, the bottom bar becomes a left rail and the content is centered (max-w ~3xl).
- **Forms:** move into bottom-sheet drawers opened by a floating "+" button per screen, instead of the always-visible cards. Lists become compact cards. Deleting asks for confirmation (AlertDialog).
- Add shadcn components: `drawer`, `dialog`, `alert-dialog`, `checkbox`, `select`, `textarea`, `badge`, `dropdown-menu`, `avatar`.
- Share the formatters (`money`, `formatDate`, `consumption`, copied today across 3 components) in `client/src/lib/format.js`.

## Step 3 — Fuel stations (brand only + custom) ✅
- Schema:
  - `FuelStation { id, name, userId Int? }`. A null `userId` is a built-in brand.
  - `FuelEntry.stationId Int?`
  - the migration seeds the brands: Orlen, BP, Shell, Circle K, MOL, Moya, Amic Energy, Avia, Huzar, Auchan, Carrefour, Intermarché, Leclerc
- Server, new `server/src/routes/stations.js`:
  - `GET /api/stations`: built-in + the user's own, built-ins first, alphabetical
  - `POST` (name ≤ 40, unique per user, case-insensitive)
  - `DELETE /:id`: own only. Entries keep their history through `onDelete: SetNull`.
- Fuel routes: accept and validate `stationId` (it must be built-in or owned) and return `station { id, name }` with each entry.
- Client:
  - station `Select` in the fuel drawer, with an "+ Dodaj własną stację" option that opens an inline input
  - the last used station is preselected
  - the station name is shown on each fuel card

## Step 4 — Repairs and MoT checklists ✅
- Schema:
  - `ServiceEntry`: add `kind ServiceKind @default(REPAIR)` (`REPAIR | INSPECTION`) and make `title` optional
  - new `ServiceItem { id, serviceEntryId, category, name, cost Decimal }` with cascade delete
  - **Data migration:** for each existing entry, insert one item (`category 'Inne'`, `name = title`, `cost = cost`), then drop `ServiceEntry.cost`. The total is always the sum of its items.
- Catalog: `client/src/features/services/catalog.js` holds categories and their common items, for example:
  - Silnik: olej + filtr, rozrząd, świece…
  - Hamulce: klocki, tarcze, płyn…
  - Zawieszenie
  - Opony i koła
  - Elektryka
  - Klimatyzacja
  - Nadwozie
  - Płyny i filtry
  - Badanie techniczne: opłata za badanie
  - Inne

  The server validates `category` against the same list of names (`server/src/serviceCategories.js`). Item names are free text (≤ 80).
- API, in `server/src/routes/services.js`:
  - POST/GET/DELETE take and return `kind`, `items[]` (1–50 items, each cost ≥ 0) and a computed `cost`
  - create runs as a nested write, so it is atomic
  - add `PATCH /:id` so an entry can be edited
- Moved to Step 5 (the car date fields arrive there): an INSPECTION entry can include `nextInspectionDate`. When set, the same transaction updates `Car.inspectionValidUntil`.
- Client drawer:
  1. a Naprawa / Badanie techniczne toggle
  2. date + mileage (+ optional title)
  3. a category accordion with checkboxes. Ticking an item reveals its price input.
  4. "+ Własna pozycja" (category + name + price)
  5. a sticky footer with the live total ("Razem: 1 240,00 zł")

  The list shows a type badge, item count and total, and expands to show the items.
- Adjust `calculations.js` so `serviceCost` keeps summing `entry.cost` (the API still returns it), plus a repair vs MoT split for the summary. Extend `calculations.test.js`.

## Step 5 — MoT and OC/AC expiry
- Schema `Car`: `inspectionValidUntil`, `ocValidUntil`, `acValidUntil` (all `Date?`).
- Server:
  - generalize `PATCH /api/cars/:id` to accept `name`, `purchasePrice` and the three dates, partially: only the fields that are sent change
  - include the dates in `carFields`
  - add `DELETE /api/cars/:id` with cascades
- Client:
  - `client/src/lib/expiry.js`: `getExpiryStatus(dateString, today)` returns `{ daysLeft, level: 'ok' | 'soon' | 'urgent' | 'expired', message }`
  - thresholds: > 30 days ok (green), 8–30 soon (amber), 0–7 urgent (red), < 0 expired (red, "Wygasło X dni temu")
  - Polish plurals via `Intl.PluralRules('pl')` ("za 1 dzień", "za 5 dni")
  - unit tests in `expiry.test.js`, added to the `npm test` script
- UI:
  - the Pulpit shows three expiry tiles (Badanie techniczne / OC / AC) at the top, colored by level with the message. "Brak daty" links to `/auto`.
  - the car switcher shows a red dot when any date is urgent or expired
  - `/auto` has date inputs for all three
  - saving a MoT entry with a next date updates the tile automatically

## Step 6 — Car cover photo and gallery (Supabase Storage)
- Schema:
  - `CarPhoto { id, carId, userId, storagePath, createdAt }`
  - `Car.coverPhotoId Int? @unique` (relation to `CarPhoto`, `onDelete: SetNull`)
- Storage module `server/src/storage.js` with `save(buffer, path)`, `remove(path)` and `publicUrl(path)`:
  - Supabase implementation via `@supabase/supabase-js`, using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Public bucket `car-photos`, with unguessable paths `{userId}/{carId}/{uuid}.webp`.
  - Local fallback when `SUPABASE_URL` is unset: write to `server/uploads/` (gitignored) and serve it via `express.static`. Local dev then needs no Supabase.
- Upload: `POST /api/cars/:id/photos`
  - `multer` memory storage, 15 MB limit, image MIME only
  - `sharp` rotates by EXIF and resizes to max 1600 px as WebP q80, and also writes a 400 px thumbnail
  - max 30 photos per car
  - the first photo becomes the cover automatically
- Other endpoints:
  - `GET /api/cars/:id/photos`
  - `DELETE /api/photos/:id`: deletes the object + row, and clears the cover if needed
  - `PATCH /api/cars/:id` with `{ coverPhotoId }`
  - car responses include `coverUrl` / `coverThumbUrl`
- Client, on `/auto`:
  - the cover hero sits at the top (also used as the Pulpit header background with a purple gradient overlay)
  - a gallery grid with an "Ustaw jako okładkę" / "Usuń" menu per photo
  - a full-screen viewer dialog
  - an upload button using `<input type="file" accept="image/*" multiple>`, so phones offer the camera or gallery, with upload progress
- README: create the bucket, set the env vars on Render.

## Step 7 — Notes per car
- Schema: `Note { id, carId, userId, body String @db.Text, pinned Boolean @default(false), createdAt, updatedAt }`.
- Server: `server/src/routes/notes.js` with `GET ?carId`, `POST`, `PATCH /:id` (body/pinned) and `DELETE /:id`. Ownership is checked through the existing `findOwnedCar` (`server/src/routes/cars.js`). Body is 1–5000 characters.
- Client: the `/notatki` screen lists notes (pinned first, then by `updatedAt` desc) with the first lines visible and a relative date. Tapping a note opens a drawer with a textarea to edit, pin or delete it. The "+" button creates a new note.

## Patterns to reuse
- Route shape: `try/catch` + Polish messages + `requireLogin` + `findOwnedCar` + `deleteMany({ where: { id, userId } })` for owner-safe deletes. Copy this pattern in every new router.
- `toDateString` / `fromDateString` from `server/src/db.js` for all new `@db.Date` fields.
- RTK Query in `client/src/app/api.js`: add tag types `Station`, `Photo`, `Note` and keep the `transformResponse` Decimal → Number pattern.
- Mutation error display: `error?.data?.message || fallback`.

## Verification (per step)
- `npm run dev` at the repo root. Exercise each feature on a 375 px viewport in browser devtools, then on a real phone over the LAN (`vite --host`).
- `npm test --prefix client` covers calculations + expiry. `npm run lint --prefix client`.
- Step 1: the demo admin login still works. Google login creates a user, logging in again reuses it, and the two accounts see separate cars.
- Steps 3–7: create, list and delete each resource. Check that another user's ids return 404 (log in as admin and as a Google user).
- Step 4: existing service entries survive the migration as single "Inne" items with the same totals in the summary.
- Step 6: upload a large phone JPEG. It arrives rotated correctly, as WebP under ~400 KB, and appears in the Supabase bucket (or `server/uploads` locally). Deleting it removes the object.
- After all steps: `npm run build`, then a deploy checklist in the README (new env vars on Render/Pages, the Google OAuth origins, the bucket).
