# Autowydatki

Obliczanie kosztów auta. Paliwo, serwis, spalanie.

## Uruchomienie

Potrzebujesz Node.js i lokalnego PostgreSQL.

1. Utwórz bazę:

```bash
createdb autowydatki
```

2. Skopiuj `server/.env.example` do `server/.env`.
3. W katalogu `server` uruchom `npm install`, a potem `npm run dev` (przy starcie stosuje migracje Prisma). Schemat zmienia się w `server/prisma/schema.prisma` poleceniem `npm run db:migrate`.
4. W katalogu `client` uruchom `npm install`, a potem `npm run dev`.
5. Otwórz http://localhost:5173.

Test obliczeń spalania: w katalogu `client` uruchom `npm test`.

## Wdrożenie produkcyjne

Baza: Supabase, API: Render, frontend: Cloudflare Pages.

1. **Supabase** – utwórz projekt i skopiuj connection string (Session pooler) z *Project Settings → Database*. Tabele tworzą się automatycznie przy starcie API (`prisma migrate deploy` w `npm start`), a konto administratora zakłada się po migracji.
2. **Render** – Web Service z katalogu `server` (Build: `npm install`, Start: `npm start`, Health check: `/health`). Zmienne środowiskowe (wzór w `server/.env.example`):
   - `DATABASE_URL` – connection string z Supabase (bez `DATABASE_SSL`)
   - `JWT_SECRET` – długi losowy sekret
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   - `CORS_ORIGIN` – adres frontendu, np. `https://autowydatki.pages.dev`
3. **Cloudflare Pages** – katalog główny `client`, Build: `npm run build`, Output: `dist`. Zmienna `VITE_API_URL` = adres API z Render (bez końcowego `/`; wzór w `client/.env.example`). Zmienna jest wkompilowana w build, więc po zmianie trzeba zbudować frontend ponownie.

## Logowanie

Konto administratora jest tworzone przy pierwszym starcie serwera.

- Email: `admin@autowydatki.pl`
- Hasło: `autowydatki`

Te same dane są na stronie logowania. Hasło jest publiczne, żeby rekruter mógł otworzyć aplikację. Sekret do podpisywania tokenu zostaje w `server/.env`.
