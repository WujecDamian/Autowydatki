# Production-readiness work: what was done, how, and why

Written for a junior developer who wants to understand the concepts, not just see the diff.
Everything here is uncommitted on the `redesign` branch. Read it top to bottom once, then use it as a reference.

## The big idea

A hobby app works when you use it carefully. A production app has to keep working when:

1. **Users make mistakes** (typing `-5` litres, a date in the year 3000).
2. **Attackers try things** (guessing passwords, sending crafted requests).
3. **Things break** (database down, network drops, a bug) and you need to *know*.
4. **You change code** and need to be sure you did not break something old.

Each part of this work answers one of those four, in this order:

| Goal | What we added |
|---|---|
| Stop bad input | Validation on the server (zod) and the browser, plus database constraints |
| Stop attackers | Rate limiting, security headers, startup checks for secrets, logout on expired token |
| Know when it breaks | One error format, a global error handler, request logging with ids, a health check that checks the database, an error boundary in React |
| Safe to change | Automated tests (unit, API, database) and CI that runs them on every pull request |

## Concept 1: Never trust the browser (validation in layers)

The browser can be bypassed. Anyone can send a request with `curl` and skip your form. So validation is done in **three layers**, each catching what the previous one missed:

1. **Browser (UX).** Fast feedback: `min`, `max`, `required` on inputs, and field errors shown under the input. This is for *helping honest users*. It is not security.
2. **Server (the real gate).** Every request body is checked with a schema before touching the database. This is the layer that actually protects you.
3. **Database (last line of defence).** `CHECK` constraints. If a bug or a script skips the API, the database still refuses nonsense like `liters = 5000`.

### Server validation with zod (`server/src/schemas.js`)

A **schema** is a description of what valid data looks like. zod checks data against it and either gives you clean data or a list of problems.

```js
export const fuelSchema = z.object({
  liters: numberField("Litry muszą być większe od 0.").pipe(
    z.number().gt(0, "Litry muszą być większe od 0.").max(2000, "...")
  ),
  ...
});
```

Why this is better than the old hand-written `readFuelBody`:
- **One place** describes the rules. Before, every route had its own `if` chains, and they drifted apart.
- **Parse, don't validate.** `fuelSchema.parse(body)` returns a *clean* object (numbers are real numbers, text is trimmed, blank station becomes `null`). The route then uses the clean object and never touches `req.body` fields again.
- **Many errors at once.** zod reports every wrong field, so the form can mark all of them.

Details worth understanding:
- **Strict numbers.** JavaScript's `Number("1e3")` is `1000` and `Number("")` is `0`. That is how bad data sneaks in. `plainNumber` only accepts plain digits like `12`, `12.5` or `"12,5"` (Polish decimal comma), and turns everything else into `NaN`, which then fails.
- **Upper bounds.** The database column `DECIMAL(8,2)` cannot hold huge numbers. Before, a huge value caused a database error and a 500 ("our fault"). Now it is a 400 ("your input is wrong") with a clear message. The limits live in the `limits` object in one place.
- **Dates.** `isRealDate` rejects `2026-02-30`. Fuel and service dates cannot be in the future (one day of slack for time zones). Expiry dates (OC, inspection) *can* be in the future, so they use a different rule.
- **`parseId`.** Route ids (`/api/fuel/abc`) must be positive integers, otherwise a 400 `BAD_ID`.
- **Unknown fields are dropped.** `z.object` strips keys it does not know, so a client cannot sneak in extra fields (for example `userId`).

### Database constraints (`migrations/20261030020000_limits_and_indexes`)

Added `CHECK` constraints for upper bounds. They are created `NOT VALID`, which means "enforce on every new or changed row, but do not scan old rows". That makes the migration safe even if old data would break the rule. It also adds two indexes, so listing one car's entries newest first stays fast as data grows.

## Concept 2: One error format, handled in one place

**Before:** every route had its own `try { ... } catch { console.error; res.status(500)... }`. Copy-pasted 30+ times, and anything *outside* a route (bad JSON, unknown URL, upload errors) returned Express's default **HTML** error page, which the frontend cannot read.

**Now** (`server/src/errors.js`): routes just *throw*. Express 5 sends thrown and rejected errors to one **error-handling middleware** (a function with four arguments: `error, req, res, next`). It turns every kind of error into the same JSON:

```json
{ "message": "Litry muszą być większe od 0.", "code": "VALIDATION", "fields": { "liters": "..." } }
```

| Error | Status | `code` |
|---|---|---|
| Wrong field value (zod) | 400 | `VALIDATION` (+ `fields`) |
| Malformed JSON | 400 | `BAD_JSON` |
| Bad `:id` | 400 | `BAD_ID` |
| Not an image / too big | 400 / 413 | `NOT_AN_IMAGE`, `UPLOAD` |
| Unknown URL | 404 | `NOT_FOUND` |
| Duplicate / bad reference (Prisma P2002/P2003) | 409 / 400 | `DUPLICATE`, `BAD_REFERENCE` |
| Too many attempts | 429 | `RATE_LIMITED` |
| Anything unexpected | 500 | `INTERNAL` (logged, details **not** sent to the user) |

Why hide details on 500? Error messages can reveal table names, file paths, library versions. The user gets a friendly sentence; you get the real error in the logs.

`HttpError` is a small class for expected failures: `throw new HttpError(400, "message", "CODE")`.

## Concept 3: Security hardening

| Change | Why it matters |
|---|---|
| **Rate limiting** (`rateLimit.js`): 20 logins per 15 min per IP, 300 API requests per minute | Your demo password is public, so without this anyone can brute-force or spam. A limiter counts requests per IP and answers `429`. It is stored in memory, which is fine for one server instance (with several instances you would use a shared store like Redis). |
| **`helmet`** | Adds protective HTTP headers (`X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, ...). One line, many small attacks closed. |
| **Body size limit** (100kb) | Stops someone sending a 1 GB JSON body to exhaust memory. |
| **`env.js`**: fail fast on bad config | If `JWT_SECRET` is missing or weak in production, the app **refuses to start** instead of running insecurely. A crash at deploy time is far better than a silent vulnerability. |
| **Logout on 401** (client) | When the 7-day token expires, every request returns 401. Before, the user saw errors everywhere. Now the app logs out and shows the login page, and clears cached API data so the next person on that browser cannot see it. |
| **Photo upload** | Non-image files now get a clear 400. (`sharp` already re-encoded images, which strips anything dangerous hidden in the file.) |
| **Login input limits** | Passwords over 200 characters are rejected: bcrypt only uses the first 72 bytes and long inputs just waste CPU. |
| **Same error for wrong password and unknown email** | So an attacker cannot learn which emails have accounts. |

What was already good: every query is scoped by `userId` (so users cannot read each other's data), and Prisma uses parameterized queries (no SQL injection).

## Concept 4: Seeing failures

- **Request logging (`server/src/logger.js`, pino).** Every request is logged as one JSON line (method, URL, status, duration). Each gets a request id, which is also returned in the `X-Request-Id` response header, so when a user reports "it failed", you can search the logs for that id and find the exact error. The `Authorization` header is redacted so tokens never reach the logs, and `/health` is not logged (monitors hit it constantly). Logs as JSON are what log tools (Render, Datadog, Better Stack) expect.
- **`/health`** now runs `SELECT 1` against the database and returns 503 if it fails. A monitoring service (UptimeRobot, Render health checks) can then tell "server up but database down" from "all fine".
- **Network errors.** When the browser cannot reach the server, RTK Query reports `status: "FETCH_ERROR"`. `errorText` (`client/src/lib/format.js`) turns that into "Brak połączenia z serwerem...".
- **Field errors.** `Field` takes an `error` prop and shows it under the input, linked with `aria-describedby` so screen readers read it. `aria-invalid` marks the input. All forms now use it: fuel, service, add car and car details (notes is a single text box, so it shows its message below). The helper `formErrors(error, fallback, shownFields)` in `client/src/lib/format.js` decides what to show: if the API complained only about fields that have an input, each message appears under its input; if it complained about something else (for example one item inside a service), the general message appears above the button so the error is never swallowed.
- **Exact money.** `0.1 + 0.2` is `0.30000000000000004` in JavaScript because computers store decimals in binary. `sumMoney` and `roundMoney` in `client/src/calculations.js` add amounts in whole grosze (integers are exact) and convert back, so totals on the dashboard are always what a person would add up on paper. The server already did this for service totals, the database stores `DECIMAL`.
- **`ErrorBoundary`.** If a React component throws while rendering, React unmounts the whole app: a blank white page. An *error boundary* catches that and shows "Coś poszło nie tak" with a retry button. React only supports error boundaries as **class components**, which is why that file uses a class. `RouteError` does the same for errors inside routes.

## Concept 5: Tests (so you can change code without fear)

There are three kinds, from cheapest to most realistic:

1. **Unit tests** (`server/src/schemas.test.js`, `client/src/lib/format.test.js`). Test one function with no database. Fast. Example: "`'1e3'` is rejected as an odometer".
2. **API tests** (`server/test/api.test.js`, 53 tests, using `supertest`). Start the real Express app and send real HTTP requests to a **real test database**. They check:
   - login: right password, wrong password, tampered / forged / expired token
   - **ownership (IDOR):** user B cannot read, edit or delete user A's data (the most common real-world API bug)
   - validation: every bad payload returns a 400 naming the field, never a 500
   - the database constraints reject bad rows even when the API is skipped
   - rate limiting returns 429, and every response carries a request id
3. **Component tests** (`client/src/components/**/*.component.test.jsx`, Vitest + Testing Library, `npm run test:components`). Render a React component in a fake browser (jsdom), interact like a user (type, click) and check what is on screen. They cover `Field` (error shown and linked), `ErrorBoundary` (a crash shows a message, not a blank page) and `AddCarForm` end to end with a faked `fetch` (sends the token, shows a server field error under the right input, explains a network failure). Faking `fetch` means these tests need no server. The client has two test runners on purpose: the built-in `node --test` for pure logic (`npm test`, no dependencies) and Vitest only where a DOM is needed.
4. **End-to-end tests** (a real browser clicking through the real app and server). **Not done**, see below.

Safety design you should copy: `server/test/setup.js` **refuses to run** unless the database name ends in `_test`, because these tests create and delete rows. It also forces `SUPABASE_URL` empty so tests can never upload to the real photo bucket. `supertest` calls `app` directly, so `app.js` (the app) was split from `index.js` (which calls `listen`); that split is what makes the app testable.

Run them:
```bash
cd server && npm test                                   # unit, no database
TEST_DATABASE_URL=postgres://.../autowydatki_test npm run test:api
cd client && npm test && npm run test:components && npm run lint
```
A throwaway database `autowydatki_test` was created in your local Postgres and migrated. Your real database was not touched by any test.

## Concept 6: CI (Continuous Integration)

`.github/workflows/ci.yml` tells GitHub to run, on every pull request: install, `prisma validate`, migrations on a temporary Postgres, server unit tests, API tests, then client lint, tests and build. A red check means "do not merge". It catches "works on my machine" problems. `dependabot.yml` opens weekly pull requests to update dependencies (security fixes included).

One gotcha found while testing a clean install: `prisma generate` (run by `postinstall`) needs `DATABASE_URL` to exist, even though it does not connect. The CI file sets it.

## File map

**Server**
- `src/env.js`: reads and validates environment variables once; everything else imports `env`.
- `src/schemas.js`: all validation rules and the limits.
- `src/errors.js`: `HttpError`, 404 handler, global error handler.
- `src/rateLimit.js`: the limiters.
- `src/logger.js`: pino request logging with request ids.
- `src/app.js` / `src/index.js`: the Express app / starting the server.
- `src/routes/*.js`: now short; no `try/catch`, they call `schema.parse(...)`.
- `prisma/migrations/20261030020000_limits_and_indexes`: constraints and indexes.
- `test/setup.js`, `test/api.test.js`, `src/schemas.test.js`: tests.

**Client**
- `src/app/api.js`: wraps requests so a 401 logs out.
- `src/lib/session.js`, `limits.js`, `format.js` (`errorText`, `fieldError`, `formErrors`): small pure helpers (easy to test).
- `src/calculations.js`: `sumMoney` / `roundMoney` for exact totals.
- `src/components/Field`, `FuelSection`, `ServiceForm`, `AddCarForm`, `CarDetails`: field errors; `ErrorBoundary`; `App.jsx` wires it in.
- `src/test/setup.js`, `*.component.test.jsx`, and the `test` block in `vite.config.js`: component tests.

**Repo:** `.github/workflows/ci.yml`, `.github/dependabot.yml`, README sections "Testy" and "Produkcja".

## Read this before deploying

1. **`JWT_SECRET` must be at least 32 characters and must not start with `dev-only`, and `CORS_ORIGIN` must be set**, whenever `NODE_ENV=production` (Render sets that). If your current production secret is shorter, the new version will refuse to start. Change it first (this logs everyone out once).
2. **The new migration runs on the next deploy** (`npm start` runs `prisma migrate deploy`). It is written to be safe on existing data, but back up first if you can.
3. **Behaviour changes users may notice:** future dates for fuel and service entries are now rejected; a request with an invalid id now returns 400 instead of 404; the unit/field limits above apply.
4. **Not verified in a browser.** The client builds, lints and its unit tests pass, but I did not click through the UI. Do a quick manual pass: add a fuel entry with a bad value and check the message appears under the field; sign in, then delete your token's validity (or wait) and confirm you land on the login page.

## What is NOT done yet (and why)

Everything that did not need an account, a dashboard or a decision from you is now done. What remains:

| Item | Why it is left | What you need to do |
|---|---|---|
| **Database certificate verification** | Built as opt-in: set `DATABASE_CA` and the server verifies the certificate; without it the connection is encrypted but not verified (a warning is logged in production). | Download the CA certificate from the Supabase dashboard (Database settings) and put its text in `DATABASE_CA` on Render. |
| **Sentry or another error tracker** | Needs an account and a DSN. | Create a project, then call `Sentry.init` on the server and in `main.jsx`; send errors from `errorHandler` and `ErrorBoundary.componentDidCatch`, the two places already prepared. |
| **Playwright end-to-end test** | Needs a running server plus database plus built client in CI, and credentials for a test user; a bigger setup than the rest. | Worth adding once the basics have been running for a while. |
| **Moving `prisma migrate deploy` out of `npm start`** | Depends on your Render settings (changing it blindly could stop deploys from migrating). It is only a problem with more than one instance. | Put it in Render's build or pre-deploy command and change `start` to `node src/index.js`. |
| **Demo account and token storage** | Product decisions: should the public demo be read-only or reset daily? Should the token move from localStorage to an httpOnly cookie (safer against XSS, but needs CSRF protection)? | Decide, then ask for it. |
| **Odometer must not decrease** | A business rule: warn or block? Cars can be sold, odometers replaced, entries added out of order. | Decide the behaviour. |
| **Backups, uptime monitor, staging environment** | Configured in Supabase, UptimeRobot and Render dashboards, not in code. | Point the monitor at `/health`; test a restore once. |

## Known issue

While running the final checks, one API test failed once out of about 30 runs, and I could not reproduce it (including under CPU load) or identify which test it was. If a CI run ever fails the same way, rerun it and look at the test name: a test that sometimes fails is called a **flaky test**, and the fix is to find the shared state or timing assumption behind it, not to just retry.

## Glossary

- **Middleware:** a function that runs on every request before your route (parse JSON, check token, limit rate).
- **Schema:** a declarative description of valid data.
- **IDOR:** accessing another user's object by guessing its id. Prevented by always filtering by the logged-in `userId`.
- **Rate limiting:** capping how often one client may call an endpoint.
- **Idempotent / migration:** a migration is a versioned SQL script that changes the database structure; `migrate deploy` applies the ones not yet applied.
- **CHECK constraint:** a rule the database enforces on every row.
- **CI:** a server that runs your tests automatically on every change.
- **HTTP 400 / 401 / 404 / 409 / 429 / 500:** your input is wrong / not logged in / not found / conflict / slow down / our bug.
