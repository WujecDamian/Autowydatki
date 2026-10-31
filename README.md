# Autowydatki

Aplikacja webowa do liczenia kosztów utrzymania auta: tankowania, spalanie, serwisy, terminy OC/przeglądu i zdjęcia. Projekt full-stack napisany samodzielnie, wdrożony produkcyjnie.

![Autowydatki demo](docs/demo.gif)

**Demo:** logowanie `admin@autowydatki.pl` / `autowydatki` (konto publiczne, dane testowe) lub przez Google.

## Co potrafi

- Wiele aut na jednym koncie, osobne tankowania benzyny i LPG, spalanie i koszt na 100 km. Auta elektryczne mają ładowania w kWh, sieci ładowarek i zużycie w kWh/100 km.
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
- Logowanie zawsze wykonuje `bcrypt.compare` (także dla nieznanego emaila), więc czas odpowiedzi nie zdradza, które konta istnieją.
- `DEMO_READ_ONLY=true` zamienia publiczne konto demo w konto tylko do odczytu. `DATABASE_CA` włącza weryfikację certyfikatu bazy.
- Frontend: `client/public/_headers` ustawia CSP, HSTS i pozostałe nagłówki bezpieczeństwa na Cloudflare Pages.
- Nieudane logowania i trafienia w rate limit trafiają do logów z polem `event` (`login_failed`, `rate_limited`), pod alerty w usłudze logów.
- `/health` sprawdza także bazę danych (pod monitoring).

## Jak chronię aplikację przed OWASP TOP 10

Lista zgodna z OWASP Top 10:2025.

| # | Zagrożenie | Co robię |
|---|---|---|
| A01 | Broken Access Control | każde zapytanie do bazy jest filtrowane po `userId`, a testy sprawdzają, że jeden użytkownik nie odczyta, nie zmieni ani nie usunie danych drugiego. |
| A02 | Security Misconfiguration | `helmet`, CORS ograniczony do adresu frontendu, nagłówki CSP i HSTS w `_headers`, a serwer nie wystartuje w produkcji ze słabym `JWT_SECRET` lub bez `CORS_ORIGIN`. |
| A03 | Software Supply Chain Failures | zależności są przypięte w `package-lock.json`, instalowane przez `npm ci`, sprawdzane `npm audit`, a Dependabot co tydzień zgłasza aktualizacje. |
| A04 | Cryptographic Failures | hasła są hashowane bcryptem, ruch idzie przez HTTPS, połączenie z bazą jest szyfrowane TLS (z weryfikacją certyfikatu po ustawieniu `DATABASE_CA`), a JWT jest podpisany długim sekretem. |
| A05 | Injection | Prisma wysyła zapytania parametryzowane, zod waliduje każde żądanie, a React domyślnie escapuje wyświetlane dane (brak `dangerouslySetInnerHTML`). |
| A06 | Insecure Design | walidacja działa w trzech warstwach (przeglądarka, zod, `CHECK` w bazie), API ma rate limiting, a konto demo można przełączyć w tryb tylko do odczytu (`DEMO_READ_ONLY`). |
| A07 | Authentication Failures | logowanie ma limit 20 prób na 15 minut, identyczny błąd i czas odpowiedzi dla złego hasła i nieznanego emaila, a tokeny Google są weryfikowane po stronie serwera. |
| A08 | Software or Data Integrity Failures | aplikacja nie deserializuje niezaufanych danych, zdjęcia są ponownie kodowane przez `sharp`, a migracje bazy i testy przechodzą przez CI przy każdym pull requeście. |
| A09 | Security Logging and Alerting Failures | każde żądanie trafia do logów (pino) z `X-Request-Id`, tokeny są ukrywane, a nieudane logowania i trafienia w rate limit mają pole `event` pod alerty. |
| A10 | Mishandling of Exceptional Conditions | jeden globalny handler zwraca błędy w jednym formacie bez szczegółów technicznych, a `ErrorBoundary` w Reakcie łapie awarie interfejsu. |

## Testy i CI

| Rodzaj | Narzędzia | Co sprawdza |
|---|---|---|
| Jednostkowe | Node test runner | Schematy walidacji, obliczenia spalania i kosztów, formatowanie |
| API (integracyjne) | supertest + prawdziwa baza PostgreSQL | Logowanie, sfałszowany i wygasły token, dostęp do cudzych danych, błędne dane (zawsze 400, nigdy 500), ograniczenia bazy, rate limit |
| Komponentowe | Vitest + Testing Library | Błędy pod polami, `ErrorBoundary`, formularz dodawania auta z podmienionym `fetch` |

**GitHub Actions** przy każdym pull requeście: walidacja Prisma, migracje na tymczasowym PostgreSQL, wszystkie testy, lint i build frontendu. **Dependabot** co tydzień zgłasza aktualizacje zależności.
Testy API odmawiają uruchomienia na bazie, której nazwa nie kończy się na `_test`.
