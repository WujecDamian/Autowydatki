# Wdrożenie i uruchamianie testów

## Wdrożenie

Baza: Supabase, API: Render (`npm start` stosuje migracje, health check `/health`), frontend: Cloudflare Pages (`npm run build`, katalog `dist`).
Zmienne środowiskowe opisują pliki `server/.env.example` i `client/.env.example`. Najważniejsze:

- Serwer: `DATABASE_URL`, `JWT_SECRET` (min. 32 znaki), `CORS_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, opcjonalnie `DATABASE_CA`, `LOG_LEVEL`.
- Klient (wkompilowane w build): `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`.

Logowanie Google: w Google Cloud Console utwórz *OAuth client ID* (Web application), dodaj adresy frontendu do *Authorized JavaScript origins*. Bez tych zmiennych przycisk Google się nie pokazuje.
Zdjęcia: w Supabase utwórz publiczny bucket `car-photos`. Bez `SUPABASE_URL` zdjęcia zapisują się lokalnie w `server/uploads/` (tylko do developmentu).

## Testy lokalnie

```bash
cd client && npm test && npm run test:components && npm run lint
cd server && npm test                                  # bez bazy
createdb autowydatki_test && DATABASE_URL=postgres://localhost:5432/autowydatki_test npx prisma migrate deploy
cd server && TEST_DATABASE_URL=postgres://localhost:5432/autowydatki_test npm run test:api
```
