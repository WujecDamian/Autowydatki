# Autowydatki

Aplikacja webowa do liczenia kosztów utrzymania auta: tankowania, spalanie, serwisy, terminy OC/przeglądu i zdjęcia. Projekt full-stack napisany samodzielnie, wdrożony produkcyjnie.

**Demo:** logowanie `admin@autowydatki.pl` / `autowydatki` (konto publiczne, dane testowe) lub przez Google.

## Co potrafi

- Wiele aut na jednym koncie, osobne tankowania benzyny i LPG, spalanie i koszt na 100 km.
- Serwisy z listą pozycji i sumą kosztów, wykresy miesięcznych wydatków i trendu cen paliwa.
- Przypomnienia o wygasającym OC, AC i przeglądzie, notatki, zdjęcia aut (automatyczne skalowanie i miniatury).
- Logowanie emailem i hasłem albo kontem Google.

## Technologie

| Warstwa | Stack |
|---|---|
| Frontend | React 19, Vite, Redux Toolkit (RTK Query), React Router, Tailwind CSS 4, shadcn/ui |
| Backend | Node.js 22, Express 5, Passport (JWT), zod |
| Baza danych | PostgreSQL, Prisma ORM (migracje w repozytorium) |
| Pliki | Supabase Storage, `sharp` (obracanie wg EXIF, WebP, miniatury) |
| Hosting | Cloudflare Pages (frontend), Render (API), Supabase (baza i zdjęcia) |
| Jakość | Node test runner, Vitest, Testing Library, supertest, oxlint, GitHub Actions, Dependabot |

## Jak przepływają dane

```
Przeglądarka (React + RTK Query)
   │  HTTPS, JSON, nagłówek Authorization: Bearer <JWT>
   ▼
Express: logger → helmet → CORS → limit body → rate limit → JWT → walidacja zod → trasa
   │  Prisma (zapytania parametryzowane, zawsze filtrowane po userId)
   ▼
PostgreSQL (ograniczenia CHECK, indeksy)        Supabase Storage (zdjęcia)
```

1. Logowanie (hasło lub token Google) zwraca JWT ważny 7 dni. Klient dołącza go do każdego żądania.
2. Serwer sprawdza token, waliduje dane schematem zod i dopiero wtedy zapisuje je przez Prisma.
3. Każdy błąd wraca w jednym formacie `{ message, code, fields }`, a formularze pokazują komunikat pod właściwym polem.
4. Wygasły token (401) automatycznie wylogowuje użytkownika i czyści dane z pamięci podręcznej.

## Walidacja

Trzy warstwy, każda łapie to, co przepuściła poprzednia:

1. **Przeglądarka:** atrybuty pól i komunikaty pod polami (wygoda użytkownika, nie zabezpieczenie).
2. **Serwer (zod):** każde żądanie jest sprawdzane przed zapisem. Ścisłe liczby (`"1e3"` odrzucone, przecinek dziesiętny przyjęty), limity wartości, nieistniejące daty, brak dat z przyszłości, nieznane pola są wycinane.
3. **Baza:** ograniczenia `CHECK` i indeksy dodane migracją, więc nawet pominięcie API nie wpuści błędnych danych.

Kwoty liczone są w groszach (liczby całkowite), żeby uniknąć błędów typu `0.1 + 0.2`.

## Bezpieczeństwo

- Hasła hashowane **bcrypt**, JWT, identyczny błąd dla złego hasła i nieznanego emaila (brak wycieku, które konta istnieją).
- **Izolacja danych:** każde zapytanie filtrowane po `userId`, sprawdzone testami (użytkownik B nie odczyta, nie zmieni ani nie usunie danych użytkownika A).
- **Rate limiting:** 20 prób logowania / 15 min na IP, 300 żądań API / min.
- **helmet** (nagłówki bezpieczeństwa), CORS ograniczony do adresu frontendu, limit rozmiaru body, filtr typów i rozmiaru plików.
- Prisma (brak SQL injection), `sharp` ponownie koduje zdjęcia (usuwa ukryte dane z pliku).
- Serwer **nie uruchomi się** w produkcji ze słabym `JWT_SECRET` lub bez `CORS_ORIGIN`.
- Błędy 500 nie ujawniają szczegółów użytkownikowi, a w logach (pino, JSON) każde żądanie ma `X-Request-Id`, token jest ukrywany.
- `/health` sprawdza także bazę danych (pod monitoring).

## Testy i CI

| Rodzaj | Narzędzia | Co sprawdza |
|---|---|---|
| Jednostkowe | Node test runner | Schematy walidacji, obliczenia spalania i kosztów, formatowanie |
| API (integracyjne) | supertest + prawdziwa baza PostgreSQL | Logowanie, sfałszowany i wygasły token, dostęp do cudzych danych, błędne dane (zawsze 400, nigdy 500), ograniczenia bazy, rate limit |
| Komponentowe | Vitest + Testing Library | Błędy pod polami, `ErrorBoundary`, formularz dodawania auta z podmienionym `fetch` |

**GitHub Actions** przy każdym pull requeście: walidacja Prisma, migracje na tymczasowym PostgreSQL, wszystkie testy, lint i build frontendu. **Dependabot** co tydzień zgłasza aktualizacje zależności.
Testy API odmawiają uruchomienia na bazie, której nazwa nie kończy się na `_test`.

## Uruchomienie lokalne

Wymagane: Node.js 22+ i PostgreSQL.

```bash
createdb autowydatki
cp server/.env.example server/.env        # uzupełnij zmienne
cd server && npm install && npm run dev   # stosuje migracje i startuje API
cd client && npm install && npm run dev   # http://localhost:5173
```

Testy:

```bash
cd client && npm test && npm run test:components && npm run lint
cd server && npm test                                  # bez bazy
createdb autowydatki_test && DATABASE_URL=postgres://localhost:5432/autowydatki_test npx prisma migrate deploy
cd server && TEST_DATABASE_URL=postgres://localhost:5432/autowydatki_test npm run test:api
```

## Wdrożenie

Baza: Supabase, API: Render (`npm start` stosuje migracje, health check `/health`), frontend: Cloudflare Pages (`npm run build`, katalog `dist`).
Zmienne środowiskowe opisują pliki `server/.env.example` i `client/.env.example`. Najważniejsze:

- Serwer: `DATABASE_URL`, `JWT_SECRET` (min. 32 znaki), `CORS_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, opcjonalnie `DATABASE_CA`, `LOG_LEVEL`.
- Klient (wkompilowane w build): `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`.

Logowanie Google: w Google Cloud Console utwórz *OAuth client ID* (Web application), dodaj adresy frontendu do *Authorized JavaScript origins*. Bez tych zmiennych przycisk Google się nie pokazuje.
Zdjęcia: w Supabase utwórz publiczny bucket `car-photos`. Bez `SUPABASE_URL` zdjęcia zapisują się lokalnie w `server/uploads/` (tylko do developmentu).

Logo stacji paliw pochodzą z oficjalnych stron marek i służą wyłącznie do rozpoznania stacji.

## Świadome ograniczenia

Nie ma jeszcze testów end-to-end (Playwright) ani zewnętrznego śledzenia błędów (Sentry); token JWT jest w `localStorage`, a limity zapytań są w pamięci jednej instancji. Szczegóły i uzasadnienia: [docs/production-readiness-summary.md](docs/production-readiness-summary.md).
