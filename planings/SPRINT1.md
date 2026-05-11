# 🟦 SPRINT 1 — Foundation + Core Operations

**ระยะเวลา:** 11 พ.ค. 2569 – 24 พ.ค. 2569 (14 วัน)  
**เป้าหมาย:** Auth ทำงาน + CRUD พื้นฐาน (Vehicle / Customer / Contract / Invoice) ครบ end-to-end  
**Demo วันที่:** 24 พ.ค. 2569

---

## 📊 Progress Overview

| Epic | Feature | BE | FE | Status |
|---|---|---|---|---|
| Core | G1: Auth & RBAC | ✅ | ✅ | ✅ Done |
| Core | G2: Layout System | ✅ | ✅ | ✅ Done (Mock UI) |
| Core | G3: UI Theme | — | ✅ | ✅ Done |
| Fleet | B1: Vehicle List | ✅ | ✅ | ✅ Done |
| Fleet | B2: Vehicle Detail | ✅ | ✅ | ✅ Done |
| Customer | C1: Customer List | ⬜ | ✅ | 🟡 FE Done, BE Pending |
| Customer | C2: e-KYC Review | ⬜ | ✅ | 🟡 FE Done, BE Pending |
| Contract | D1: Active Rentals | ⬜ | ✅ | 🟡 FE Done, BE Pending |
| Billing | E1: Invoice List | ⬜ | ✅ | 🟡 FE Done, BE Pending |
| Settings | F1: Users Mgmt | ✅ | ✅ | ✅ Done |

---

## 🗓️ Day-by-Day Plan

### WEEK 1 (11–17 พ.ค.)

#### Day 1 — 11 พ.ค. ✅ DONE
**Focus: DB Schema + Auth Setup + UI Theme**

- [x] สร้าง `db/schema/` — Drizzle ORM tables
  - [x] `users` table (id, name, email, password_hash, role, created_at)
  - [x] `vehicles` table (id, plate, make, model, year, status, soc_percent, lat, lng, vin, odometer, color, image_url)
  - [x] `customers` table (id, name, phone, email, address, status, driver_type, avatar_url, credit_score, rating)
  - [x] `contracts` table (id, contract_no, customer_id, vehicle_id, start_date, due_date, status, daily_rate, monthly_rate, deposit_amount)
  - [x] `invoices` table (id, contract_id, customer_id, amount, due_date, status, days_overdue)
- [x] `db/index.ts` — Drizzle client setup (PostgreSQL connection)
- [x] `db/seed.ts` — seed script (3 users, 5 vehicles, 3 customers)
- [x] `drizzle.config.ts` — migration config
- [x] ทดสอบ connect DB ได้จริง (`pnpm db:push`) ← **ต้องมี PostgreSQL ก่อน**
- [x] `lib/session.ts` — Jose JWT session (stateless cookie)
- [x] `lib/actions/auth.ts` — login/logout Server Actions
- [x] Login form เชื่อม `login` server action (ลบ mock)
- [x] `middleware.ts` — protect all routes, redirect to `/login`
- [x] `lib/dal.ts` — `getCurrentUser()` ดึง user จาก session (React cache)
- [x] Header/Sidebar แสดง user จริงจาก session + logout dropdown
- [x] **UI Theme** — ปรับ light theme ทั้ง app (Sidebar navy, accent blue/teal)
  - [x] ปรับ Lucide icons แทน emoji (login, sidebar, header)
  - [x] Login page redesign — animated wave bg, dark card, icons ครบ
  - [x] Map tiles → CARTO light_all (ทุก map)

#### Day 2 — 12 พ.ค.
**Focus: Vehicle API + Users CRUD API**

- [x] `app/api/users/route.ts` — GET list + POST create user
- [x] `app/api/users/[id]/route.ts` — PATCH (update role/name) + DELETE
- [x] เชื่อม `settings/users/page.tsx` กับ API จริง (ลบ mock)
- [x] `app/api/vehicles/route.ts` — GET (list + pagination + search + filter)
- [x] `app/api/vehicles/[id]/route.ts` — GET single vehicle
- [x] เชื่อม `fleet/vehicles/page.tsx` กับ API จริง (ลบ `mockVehicles`)
- [x] เชื่อม `fleet/vehicles/[id]/page.tsx` กับ API จริง

#### Day 3 — 13 พ.ค.
**Focus: Customer API**

- [ ] `app/api/customers/route.ts` — GET (list + filter)
- [ ] `app/api/customers/[id]/route.ts` — GET single
- [ ] `app/api/customers/[id]/route.ts` — PATCH (update status / blacklist)
- [ ] เชื่อม `customers/page.tsx` + `customers/[id]/page.tsx` กับ API จริง

#### Day 4 — 14 พ.ค.
**Focus: e-KYC API + Contract API**

- [ ] `app/api/customers/[id]/kyc/route.ts` — POST approve/reject
- [ ] เชื่อม KYC page กับ API
- [ ] `app/api/contracts/route.ts` — GET list
- [ ] `app/api/contracts/[id]/route.ts` — GET single
- [ ] เชื่อม contracts pages กับ API จริง

#### Day 5 — 15 พ.ค.
**Focus: Invoice API**

- [ ] `app/api/invoices/route.ts` — GET (list + overdue filter)
- [ ] เชื่อม billing pages กับ API จริง

### WEEK 2 (18–24 พ.ค.)

#### Day 6–7 — 18–19 พ.ค.
**Focus: Seed Data + Integration Testing**

- [ ] `db/seed.ts` — seed realistic Thai EV rental data
- [ ] ทดสอบทุก API endpoint ด้วย cursor / Postman
- [ ] Fix bugs จาก integration

#### Day 8–9 — 20–21 พ.ค.
**Focus: RBAC + Auth Polish**

- [ ] Role: `super_admin`, `admin`, `viewer`
- [ ] Middleware check roles per route group
- [ ] UI แสดง/ซ่อน action ตาม role
- [ ] Error states + loading states ทุกหน้า

#### Day 10–11 — 22–23 พ.ค.
**Focus: UI Polish + Edge Cases**

- [ ] Empty states ทุก table
- [ ] Error handling (API errors → toast/alert)
- [ ] Loading skeletons
- [ ] Pagination ทุก table ที่มีข้อมูลเยอะ

#### Day 12 — 24 พ.ค. 🎯 DEMO DAY
**Sprint 1 Demo Checklist:**

- [ ] Login ด้วย role ต่างกัน → แสดง permission ต่างกัน
- [ ] ดูรายการรถจาก DB จริง (ไม่ใช่ mock)
- [ ] Approve / Reject e-KYC ได้จริง
- [ ] ดูสัญญา/ใบแจ้งหนี้จาก DB จริง
- [ ] ระบบไม่ crash เมื่อ demo

---

## 🏗️ โครงสร้าง DB & API ที่ต้องสร้าง

```
db/
  schema/
    users.ts
    vehicles.ts
    customers.ts
    contracts.ts
    invoices.ts
  index.ts          ← Drizzle client
  migrate.ts        ← migration runner
  seed.ts           ← seed data

app/api/
  auth/[...nextauth]/route.ts
  vehicles/
    route.ts        ← GET list
    [id]/route.ts   ← GET single
  customers/
    route.ts
    [id]/
      route.ts
      kyc/route.ts  ← POST approve/reject
  contracts/
    route.ts
    [id]/route.ts
  invoices/
    route.ts
  users/
    route.ts
    [id]/route.ts
```

---

## 📝 Notes / Blockers

<!-- บันทึก blockers หรือ decisions ที่ตัดสินใจระหว่าง sprint ตรงนี้ -->

- **11 พ.ค.:** เริ่ม Sprint 1 Day 1 — Mock UI พร้อมแล้ว เริ่ม BE + DB
