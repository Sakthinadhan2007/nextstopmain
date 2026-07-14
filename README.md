# StopMate

Chennai-focused travel wake-up reminder app for bus, train, metro, and custom stops.

## What was updated

- Black-and-white dark theme UI with fixed top navbar and mobile-first layout.
- Home page now has 4 separate containers: Bus, Train, Metro, Custom.
- Full-page mode views for Bus/Train/Metro/Custom with fullscreen OpenStreetMap.
- Route discovery flow with start point search, route selection, and destination wake-up alert.
- Mode-specific pre-alert distances:
  - Bus: 400-600m (default 500m)
  - Metro: 700-900m (default 800m)
  - Train: fixed 600m
- Loud alarm loop + instant `DISABLE ALARM` control.
- Custom stops support add/edit/delete and quick delete all.
- Separate `Routes List` page grouped by Bus/Train/Metro.
- Offline cache fallback for routes, alerts, custom stops, and proximity checks.
- PWA-ready service worker, install prompt, and offline shell caching.

## Stack

- Frontend: React + Vite + Leaflet + OpenStreetMap
- Backend: Express + TypeScript
- Contracts: Zod (`shared/routes.ts`)
- SQL/Drizzle schema: `shared/schema.ts`

## Environment

Copy `.env.example` to `.env` and set:

- `HOST=0.0.0.0`
- `PORT=8787`
- `DATABASE_URL=postgres://postgres:postgres@localhost:5432/next_stop`
- `VITE_API_URL=` (leave empty in local dev to use Vite proxy)

For Render deployment, set `VITE_API_URL=https://<your-render-backend-domain>` in Vercel or frontend environment.

## Run locally

1. `npm install`
2. `npm run dev:server`
3. `npm run dev:client`
4. Open `http://localhost:5173`

## Deploy

### Frontend (Vercel)

1. Import this repo into Vercel.
2. Build settings:
   - build command: `npm run build`
   - output directory: `dist`
3. Set environment variable:
   - `VITE_API_URL=https://<your-render-domain>`
4. Deploy and confirm:
   - `POST https://<your-vercel-domain>/api/auth/sign-in`
   - `GET https://<your-vercel-domain>/health`

### Backend (Render)

1. Import this repo into Render.
2. Use the provided `render.yaml` to configure the backend service.
3. Render build command: `npm run build:server`
4. Render start command: `npm run start`
5. Add Render environment variables:
   - `PORT=10000`
   - `HOST=0.0.0.0`
   - `NODE_ENV=production`
   - `DATABASE_URL=<your-postgres-url>`
6. Verify backend health at:
   - `GET https://<your-render-domain>/health`

## Render configuration

- A `render.yaml` file is included for backend deployment.
- The backend runs as a Node web service on Render.

## PWA

- Install from browser menu: Add to Home Screen.
- Service worker caches app shell, offline assets, and alarm audio.
- The app supports offline use for cached routes and alerts.

## SQL Deliverable

- Transport-specific schema: `docs/chennai_transport_schema.sql`

## Android Widget Concept

- Widget integration plan: `docs/android-widget-concept.md`
