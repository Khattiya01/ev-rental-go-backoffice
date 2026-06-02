# 🟩 SPRINT 2 — Business Intelligence + Operations Control

**ระยะเวลา:** 25 พ.ค. 2569 – 7 มิ.ย. 2569 (14 วัน)  
**เป้าหมาย:** Dashboard จริง, ระบบหนี้, Blacklist, RBAC เต็มรูปแบบ, Audit Log  
**Demo วันที่:** 7 มิ.ย. 2569  
**Prerequisites:** Sprint 1 ✅ (Auth + DB + CRUD APIs ทำงานได้)

---

## 📊 Progress Overview

| Epic | Feature | BE | FE | Status |
|---|---|---|---|---|
| Dashboard | A1: Admin Dashboard (real data) | ✅ | ✅ | 🟢 Done |
| Dashboard | A2: Dashboard UI Enhancement | — | ⬜ | 🔵 In Plan |
| Fleet | B3: Vehicle Status Update | ✅ | ✅ | 🟢 Done |
| Fleet | B4: Remote Actions (Motor Cutoff) | ✅ | ✅ | 🟢 Done |
| Fleet | B5: Vehicle Telematics Tab (real data) | ✅ | ✅ | 🟢 Done |
| Customer | C3: Blacklist System | ⬜ | ✅ | 🔴 BE Pending |
| Contract | D2: Contract Detail (full) | ✅ | ✅ | 🟢 Done |
| Billing | E2: Overdue / Debt Collection | ⬜ | ✅ | 🔴 BE Pending |
| Settings | F2: Role Permissions Matrix | ✅ | ✅ | 🟢 Done |
| Core | G3: Audit Log System | ✅ | ✅ | 🟢 Done |

---

## 🗓️ Day-by-Day Plan

### WEEK 1 (25–31 พ.ค.)

#### Day 1 — 25 พ.ค. ✅
**Focus: Dashboard Aggregation APIs**

- [x] `app/api/dashboard/summary/route.ts`
  - [x] total vehicles, rented, available, under_repair count
  - [x] pending KYC count
  - [x] today's revenue
- [x] `app/api/dashboard/revenue/route.ts`
  - [x] daily revenue aggregation (last 7 days)
  - [x] query from invoices WHERE status = 'paid', fill zeros for missing days
- [x] `app/api/alerts/route.ts`
  - [x] GET alerts derived from live data (low battery vehicles + overdue invoices)
- [x] เชื่อม `dashboard/page.tsx` กับ DB จริง (ลบ mock data ทั้งหมด)

#### Day 2 — 26 พ.ค. ✅
**Focus: Vehicle Status Update + Telematics API**

- [x] `app/api/vehicles/[id]/status/route.ts` — PATCH update vehicle status
- [x] `app/api/vehicles/[id]/telematics/route.ts` — GET SoC, temp, charge cycles
  - [x] query from TimescaleDB (latest telemetry record per vehicle)
- [x] เชื่อม Telematics Tab ใน vehicle detail กับ API จริง
- [x] Vehicle list แสดง status badge จาก real DB

#### Day 3 — 27 พ.ค. ✅
**Focus: Remote Actions BE + Audit Log foundation** + Billing overdue + cron generate billing + overdue

- [x] `app/api/vehicles/[id]/remote/route.ts` — POST { action: 'cutoff' | 'reset' }
  - [x] require password re-verification (ตรวจ admin password ก่อน execute)
  - [x] validate action enum — reject unknown actions
  - [x] log to audit_log table ทุกครั้งที่ execute
- [x] `db/schema/audit_logs.ts` — (id, admin_id, action, entity_type, entity_id, metadata, created_at)
- [x] `db/schema/alerts.ts` — (id, type, severity, message, entity_id, created_at, resolved)
- [x] เชื่อม Remote Control modals ใน vehicle detail กับ API จริง (loading state + toast feedback)
- [x] Billing overdue + cron generate billing + overdue

#### Day 4 — 28 พ.ค.
**Focus: Blacklist + Customer status API**

- [x] `app/api/customers/[id]/blacklist/route.ts`
  - [x] POST — blacklist with reason, banned_by, banned_date
  - [x] DELETE — unban customer
  - [x] log to audit_log
- [x] `app/api/customers/blacklist/route.ts` — GET blacklisted list
- [x] เชื่อม `customers/blacklist/page.tsx` + `customers/[id]/page.tsx` กับ API จริง
- [x] enforce: ถ้า customer blacklisted → ห้าม create contract (validation ใน contract API)

#### Day 5 — 29 พ.ค.
**Focus: Overdue / Debt Collection BE**

- [x] `app/api/invoices/overdue/route.ts` — GET overdue invoices with days_overdue calc
- [x] เชื่อม `billing/overdue/page.tsx` กับ API จริง

### WEEK 2 (1–7 มิ.ย.)

#### Day 6 — 1 มิ.ย. ✅
**Focus: Contract Detail BE**

- [x] `app/api/contracts/route.ts` — POST create contract (ตรวจ customer ไม่ blacklisted)
- [x] `app/api/contracts/[id]/route.ts` — PATCH (extend contract, update status)
- [x] เชื่อม `contracts/[id]/page.tsx` — auto-reminder toggle save ลง DB

#### Day 7 — 2 มิ.ย. ✅
**Focus: Role Permissions Matrix**

- [x] `db/schema/role_permissions.ts` — (role, resource, can_read, can_write, can_delete)
- [x] `db/schema/pricing_plans.ts` — (vehicle_model, daily_rate, monthly_rate, deposit, enabled)
- [x] `app/api/permissions/route.ts` — GET / PUT permission matrix
- [x] `app/api/pricing/route.ts` — GET / PUT pricing plans
- [x] `app/api/users/me/route.ts` — GET current user (role check for client components)
- [x] `app/(backoffice)/settings/pricing/page.tsx` — เชื่อม pricing CRUD กับ DB จริง
- [x] `app/(backoffice)/settings/permissions/page.tsx` — FE: permission matrix UI (checkbox grid)
- [x] Sidebar: เปิด Pricing + Permissions links

#### Day 8 — 3 มิ.ย.
**Focus: Dashboard UI Enhancement (A2)**

**Layout:** 2-row KPI (4 primary + 4 secondary) + Fleet Donut chart + Map filter/legend

**Components ใหม่:**
- [x] `components/dashboard/fleet-health-bar.tsx` — pill row แสดง Total / Charging / Repair / Offline
- [x] `components/charts/fleet-donut-chart.tsx` — Recharts PieChart fleet distribution + legend

**ปรับ components เดิม:**
- [x] `components/maps/DashboardMap.tsx` — เพิ่ม status filter chips + color legend overlay
- [x] `app/(backoffice)/dashboard/page.tsx`
  - [x] `getDashboardData()` return `charging`, `offline` counts (ดึงจาก statusMap ที่มีแล้ว)
  - [x] Row 1: 4 primary KPI cards (Revenue Today, Active Rentals, Available, Pending KYC)
  - [x] Row 2: `FleetHealthBar` — Total / Charging / Repair / Offline
  - [x] Row 3: Map (60%) + AlertFeed (40%) — เพิ่ม geofence_breach alert type
  - [x] Row 4: RevenueChart (65%) + `FleetDonutChart` (35%)

**UI Spec:**
```
Row 1 — 4 cols (primary KPIs)
  ┌─ 💰 Revenue Today  ┐ ┌─ 🚗 Rented ┐ ┌─ ✅ Available ┐ ┌─ 👤 Pending KYC ┐
  │  ฿52,000 [spark]   │ │  8 [spark] │ │  12           │ │  3              │
  └────────────────────┘ └────────────┘ └───────────────┘ └─────────────────┘

Row 2 — FleetHealthBar (1 wide row, 4 pill stats)
  [ 🚘 Total: 26 ]  [ ⚡ Charging: 3 ]  [ 🔧 Repair: 2 ]  [ 📴 Offline: 1 ]

Row 3 — 3:2 split
  ┌─ 📍 Live Map (filter chips + legend) ─┐  ┌─ 🔔 Alerts ──────────────────────┐
  │  [All][Rented][Avail][Chrg][Repair]  │  │  3 Critical  2 Warning           │
  │  [map area]                          │  │  🔴 Battery 8% กข-1234 → ดูรถ   │
  │  ● Available ● Rented ● Charging     │  │  🔴 Geofence Breach กก-9999      │
  │  ● Repair    ● Offline               │  │  🟡 Overdue 5d — สมชาย           │
  └──────────────────────────────────────┘  └──────────────────────────────────┘

Row 4 — 65:35 split
  ┌─ 📈 Revenue Trend (7-day area chart) ──┐  ┌─ 🍩 Fleet Distribution ──────┐
  │  This week: ฿312,000                   │  │  [Donut chart]               │
  └────────────────────────────────────────┘  │  ● Available 12              │
                                              │  ● Rented    8               │
                                              │  ● Charging  3               │
                                              │  ● Repair    2               │
                                              │  ● Offline   1               │
                                              └──────────────────────────────┘
```

#### Day 9 — 4 มิ.ย.
**Focus: Audit Log View**

- [x] `app/api/audit-logs/route.ts` — GET (filter by action, admin, date range)
- [x] สร้าง `app/(backoffice)/settings/audit-log/page.tsx`
  - [x] table: timestamp, admin, action, entity, detail
  - [x] filter: by admin user, by action type, by date

#### Day 10–11 — 5–6 มิ.ย.
**Focus: Integration Test + Security**

- [x] ทดสอบ RBAC: viewer ไม่สามารถเรียก PATCH/DELETE APIs ได้
- [x] ทดสอบ blacklist enforcement ใน contract creation
- [x] ทดสอบ motor cutoff ต้องผ่าน password (ไม่มี bypass)
- [x] Input validation ทุก POST/PATCH endpoint (reject unexpected fields)
- [x] Error handling สม่ำเสมอทุก API

**Postman Collection:** `planings/EV-Rental-GO-Sprint2.postman_collection.json`  
**Environment:** `planings/EV-Rental-GO.postman_environment.json` (updated — Sprint 2 vars added)

| Folder | Coverage |
|---|---|
| 🔐 Setup | Login as super_admin |
| 📊 Dashboard | Summary aggregation, Revenue chart, Alerts feed, 401 guard |
| 🚗 Fleet — Vehicle Status | PATCH all 5 statuses, invalid status 400, not found 404 |
| 📡 Fleet — Telematics | GET telematics shape, not found 404 |
| ⚡ Fleet — Remote Actions | reset (no password), cutoff + restore (with password), wrong password 401, no password 400, unknown action 400, not found 404 |
| 🚫 Customer Blacklist | POST blacklist, GET blacklist list, audit trail verification, unblacklist, no-reason 400 |
| 🔒 Blacklist Enforcement | Contract creation blocked for blacklisted customer |
| 📋 Audit Log | All filters (action, adminId, dateFrom/dateTo), pagination, invalid action ignored, 401 guard |
| ⚙️ Permissions | GET matrix shape, PUT update, empty body 400 |
| 💰 Pricing | GET plans, PUT update + verify, negative rate 400, missing model 400, empty array 400 |
| 👤 Users — Me | GET /me shape, 401 guard |
| 🔒 RBAC Security | Viewer: blocked on write/delete/remote/blacklist/permissions/pricing/users; Admin: blocked on permissions PUT + user management |
| 🌐 Input Validation | SQL injection, XSS, oversized input, non-numeric types |

#### Day 12 — 7 มิ.ย. 🎯 DEMO DAY
**Sprint 2 Demo Checklist:**

- [ ] Dashboard แสดง 2 แถว KPI — Row 1: Revenue/Rented/Available/KYC, Row 2: Total/Charging/Repair/Offline
- [ ] Fleet Distribution Donut chart แสดง breakdown ครบ 5 status
- [ ] Map มี filter chips กรอง vehicle status ได้ + color legend
- [ ] Revenue chart มีข้อมูลจริงจาก invoices
- [ ] Blacklist ลูกค้าได้ → ลูกค้านั้นทำสัญญาใหม่ไม่ได้
- [ ] Motor cutoff ต้องพิมพ์ password จึงทำงาน
- [ ] ดู Audit Log เห็นว่าใครทำอะไรเมื่อไหร่
- [ ] Admin/Viewer มีสิทธิ์ต่างกัน

---

## 🏗️ DB Tables & APIs เพิ่มใน Sprint 2

```
db/schema/
  audit_logs.ts       ← NEW
  alerts.ts           ← NEW
  role_permissions.ts ← NEW
  pricing_plans.ts    ← NEW

components/dashboard/
  fleet-health-bar.tsx    ← NEW (A2)
components/charts/
  fleet-donut-chart.tsx   ← NEW (A2)

app/api/
  dashboard/
    summary/route.ts  ← NEW
    revenue/route.ts  ← NEW
  alerts/route.ts     ← NEW
  vehicles/[id]/
    status/route.ts   ← NEW
    telematics/route.ts ← NEW
    remote/route.ts   ← NEW
  customers/
    blacklist/route.ts ← NEW
    [id]/blacklist/route.ts ← NEW
  invoices/
    overdue/route.ts  ← NEW
    [id]/notify/route.ts ← NEW
  permissions/route.ts ← NEW
  pricing/route.ts    ← NEW
  audit-logs/route.ts ← NEW
```

---

## 📝 Notes / Blockers

<!-- บันทึก blockers หรือ decisions ระหว่าง sprint -->
