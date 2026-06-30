# Iraq HMS — Hospital Management System

A full-featured, multi-hospital desktop application built for Iraqi healthcare facilities. It covers everything from patient registration and electronic medical records to pharmacy, laboratory, radiology, billing, and staff management — all in one offline-capable Electron app.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Electron 42 |
| Frontend | React 19 + TypeScript + Ant Design 6 |
| Build Tool | Vite + electron-vite |
| Backend | Node.js + Express 5 + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (JSON Web Tokens) + bcrypt |
| Real-time | Socket.IO |

---

## Features

### Modules

| Module | Description |
|---|---|
| **Dashboard** | Live stats — beds, patients, today's revenue, occupancy rate |
| **Hospitals** | Multi-hospital network management (SUPER_ADMIN only) |
| **Departments** | 19 department types per hospital |
| **Patients** | Registration, EMR, QR code lookup, vital signs, documents |
| **Visits** | Electronic Medical Records — diagnoses, ICD-10 codes, treatment plans |
| **Appointments** | Clinic scheduling with status tracking |
| **Beds & Wards** | Real-time bed occupancy — Available / Occupied / Maintenance |
| **Staff** | Doctor & nurse directory with specialties and licenses |
| **Shifts** | Shift scheduling (Morning / Evening / Night) + clock-in/out |
| **Pharmacy** | Drug inventory, low-stock alerts, prescription dispensing |
| **Laboratory** | Lab orders, test results, critical value alerts |
| **Radiology** | Imaging orders (X-ray, CT, MRI…) + radiologist reports |
| **Billing** | Invoices, payments, insurance tracking |

### Role-Based Access Control

The system enforces 9 roles:

```
SUPER_ADMIN → HOSPITAL_ADMIN → DOCTOR / NURSE / PHARMACIST /
LAB_TECHNICIAN / RADIOLOGIST / RECEPTIONIST / ACCOUNTANT
```

Each role sees only the screens and API endpoints it is authorized for.

---

## Prerequisites

- **Node.js 18+**
- **PostgreSQL 15+**

> On macOS with Homebrew:
> ```bash
> brew install postgresql@17
> brew services start postgresql@17
> psql postgres -c "CREATE DATABASE iraq_hms;"
> ```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/asamakaml2003-creator/iraq-hms-first-project.git
cd iraq-hms-first-project
```

### 2. Install dependencies

```bash
# Install both backend and frontend at once
npm run install:all
```

Or manually:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/iraq_hms"
JWT_SECRET="replace-with-a-long-random-string"
JWT_EXPIRES_IN="8h"
PORT=3001
NODE_ENV="development"
```

### 4. Push the database schema

```bash
cd backend
npx prisma db push
```

### 5. Seed demo data

```bash
npm run db:seed
```

### 6. Start the backend

```bash
npm run dev
# Backend runs at http://localhost:3001
```

### 7. Start the frontend (new terminal)

```bash
cd frontend
npm run dev
# Opens the Electron desktop app
```

---

## Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@iraq-hms.iq | superadmin123 |
| Hospital Admin | admin@bth.iq | admin123 |
| Doctor | alrashidi@bth.iq | doctor123 |
| Doctor | hassan@bth.iq | doctor123 |
| Doctor | khalil@bth.iq | doctor123 |

---

## Project Structure

```
iraq-hms/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Full database schema (25+ models)
│   ├── src/
│   │   ├── controllers/           # Route handlers
│   │   │   ├── auth.controller.ts
│   │   │   ├── patient.controller.ts
│   │   │   ├── visit.controller.ts
│   │   │   ├── pharmacy.controller.ts
│   │   │   ├── lab.controller.ts
│   │   │   ├── billing.controller.ts
│   │   │   ├── staff.controller.ts
│   │   │   └── hospital.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT authentication + RBAC
│   │   │   └── audit.ts           # Audit log middleware
│   │   ├── routes/
│   │   │   └── index.ts           # All API routes
│   │   ├── utils/
│   │   │   ├── db.ts              # Prisma client singleton
│   │   │   ├── seed.ts            # Demo data seeder
│   │   │   └── query.ts           # Query helper utilities
│   │   └── index.ts               # Express app entry point
│   └── .env.example
│
├── frontend/
│   └── src/
│       ├── electron/
│       │   ├── main.ts            # Electron main process
│       │   └── preload.ts         # Context bridge
│       └── renderer/
│           ├── pages/             # One file per module
│           ├── layouts/
│           │   └── MainLayout.tsx # App shell + sidebar
│           ├── api/
│           │   └── client.ts      # Axios instance
│           ├── store/
│           │   └── auth.ts        # Auth state (JWT)
│           └── App.tsx            # Routes
│
└── package.json                   # Root scripts
```

---

## API Overview

All endpoints are prefixed with `/api` and require a Bearer JWT token (except `/api/auth/login`).

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login and receive JWT |
| GET | `/patients` | List patients (paginated, searchable) |
| POST | `/patients` | Register new patient |
| GET | `/visits` | List visits / EMR records |
| POST | `/visits` | Create visit (Doctor only) |
| POST | `/prescriptions` | Create prescription (Doctor only) |
| GET | `/lab-orders` | List lab orders |
| POST | `/lab-orders/result` | Submit lab result (Lab Tech only) |
| GET | `/radiology-orders` | List radiology orders |
| PUT | `/radiology-orders/:id/report` | Submit radiology report |
| GET | `/inventory` | Drug inventory |
| POST | `/dispense` | Dispense drugs (Pharmacist only) |
| GET | `/invoices` | List invoices |
| POST | `/payments` | Record payment |
| GET | `/dashboard/stats` | Dashboard summary stats |
| GET | `/health` | Server health check |

---

## Useful Development Commands

```bash
# Open Prisma database GUI
cd backend && npx prisma studio

# TypeScript type check (backend)
cd backend && npx tsc --noEmit

# Build the Electron app for distribution
cd frontend && npm run package
```

---

## License

MIT — see [LICENSE](LICENSE)
