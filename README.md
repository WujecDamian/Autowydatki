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
   - `GOOGLE_CLIENT_ID` – ID klienta OAuth (patrz niżej)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` – przechowywanie zdjęć (patrz niżej)
3. **Cloudflare Pages** – katalog główny `client`, Build: `npm run build`, Output: `dist`. Zmienna `VITE_API_URL` = adres API z Render (bez końcowego `/`; wzór w `client/.env.example`) oraz `VITE_GOOGLE_CLIENT_ID` = to samo ID co `GOOGLE_CLIENT_ID`. Zmienne są wkompilowane w build, więc po zmianie trzeba zbudować frontend ponownie.

## Logowanie

Konto administratora jest tworzone przy pierwszym starcie serwera.

- Email: `admin@autowydatki.pl`
- Hasło: `autowydatki`

Te same dane są na stronie logowania. Hasło jest publiczne, żeby rekruter mógł otworzyć aplikację. Sekret do podpisywania tokenu zostaje w `server/.env`.

### Logowanie przez Google

1. W [Google Cloud Console](https://console.cloud.google.com/apis/credentials) utwórz *OAuth client ID* typu **Web application**.
2. W *Authorized JavaScript origins* dodaj `http://localhost:5173` oraz adres frontendu (np. `https://autowydatki.pages.dev`). Redirect URI nie jest potrzebny.
3. Wpisz ID klienta jako `GOOGLE_CLIENT_ID` w `server/.env` i jako `VITE_GOOGLE_CLIENT_ID` w `client/.env`.

Bez tych zmiennych przycisk Google się nie pokazuje, a logowanie emailem działa dalej. Konto Google z tym samym potwierdzonym adresem co istniejące konto zostaje z nim połączone.

### Zdjęcia aut (Supabase Storage)

1. W Supabase: *Storage → New bucket*, nazwa `car-photos`, zaznacz **Public bucket**.
2. Z *Project Settings → Data API* skopiuj **Project URL** (bez `/rest/v1/`), a z *Project Settings → API Keys* klucz **secret** (albo `service_role` w starszych projektach).
3. Wpisz je w `server/.env` (wzór w `server/.env.example`) i w zmiennych środowiskowych na Render. Klucz nigdy nie trafia do `client/.env`.

Bez `SUPABASE_URL` zdjęcia zapisują się lokalnie w `server/uploads/` i są serwowane przez API pod `/api/uploads` – wygodne w developmencie, ale na Render pliki zniknęłyby przy każdym wdrożeniu.

Serwer obraca zdjęcia według EXIF, zmniejsza je do 1600 px (WebP) i robi miniaturę 400×400. Format HEIC z iPhone'a nie jest obsługiwany przez serwer; Safari przy wyborze zdjęcia z galerii zwykle sam zamienia je na JPEG.
