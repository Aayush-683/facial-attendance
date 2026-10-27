# Facial Attendance

Tablet kiosk: employee taps **Mark Attendance**, types their roll number, the front camera waits for a face, counts 3-2-1, flashes the screen white and takes the photo. Admin panel at `/admin` manages employees, shifts, attendance stats and storage.

Stack (all free tier): Vite + React, Vercel serverless functions (`api/`), Neon Postgres, Vercel Blob for photos, MediaPipe face detection in the browser, Vercel Cron for cleanup.

## Rules

- One attendance per roll number per shift day (`unique (employee_id, shift_date)`).
- Can only mark between `shift start − early minutes` and `shift end`. Configurable under **Shifts**.
- A night shift crossing midnight counts for the day it **started** (9 pm Mon to 6 am Tue = Monday).
- Photos are auto-deleted after 90 days and records after 365 days (nightly cron, configurable). Admin can also delete any date range from **Storage**.

## Setup (one time, ~20 min)

1. **Fork** this repo to your own GitHub (button at top right), then in Vercel: **Add New > Project** and import your fork. Free Hobby plan is fine. Vercel needs the repo on your account to auto-deploy.
2. In Vercel: **Storage** tab, create a **Neon** Postgres DB and a **Blob** store, then connect both to the project. This adds `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN`.
3. In Vercel: **Settings > Environment Variables**, add `AUTH_SECRET`, `ADMIN_PASSWORD`, `KIOSK_PIN` and `CRON_SECRET` (see `.env.example`).
4. On your PC (needs Node 20+), creating the DB tables:
   ```sh
   git clone https://github.com/<you>/facial-attendance && cd facial-attendance
   npm install
   npm i -g vercel
   vercel link              # pick the project you imported
   vercel env pull .env.local
   npm run db:init          # prints "Schema applied"
   ```
5. Redeploy. Open `https://<your-app>.vercel.app/admin`, log in, then add shifts and employees.
6. On the tablet: open `https://<your-app>.vercel.app`, enter the kiosk PIN once, allow the camera, then "Add to Home screen" and use it fullscreen.

Local dev: `vercel dev` (frontend + API). `npm run dev` is the frontend only.

## Notes

- Roll numbers are digits only, so the kiosk can use a plain numeric keypad.
- Photo URLs are public but unguessable (random suffix). Only the admin pages list them.
- Storage tab numbers: the DB size comes from Postgres itself. Photo size is the sum of uploaded bytes, so treat it as close, not exact.
- Neon's free DB sleeps when idle, so the first request after a quiet period takes about 1 s.
