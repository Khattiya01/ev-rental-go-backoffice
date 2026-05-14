<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# EV Rental GO — Web Backoffice

## Project Scope

This repository is **Web Backoffice only** (Admin & Fleet Management).
The other two products — Public Website (Customer Facing) and Maintenance App (Tablet PWA) — are separate repositories and are **out of scope here**.

---

## Project Overview

A full-stack internal backoffice for managing an EV car rental business in Thailand.
Admins use this system to:
- Track and control the entire EV fleet in real time (GPS, battery, IoT)
- Manage customer onboarding and e-KYC document approval
- Issue and manage rental contracts
- Handle billing, invoicing, and debt collection
- Oversee maintenance queues and inspection reports
- Generate financial and operational reports for management

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, full-stack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Package manager | pnpm |
| Database | PostgreSQL + TimescaleDB extension + Drizzle ORM |
| Real-time / Cache | Redis (live GPS positions) + WebSockets |
| IoT Gateway | Separate Node.js (Express) or Go microservice — NOT in this repo |
| Auth | NextAuth v5 |
| Maps | Leaflet.js + OpenStreetMap (via `react-leaflet`) — free, no API key required |
| Charts | Recharts |

> Update this table as dependencies are added.

---

## Architecture

### Hybrid Monolith
This repo is the **Next.js full-stack app** only. It handles:
- Web UI (all admin pages)
- Business logic API routes (Auth, Rentals, Customers, Billing, Reports)
- Real-time display — reads latest GPS from **Redis**, does NOT receive raw IoT data directly

### IoT Gateway (Separate Service — out of scope for this repo)
A dedicated microservice (Node.js/Go) handles high-frequency GPS telemetry:
- Receives GPS data from vehicles via **MQTT** every 1–5 seconds
- Writes latest position to **Redis** (fast cache)
- Writes GPS history to **PostgreSQL** (TimescaleDB for time-series efficiency)
- Reason for separation: raw IoT traffic would block Next.js Event Loop if handled here

### Data Flow
```
Vehicle (IoT device)
  │  MQTT
  ▼
IoT Gateway (separate service)
  ├─ latest position ──► Redis
  └─ GPS history ──────► PostgreSQL (TimescaleDB)

Next.js App (this repo)
  ├─ reads Redis ──► real-time map / dashboard via WebSockets or Server Actions
  └─ reads PostgreSQL ──► business data (contracts, customers, invoices, etc.)
```

### Agent Scope Reminder
- **Implement:** Next.js pages, API route handlers, DB queries, Redis reads, WebSocket connections for display
- **Do NOT implement:** IoT Gateway, MQTT broker, GPS ingestion logic — those are separate services

---

## Folder Structure Conventions

```
app/
  (auth)/
    login/            # Login page
  (backoffice)/       # All admin pages (protected)
    dashboard/
    fleet/
      map/            # Live tracking map
      vehicles/       # Vehicle list
        new/          # Add new vehicle form
        [id]/         # Vehicle detail (tabs: info, telematics, history, remote-control)
          edit/       # Edit vehicle
      geofencing/
    customers/        # Customer list (index page)
      new/            # Add new customer form
      kyc/            # e-KYC approval queue
      [id]/           # Customer profile
        edit/         # Edit customer
      blacklist/
    contracts/        # Active rentals list (index page)
      [id]/           # Contract detail
    billing/
      invoices/
      overdue/
    maintenance/      # Maintenance overview (tickets & reports as tabs or sub-pages)
    reports/
    settings/         # System settings
      pricing/        # Pricing configuration
      users/          # Admin user management
  register/           # Public customer self-registration (unauthenticated)
  api/                # Route Handlers (backend API)
    customers/
      [id]/
    vehicles/
      [id]/
    users/
      [id]/
    upload/           # Internal file upload
    registration-links/
    public/           # Unauthenticated endpoints
      register/
      upload/
components/           # Shared UI components
  ui/                 # Primitive components (buttons, modals, tables, etc.)
  charts/             # Chart components (Recharts wrappers)
  maps/               # Map components (always "use client")
  dashboard/          # Dashboard-specific composite components
  layout/             # Shell, sidebar, header
db/                   # Database layer
  schema/             # One file per table; re-export from index.ts
  index.ts            # Drizzle client + schema barrel
  seed.ts             # Development seed data
lib/                  # Shared utilities, constants, types
  actions/            # Server Actions (auth, locale, etc.)
  dal.ts              # Data Access Layer — server-only DB helpers
  session.ts          # Session helpers (NextAuth / JWT)
  storage.ts          # File storage helpers
  types.ts            # Shared TypeScript types
i18n/                 # next-intl request config
messages/             # Locale message files (en.json, th.json)
public/               # Static assets
  uploads/            # User-uploaded files (customers/, vehicles/)
middleware.ts         # Auth / route protection + i18n routing
```

---

## Domain Knowledge

### Core Business Entities

| Entity | Description |
|---|---|
| **Vehicle** | An EV car in the fleet. Has status: available, rented, charging, under_repair, offline |
| **Customer** | A driver (Grab/Bolt driver). Has status: pending_kyc, active, blacklisted |
| **Contract** | A rental agreement between a customer and a vehicle. Has start/end date, deposit, daily/monthly rate |
| **Invoice** | A billing record for a rental period. Has status: paid, unpaid, overdue |
| **MaintenanceTicket** | A repair/service job for a vehicle. Has status: todo, in_progress, done |
| **InspectionReport** | Pre/post-rental vehicle condition record with photos and damage markings |
| **GeofenceZone** | A polygon area defining the operational boundary for a vehicle |
| **Alert** | A system notification (low battery, geofence breach, overdue payment) |

### Vehicle Statuses
- `available` — parked, ready to rent
- `rented` — currently on the road with a customer
- `charging` — at a charging station
- `under_repair` — in the workshop
- `offline` — IoT device not responding

### Key Business Rules
- Remote motor cutoff (emergency control) must require a second password confirmation before executing
- e-KYC requires: National ID (front+back), Driver's License, Grab/Bolt driver profile screenshot
- Battery State of Charge (SoC) alerts fire at < 15%
- Battery State of Health (SoH) reports flag vehicles whose battery is degrading for review
- Geofence breach triggers an alert immediately

---

## Pages & Features

### 1. Dashboard
- Summary cards: total vehicles, rented, available, under repair, pending KYC customers
- Mini map with clustered vehicle positions
- Alert/notification feed (low battery, geofence breach, overdue payment)
- Revenue chart (daily/weekly)

### 2. Fleet Management
- **Live Tracking Map** — fullscreen map, vehicle icons colored by status, side filter panel
- **Vehicle List** — data table with search by plate number, filter by status, add new vehicle
- **Vehicle Detail** (4 tabs):
  - Tab 1: General info (photo, plate, model, year, odometer)
  - Tab 2: Telematics & Battery (SoC graph, temperature, charge cycle stats)
  - Tab 3: Rental history (list of past renters)
  - Tab 4: Emergency Remote Control (motor cutoff with password confirmation modal, IoT device reset)
- **Geofencing** — polygon drawing tool on map, alert recipient configuration

### 3. Customer Management
- **Customer List** — table with name, phone, type (Grab/Bolt), account status
- **e-KYC Approval** — side-by-side selfie vs ID card comparison, approve/reject with reason
- **Customer Profile** — personal info, rental history, claim/accident history, blacklist button
- **Blacklist** — list of banned customers with ban reason notes

### 4. Contract & Rental
- **Active Rentals** — table: contract number, customer, vehicle plate, start date, return date
- **Contract Detail** — digitally signed PDF, deposit amount, daily/monthly rate, battery degradation penalty terms

### 5. Billing & Payment
- **Invoices & Transactions** — all bills table, status (paid/unpaid), payment slip viewer, card charge records
- **Overdue & Debt Collection** — overdue customer list, quick actions: send SMS, send LINE notification, send vehicle lock command

### 6. Maintenance (read-only view from admin side)
- **Service Tickets** — Kanban board (Todo / In Progress / Done) for repair queues
- **Inspection Reports** — damage photos from technician tablet app, used for vehicle condition comparison at return

### 7. Reports & Analytics
- **Financial Report** — revenue, bad debt; export as Excel/CSV
- **Asset Report** — vehicle utilization rate (% rented vs parked)
- **Battery Health Report** — vehicles with low SoH flagged for battery replacement or resale evaluation

---

## Agent Guidelines

- **Do NOT implement features from the Public Website or Maintenance App** — those are separate repos
- All pages are protected routes — assume an auth layer (middleware) guards `/backoffice/**`
- API routes live in `app/api/` following REST conventions
- Use server components by default; use `"use client"` only when interactivity is required
- Map components are always client components (browser API dependency)
- The emergency remote control action must always include a confirmation step — never implement it as a single-click action
- When displaying vehicle positions, use clustering for the map
- All data tables should support search and filter
- Financial exports must support CSV at minimum
