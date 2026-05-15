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
| Customer | C1: Customer List | ✅ | ✅ | ✅ Done |
| Customer | C2: e-KYC Review | ✅ | ✅ | ✅ Done (real docs + reject modal) |
| Contract | D1: Active Rentals | ✅ | ✅ | ✅ Done |
| Billing | E1: Invoice List | ✅ | ✅ | ✅ Done |
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

#### Day 3 — 13 พ.ค. ✅ DONE
**Focus: Customer API**

- [x] `app/api/customers/route.ts` — GET (list + filter + pagination)
- [x] `app/api/customers/[id]/route.ts` — GET single
- [x] `app/api/customers/[id]/route.ts` — PATCH (update status / blacklist, bannedBy/bannedDate server-side)
- [x] เชื่อม `customers/page.tsx` กับ API จริง (ลบ mock)
- [x] เชื่อม `customers/[id]/page.tsx` กับ API จริง + blacklist confirm modal
- [x] เชื่อม `customers/kyc/page.tsx` กับ API จริง — Approve/Reject calls PATCH
- [x] เชื่อม `customers/blacklist/page.tsx` กับ API จริง — Unban calls PATCH

#### Day 4 — 14 พ.ค. ✅ DONE
**Focus: e-KYC API + Contract API**

- [x] `app/api/customers/[id]/kyc/route.ts` — ✅ covered by PATCH `/api/customers/[id]` (status: active / blacklisted)
- [x] เชื่อม KYC page กับ API — approve/reject ผ่าน PATCH ทำงานแล้ว
- [x] KYC page แสดง document images จริง (idCardFront, idCardBack, driverLicense, grabBoltScreenshot)
- [x] KYC page แสดง extracted data จริง (idCardNumber, dateOfBirth)
- [x] Reject reason modal — admin ต้องกรอกเหตุผลก่อน reject
- [x] `app/api/contracts/route.ts` — GET list
- [x] `app/api/contracts/[id]/route.ts` — GET single
- [x] เชื่อม contracts pages กับ API จริง

#### Day 5 — 15 พ.ค. ✅ DONE
**Focus: Invoice API**

- [x] `app/api/invoices/route.ts` — GET (list + overdue filter + summary stats) + POST create
- [x] `app/api/invoices/[id]/route.ts` — PATCH (edit / mark paid + slipUrl) + DELETE
- [x] เชื่อม billing/invoices/page.tsx กับ API จริง + QR PromptPay + slip upload

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
- **14 พ.ค.:** e-KYC flow ใช้ Option B (Manual + Document Upload) — Admin upload docs ตอน add customer, KYC page แสดงรูปจริง + reject reason modal. ไม่สร้าง `/kyc/route.ts` แยก เพราะ PATCH `/api/customers/[id]` ครอบคลุมแล้ว
