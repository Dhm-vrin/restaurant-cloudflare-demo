# Casa di Vento

Responsive Italian restaurant website with online reservations, database-backed availability, admin management, and email notifications.

## Overview

Casa di Vento is a portfolio-style restaurant project built as a modern booking website for an Italian restaurant. It includes a polished responsive frontend, reservation flow, Cloudflare Pages Functions backend, Neon PostgreSQL database integration, email notifications via Resend, and a lightweight admin panel.

The project started as a static restaurant website and evolved into a full reservation workflow with:
- reservation storage in a database
- unavailable time-slot handling
- admin-side reservation management
- email notifications for new bookings

## Features

- Responsive one-page restaurant website
- Mobile-friendly navigation drawer
- Reservation form with 30-minute time slots
- Real-time availability by date
- Slot blocking after a successful reservation
- Reservation storage in Neon PostgreSQL
- Email notification support through Resend
- Admin panel for viewing reservations
- Reservation status updates: `pending`, `confirmed`, `cancelled`
- Cancelled reservations can become available again
- Thank-you confirmation page after successful submission
- Fake restaurant identity/details for demo and portfolio use

## Tech Stack

- HTML
- CSS
- JavaScript
- Cloudflare Pages
- Cloudflare Pages Functions
- Neon PostgreSQL
- Resend Email API

## Project Structure

```text
cloudflare/
  admin.html
  admin.js
  index.html
  index.js
  style.css
  thanks.html
  wrangler.toml
  SETUP.md
  db/
    schema.sql
    migration-slot-capacity.sql
  functions/
    api/
      availability.js
      debug-db.js
      reservations.js
      admin/
        reservation.js
        reservations.js
```

## Main Functionality

### Reservation Flow

Users can:
- choose a date
- choose a time in 30-minute intervals
- submit reservation details
- receive a successful redirect to the thank-you page

The backend:
- validates the payload
- stores the reservation in Neon
- checks slot availability before inserting
- sends an email notification when enabled

### Availability Logic

Availability is fetched dynamically from the database.

For each selected date:
- reserved slots are loaded from the backend
- unavailable times are disabled in the form
- if a slot is full, the form prevents another booking

At the moment, the app is configured to behave as:
- `1 reservation per slot`

The backend also supports a configurable slot capacity using `SLOT_CAPACITY`, but if that variable is not set, the default remains `1`.

### Admin Panel

The project includes a lightweight admin page:

- `admin.html`

From the admin panel you can:
- view reservations
- filter by date
- filter by status
- change status to `pending`, `confirmed`, or `cancelled`

A simple client-side password gate is also included for demo use.

Current demo password:
- `casa2026`

Note: this is a lightweight browser-side protection for demo/portfolio use, not production-grade authentication.

### Email Notifications

When configured, new reservations send an email notification using Resend.

Required variables:
- `RESEND_API_KEY`
- `NOTIFY_EMAIL_TO`
- `NOTIFY_EMAIL_FROM`

## Environment Variables

Configure these in Cloudflare Pages:

- `DATABASE_URL`
- `RESEND_API_KEY`
- `NOTIFY_EMAIL_TO`
- `NOTIFY_EMAIL_FROM`
- `SLOT_CAPACITY` (optional)

Recommended default for the current setup:
- do not set `SLOT_CAPACITY` if you want one reservation per time slot

## Database Setup

The project uses Neon PostgreSQL.

Initial database setup:
- run `db/schema.sql`

If you already used an older version of the project with the old unique-slot approach, also run:
- `db/migration-slot-capacity.sql`

This migration removes the old unique index and prepares the database for status-based availability logic.

## API Routes

### Public Routes

- `POST /api/reservations`
- `GET /api/availability?date=YYYY-MM-DD`

### Admin Routes

- `GET /api/admin/reservations`
- `PATCH /api/admin/reservation`

## Deployment

This project is prepared for Cloudflare Pages + Pages Functions.

### Cloudflare Pages settings

- Framework preset: `None`
- Build command: `npm install`
- Build output directory: `.`
- Root directory: leave empty if the repo root contains the project files

### After connecting the repo

1. Add the environment variables in Cloudflare Pages settings
2. Deploy the project
3. Run the required SQL schema/migration in Neon
4. Test a reservation
5. Open `admin.html` to manage reservations

## Notes

- Restaurant details, contact information, and most content are fictional and intended for demo/portfolio presentation.
- The admin password is intentionally simple because this version is meant for learning and showcasing the project, not for production security.
- The project evolved iteratively from a static restaurant landing page to a database-connected reservation system.

## Portfolio Summary

This project demonstrates:
- responsive UI design
- frontend form handling
- database integration
- backend function logic
- dynamic availability handling
- admin-side reservation management
- email notification integration

## Authoring Note

Built as a practical full-stack style restaurant booking demo for portfolio and learning purposes.
