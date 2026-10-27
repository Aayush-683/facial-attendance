# Facial Attendance

Tablet kiosk: employee taps **Mark Attendance**, types their roll number, the front camera waits for a face, counts 3-2-1, flashes the screen white and takes the photo. Admin panel at `/admin` manages employees, shifts, attendance stats and storage.

Stack (all free tier): Vite + React, Vercel serverless functions (`api/`), Neon Postgres, Vercel Blob for photos, MediaPipe face detection in the browser, Vercel Cron for cleanup.

## Rules

- One attendance per roll number per shift day (`unique (employee_id, shift_date)`).
- Can only mark between `shift start − early minutes` and `shift end`. Configurable under **Shifts**.
- A night shift crossing midnight counts for the day it **started** (9 pm Mon to 6 am Tue = Monday).
- Photos are auto-deleted after 90 days and records after 365 days (nightly cron, configurable). Admin can also delete any date range from **Storage**.

## Quick setup (browser only, ~15 min)

1. Click [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAayush-683%2Ffacial-attendance&env=AUTH_SECRET,ADMIN_PASSWORD,KIOSK_PIN,CRON_SECRET&envDescription=AUTH_SECRET%20and%20CRON_SECRET%3A%20any%20long%20random%20text.%20ADMIN_PASSWORD%3A%20admin%20login.%20KIOSK_PIN%3A%20digits%20for%20the%20tablet.&project-name=attendance), log in with GitHub and fill the 4 values.
2. Open the project in Vercel, go to **Storage**, create a **Neon** database and a **Blob** store, and connect both to the project.
3. Open the Neon DB (**Open in Neon**), go to **SQL Editor**, paste all of [`db/schema.sql`](db/schema.sql) and click **Run**.
4. In Vercel, go to **Deployments**, open the ⋯ menu on the latest one and pick **Redeploy**.
5. Open `<your-url>/admin`, then on the tablet open `<your-url>`.

## Setup with the CLI (alternative)

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
