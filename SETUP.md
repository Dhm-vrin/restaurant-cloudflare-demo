# Cloudflare Deploy Notes

This folder is prepared for Cloudflare Pages + Pages Functions.

## Deploy
1. Create a new Cloudflare Pages project from this folder/repository.
2. Build command: leave empty.
3. Build output directory: `.`
4. Functions directory is detected from `functions/`.

## Required Variables / Secrets
Add these in Cloudflare Pages project settings:
- `DATABASE_URL`
- `RESEND_API_KEY` (optional, for notification emails)
- `NOTIFY_EMAIL_TO` (optional)
- `NOTIFY_EMAIL_FROM` (optional)

## API Routes
- `POST /api/reservations`
- `GET /api/availability?date=YYYY-MM-DD`

## Database
Run `db/schema.sql` in Neon before deploying.
