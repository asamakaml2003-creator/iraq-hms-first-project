# Iraq HMS — Setup Guide

## Prerequisites

1. **Node.js 18+** — already installed
2. **PostgreSQL** — install with Homebrew:
   ```
   brew install postgresql@17
   brew services start postgresql@17
   ```
3. Create the database:
   ```
   psql postgres -c "CREATE DATABASE iraq_hms;"
   ```

## First-Time Setup

### Step 1 — Configure the database URL
Edit `backend/.env`:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/iraq_hms"
```
(if no password: `postgresql://localhost:5432/iraq_hms`)

### Step 2 — Push database schema
```bash
cd backend
npx prisma db push
```

### Step 3 — Seed demo data
```bash
npm run db:seed
```

### Step 4 — Start the backend
```bash
npm run dev
```
Backend runs at http://localhost:3001

### Step 5 — Start the frontend (new terminal)
```bash
cd ../frontend
npm run dev
```
Opens the Electron desktop app.

## Login Credentials (Demo)

| Role          | Email                      | Password       |
|---------------|---------------------------|----------------|
| Super Admin   | superadmin@iraq-hms.iq    | superadmin123  |
| Hospital Admin| admin@bth.iq              | admin123       |
| Doctor        | alrashidi@bth.iq          | doctor123      |
| Doctor        | hassan@bth.iq             | doctor123      |
| Doctor        | khalil@bth.iq             | doctor123      |

## System Modules

- **Dashboard** — Live stats for beds, patients, revenue
- **Hospitals** — Multi-hospital network management
- **Departments** — All 19 department types
- **Patients** — Registration, EMR, QR code lookup
- **Visits** — Electronic Medical Records per visit
- **Appointments** — Clinic scheduling
- **Beds & Wards** — Real-time bed occupancy
- **Staff** — Doctor/nurse directory
- **Shifts** — مناوبة scheduling + clock-in/out
- **Pharmacy** — Drug inventory + dispensing
- **Laboratory** — Lab orders + results + critical alerts
- **Radiology** — Imaging orders + reports
- **Billing** — Invoices + payments

## Development

```bash
# Database admin UI
cd backend && npx prisma studio

# TypeScript check
cd backend && npx tsc --noEmit
```
