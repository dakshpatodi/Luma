# Luma

Luma is a privacy-first, local photo-library MVP. It demonstrates the product flow around finding a person’s photos: a gallery, people views, confirmed results, an uncertain-match review queue, and clear data controls.

## What works

- Upload image files directly into the browser
- Persist uploaded images and review decisions in SQLite through a local FastAPI service
- Fall back to browser storage if the API is not running
- Browse and search the library
- Filter confirmed photo tags by person
- Review simulated possible matches with **Yes, it’s me**, **Not me**, or **Not sure**
- Inspect photo details and reset all local data

## Important limitation

Match labels are simulated sample data. Luma does **not** run face recognition, send images to an external service, or use an AI model yet.

## Run locally

Open two PowerShell terminals in this project folder.

**Terminal 1 — API and SQLite database**

```powershell
npm run api:dev
```

**Terminal 2 — React app**

```powershell
npm run dev
```

Then open the local address printed by Vite, usually `http://localhost:5173`. The top-right indicator should say **API connected**.

To run only the frontend, start `npm run dev`; Luma switches to browser-only fallback mode.

## Project structure

```text
src/
  App.tsx       Main screen and user interactions
  api.ts         Frontend functions that call the backend
  App.css       Responsive visual design
  data.ts       Sample people and photos
  storage.ts    Browser local-storage helpers
  types.ts      Shared TypeScript data types
server/
  app/          FastAPI routes and SQLite data layer
  tests/        API tests
```

## Future milestones

1. Add a FastAPI backend and real image storage.
2. Move photo records from local storage to SQLite/PostgreSQL.
3. Add accounts, library/event permissions, and consent controls.
4. Integrate a consent-gated face embedding provider in a background worker.
5. Calibrate matching thresholds using consented test data and retain human review for uncertain results.
