# 🟦 SPRINT 3 — Real-Time Fleet Operations

**ระยะเวลา:** 8 มิ.ย. 2569 – 21 มิ.ย. 2569 (14 วัน)  
**เป้าหมาย:** Live GPS Tracking, Geofencing, WebSocket real-time updates  
**Demo วันที่:** 21 มิ.ย. 2569  
**Prerequisites:** Sprint 1 + 2 ✅ (Auth, DB, CRUD, RBAC พร้อม)

> ✅ **Strategy:** Dev และ Demo ใช้ **GPS Simulator** เขียน Redis โดยตรง — ไม่ต้องมี IoT Gateway จริง
> IoT Gateway จะติดตั้งบน Production Server ก่อนส่งมอบงานลูกค้า แค่เปลี่ยน `REDIS_URL` ใน `.env` เท่านั้น Next.js ไม่ต้องแก้ code เลย
>
> **Redis key format ต้องตรงกันทั้ง Simulator และ IoT Gateway:**
> `vehicle:pos:{vehicle_id}` → `{ lat, lng, soc, speed, status, updated_at }`

> 🚫 **Out of Scope ตามที่ลูกค้าแจ้ง:** Maintenance Kanban, Inspection Reports, Financial/Asset/Battery Reports

---

## 📊 Progress Overview

| Epic | Feature | BE | FE | Status |
|---|---|---|---|---|
| Fleet | Live GPS Map (Redis read) | ⬜ | ✅ | 🔴 BE Pending |
| Fleet | WebSocket real-time position | ✅ | ✅ | ✅ Done |
| Fleet | Geofencing CRUD | ✅ | ✅ | ✅ Done |
| Fleet | Geofence breach alert | ✅ | ✅ | ✅ Done |
| Fleet | Vehicle clustering on map | ⬜ | ✅ | 🟡 FE Done |
| Dashboard | Live map + clustering | ✅ | ✅ | ✅ Done |
| Dashboard | Live alert feed (battery SoC) | ✅ | ✅ | ✅ Done |

---

## 🗓️ Day-by-Day Plan

### WEEK 1 (8–14 มิ.ย.)

#### Day 1 — 8 มิ.ย.
**Focus: Redis Setup + GPS Data Layer + Simulator**

- [x] Install `ioredis` → `pnpm add ioredis`
- [x] `lib/redis.ts` — Redis client singleton
- [x] กำหนด Redis key convention (ต้องตรงกับที่ IoT Gateway จะใช้ใน Production):
  - key: `vehicle:pos:{vehicle_id}`
  - value: `{ lat, lng, soc, speed, status, updated_at }`
- [x] `app/api/vehicles/positions/route.ts` — GET all vehicle positions from Redis
  - [x] fallback: ถ้า Redis miss → query last known position from PostgreSQL
- [x] GPS Simulator script: `scripts/gps-simulator.ts`
  - [x] loop ทุก 5 วินาที → random walk positions ของทุก vehicle
  - [x] เขียน Redis ด้วย key format เดียวกับ IoT Gateway จริง (สำคัญมาก)
  - [x] รัน `pnpm sim:gps` → start, Ctrl+C → stop
  - [x] ใช้ vehicle IDs จาก PostgreSQL จริง (ไม่ hardcode)

#### Day 2 — 9 มิ.ย.
**Focus: WebSocket Server**

- [x] WebSocket endpoint — `/api/fleet/ws` (ใช้ `server.ts` custom server แทน route handler เพราะ Next.js จะ `socket.end()` ถ้ามี route file ตรงกัน)
  - [x] client connect → server push vehicle positions ทุก 5 วินาที
  - [x] broadcast เฉพาะ vehicles ที่ position เปลี่ยนแปลง (change detection)
  - [x] auth: validate session JWT cookie ก่อน accept WS connection
  - [x] immediate snapshot ส่งให้ client ที่ connect ใหม่ทันที
- [x] `lib/ws-broadcaster.ts` — manage connected clients + Redis polling + broadcast loop
- [x] ทดสอบ WebSocket connection ด้วย browser DevTools console ✅

#### Day 3 — 10 มิ.ย.
**Focus: Live Map FE เชื่อม WebSocket**

- [x] `components/maps/FleetMap.tsx` — เพิ่ม `MarkerClusterGroup` wrapper
  - [x] vehicle icons ขยับ real-time บน map (position มาจาก WS)
  - [x] icon สีต่างตาม status ยังคงทำงาน ✅
- [x] `app/(backoffice)/fleet/map/page.tsx` — ลบ mockVehicles แล้ว
  - [x] useEffect load initial vehicles จาก `/api/vehicles?limit=100`
  - [x] useEffect connect WebSocket → merge position updates เข้า state
  - [x] WS status indicator (🟢 Live / 🔴 Offline) ที่ sidebar header
  - [x] vehicle count footer: `N / M vehicles`
- [x] เพิ่ม vehicle clustering ด้วย `react-leaflet-cluster@4.1.3`
  - [x] `pnpm add react-leaflet-cluster`
  - [x] cluster vehicles ที่ zoom ออก → แสดงจำนวนใน cluster
- [x] icon สีต่างตาม status ยังคงทำงาน

#### Day 4 — 11 มิ.ย.
**Focus: Dashboard Map เชื่อม real-time**

- [x] `components/maps/DashboardMap.tsx` — เพิ่ม `MarkerClusterGroup` + `Marker` (แทน `CircleMarker`) พร้อม color-coded cluster icons และ filter chips เหมือน Fleet Map
- [x] `components/maps/DashboardMapClient.tsx` — เชื่อม WebSocket, maintain live vehicle state, render row 3 ทั้งหมด (map + alert feed)
  - [x] Live mini-stats ในหัว map card: Rented / Available / Charging count อัปเดต real-time
  - [x] WS status indicator (🟢 Live / ⚫ Offline)
- [x] Dashboard summary cards เชื่อม real position data — แสดง live rented/available/charging counts ใน map header
- [x] Alert Feed — battery-low alerts (< 15% SoC) สร้างจาก live WS positions (ไม่ใช่ DB query)
  - [x] Server page เอา `lowBatteryVehicles` query ออก — client คำนวณ live แทน
  - [x] `staticAlerts` prop ส่งจาก server: overdue + payment_reminder + geofence_breach alerts

#### Day 5 — 12 มิ.ย.
**Focus: Geofencing BE**

- [x] `db/schema/geofence_zones.ts` — (id, name, coordinates JSONB, active, alert_recipients, created_by) + `pnpm db:push` ✅
- [x] `vehicles.geofence_zone_id` FK column — vehicle assigned to one zone, null = no geofence
- [x] `app/api/geofences/route.ts` — GET list (with ?includeInactive=true) / POST create
- [x] `app/api/geofences/[id]/route.ts` — GET / PATCH / DELETE (DELETE clears FK on vehicles first)
- [x] `app/api/vehicles/[id]/route.ts` — PATCH รองรับ `geofenceZoneId` field
- [x] `components/maps/GeofenceMap.tsx` — เพิ่ม Leaflet.Draw (polygon / rectangle / circle) + `onZoneDrawn` callback
- [x] `fleet/geofencing/page.tsx` — เชื่อม API จริง: load zones, toggle active, delete, draw + save zone
- [x] `pnpm add leaflet-draw @types/leaflet-draw`

### WEEK 2 (15–21 มิ.ย.)

#### Day 6 — 15 มิ.ย.
**Focus: Geofence Breach Detection**

- [x] `lib/geofence-checker.ts` — point-in-polygon algorithm (Ray Casting)
  - [x] รับ vehicle position + active geofence list
  - [x] return zones ที่ vehicle อยู่นอกขอบเขต
- [x] ใน WebSocket broadcaster → เรียก geofence checker ทุก position update
  - [x] ถ้า breach → สร้าง alert record ลง DB (cooldown 5 นาทีต่อ vehicle)
  - [x] push alert ไปยัง connected dashboard clients ด้วย WS (`{ type: 'alert', data: {...} }`)
- [x] `app/api/alerts/route.ts` — GET alerts รวม geofence breach alerts
- [x] **Bonus:** Vehicle zone assignment UI — SectionCard + modal ใน Vehicle Detail page
- [x] **Bonus:** Vehicle Edit Form — Geofence Zone dropdown
- [x] **Bonus:** GET `/api/vehicles/[id]` — left join zone name

#### Day 7–8 — 16–17 มิ.ย.
**Focus: Geofence Map Drawing UX**

- [x] เชื่อม Leaflet.Draw หรือ manual polygon tool กับ save flow จริง
  - [x] เมื่อ user วาด polygon เสร็จ → pre-fill zone name form (form แสดงหลัง draw ทันที)
  - [x] กด Save → POST `/api/geofences` → zone ปรากฏบน map ทันที (loadZones() หลัง save)
- [x] Alert recipient config — เลือก admin users จาก DB (checkbox multi-select)
  - [x] `app/api/users/directory/route.ts` — minimal endpoint ไม่ต้อง super_admin
  - [x] `db/schema/geofence_zones.ts` — เปลี่ยน `alertRecipients` จาก `varchar(50)` เป็น `json.$type<string[]>()`
  - [x] Migration: `ALTER TABLE geofence_zones DROP COLUMN / ADD COLUMN alert_recipients json DEFAULT '[]'`
- [x] **Bonus:** Real-time breach alert ใน Dashboard — handle `type: 'alert'` WS message ใน DashboardMapClient
- [x] **Bonus:** Zone name ใน FleetMap + DashboardMap popup
- [x] **Bonus:** `GET /api/vehicles` list — left join geofenceZoneName
- [ ] ทดสอบ: สร้าง zone → ย้าย simulated vehicle ออกนอก zone → เห็น alert (manual test)

#### Day 9–10 — 18–19 มิ.ย.
**Focus: Performance + Edge Cases**

- [ ] Redis connection error → graceful fallback (ไม่ crash server)
- [ ] WebSocket reconnect logic ฝั่ง client (ถ้า connection หลุด)
- [ ] Vehicle ที่ `offline` status → ไม่ส่ง GPS update → map icon แสดง greyed out
- [ ] Geofence zone ที่ inactive → ไม่ check breach
- [ ] ทดสอบ concurrent WebSocket connections (หลาย admin เปิด map พร้อมกัน)

#### Day 11 — 20 มิ.ย.
**Focus: Integration + Final Polish**

- [ ] ทดสอบ full flow: GPS update → Redis → WS → Map update (< 6 วินาที)
- [ ] ทดสอบ geofence breach: vehicle ออกนอก zone → alert ปรากฏใน feed < 10 วินาที
- [ ] ทดสอบ map clustering ที่ zoom level ต่างๆ
- [ ] Cleanup GPS simulator ให้ start/stop ได้ง่าย (`pnpm sim:gps`)

#### Day 12 — 21 มิ.ย. 🎯 DEMO DAY
**Sprint 3 Demo Checklist:**

- [ ] เปิด Live Map → เห็น vehicle icons ขยับ real-time (ไม่ refresh หน้า)
- [ ] ย้าย simulated vehicle ออกนอก geofence → เห็น alert ใน feed ทันที
- [ ] วาด geofence zone ใหม่บน map → save → ปรากฏทันที
- [ ] เปิด 2 browser พร้อมกัน → ทั้งสองเห็น update พร้อมกัน
- [ ] Dashboard map แสดง clustered vehicle positions

---

## 🏗️ Infrastructure เพิ่มใน Sprint 3

```
lib/
  redis.ts              ← NEW — Redis client singleton
  ws-broadcaster.ts     ← NEW — WebSocket broadcast manager
  geofence-checker.ts   ← NEW — point-in-polygon

scripts/
  gps-simulator.ts      ← NEW — simulate GPS movement (dev only)

db/schema/
  geofence_zones.ts     ← NEW

app/api/
  fleet/
    ws/route.ts         ← NEW — WebSocket endpoint
  vehicles/
    positions/route.ts  ← NEW — GET all from Redis
  geofences/
    route.ts            ← NEW
    [id]/route.ts       ← NEW
```

### Dependencies เพิ่ม

```bash
pnpm add ioredis
pnpm add react-leaflet-cluster
pnpm add @types/ioredis -D
```

---

## ⚙️ Environment Variables เพิ่ม

```env
# Dev / Demo (local)
REDIS_URL=redis://localhost:6379

# Production (Server 2 IP)
# REDIS_URL=redis://192.168.x.x:6379
```

> การ switch Dev → Production แค่เปลี่ยน `REDIS_URL` เท่านั้น
> Next.js และ GPS Simulator ไม่ต้องแก้ code ใดๆ

---

## 🚀 Production Handoff Checklist (ทำก่อนส่งลูกค้า)

> ทำหลัง Sprint 3 เสร็จ — ก่อนติดตั้งบน Server จริง

### Server 1: App Server
- [ ] Deploy Next.js (Web Backoffice)
- [ ] ติดตั้ง Mosquitto (MQTT Broker)
- [ ] ติดตั้ง IoT Gateway (Node.js + Express/TypeScript — separate repo)
  - [ ] IoT Gateway ใช้ Redis key format เดิม `vehicle:pos:{vehicle_id}` ← ต้องตรงกับ Simulator
- [ ] ปิด GPS Simulator (`pnpm sim:gps` ห้ามรันบน Production)
- [ ] ตั้ง `REDIS_URL` ชี้ไป Server 2

### Server 2: Data Server
- [ ] ติดตั้ง PostgreSQL + TimescaleDB extension
- [ ] ติดตั้ง Redis
- [ ] รัน migration (`pnpm db:migrate`)
- [ ] ตรวจสอบ firewall: เปิดเฉพาะ port 5432 (Postgres) และ 6379 (Redis) ให้ Server 1 เข้าถึงได้

### Switch Checklist (Dev → Production)
- [ ] เปลี่ยน `REDIS_URL` → ชี้ Server 2
- [ ] เปลี่ยน `DATABASE_URL` → ชี้ Server 2
- [ ] ปิด GPS Simulator
- [ ] เปิด IoT Gateway
- [ ] ทดสอบ: รถส่ง GPS จริง → แผนที่ขยับ ✅

---

## 🖥️ Production Installation Guide — Full System Checklist

> คู่มือสำหรับช่างติดตั้งระบบให้ลูกค้า ทำตามลำดับจากบนลงล่าง
> ใช้ก่อนส่งมอบงานจริง — หลัง Sprint 3 + 4 เสร็จสมบูรณ์

---

### Phase 0 — เตรียมก่อนติดตั้ง

- [ ] ได้รับ IP address ของ Server 1 (App) และ Server 2 (Data) จากลูกค้า
- [ ] SSH key ได้รับการ authorize บนทั้ง 2 server แล้ว
- [ ] OS ทั้ง 2 server เป็น Ubuntu 22.04 LTS (หรือ 24.04)
- [ ] ตรวจสอบ server spec ขั้นต่ำ:
  - Server 1: RAM ≥ 4 GB, Disk ≥ 40 GB
  - Server 2: RAM ≥ 8 GB, Disk ≥ 100 GB (สำหรับ GPS history)
- [ ] Domain name ตั้งค่า A record ชี้ Server 1 แล้ว (ถ้ามี)
- [ ] Generate secrets ล่วงหน้า (ทำบน local ก่อน):
  ```bash
  openssl rand -base64 32   # → SESSION_SECRET
  openssl rand -base64 32   # → CRON_SECRET
  ```

---

### Phase 1 — Server 2: Data Server

> ทำ Server 2 ก่อนเสมอ เพราะ Server 1 ต้องการ connection ไป Server 2

#### 1.1 PostgreSQL + TimescaleDB

```bash
# ติดตั้ง PostgreSQL 16
sudo apt install -y postgresql-16

# ติดตั้ง TimescaleDB extension
sudo add-apt-repository ppa:timescale/timescaledb-ppa
sudo apt install -y timescaledb-2-postgresql-16
sudo timescaledb-tune --quiet --yes
sudo systemctl restart postgresql

# สร้าง database + user
sudo -u postgres psql <<EOF
CREATE USER ev_rental WITH PASSWORD '<strong-db-password>';
CREATE DATABASE ev_rental_go OWNER ev_rental;
\c ev_rental_go
CREATE EXTENSION IF NOT EXISTS timescaledb;
EOF
```

- [ ] PostgreSQL ทำงาน: `sudo systemctl status postgresql`
- [ ] TimescaleDB extension โหลดได้: `psql -U ev_rental -d ev_rental_go -c "SELECT extversion FROM pg_extension WHERE extname='timescaledb';"`

#### 1.2 Redis

```bash
sudo apt install -y redis-server
# แก้ bind address ใน /etc/redis/redis.conf → ให้ Server 1 เข้าถึงได้
sudo sed -i "s/bind 127.0.0.1/bind 127.0.0.1 <Server2-IP>/" /etc/redis/redis.conf
sudo systemctl restart redis
sudo systemctl enable redis
```

- [ ] Redis ทำงาน: `redis-cli ping` → `PONG`

#### 1.3 Firewall บน Server 2

```bash
sudo ufw allow from <Server1-IP> to any port 5432   # PostgreSQL
sudo ufw allow from <Server1-IP> to any port 6379   # Redis
sudo ufw deny 5432    # block จาก outside
sudo ufw deny 6379    # block จาก outside
sudo ufw enable
```

- [ ] Server 1 เชื่อม PostgreSQL ได้: `psql -h <Server2-IP> -U ev_rental -d ev_rental_go -c "SELECT 1;"`
- [ ] Server 1 เชื่อม Redis ได้: `redis-cli -h <Server2-IP> ping`

---

### Phase 2 — Server 1: App Server

#### 2.1 Node.js + pnpm

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# pnpm
npm install -g pnpm

# pm2 (process manager)
npm install -g pm2
```

- [ ] `node -v` → v20.x.x
- [ ] `pnpm -v` → 9.x.x
- [ ] `pm2 -v` → 5.x.x

#### 2.2 Deploy Next.js App

```bash
# clone repo
git clone <repo-url> /opt/ev-rental-backoffice
cd /opt/ev-rental-backoffice

# ติดตั้ง dependencies
pnpm install --frozen-lockfile

# build
pnpm build
```

- [ ] `pnpm build` สำเร็จ ไม่มี error

#### 2.3 ตั้งค่า Environment Variables

สร้างไฟล์ `/opt/ev-rental-backoffice/.env.local`:

```env
# Database (Server 2)
DATABASE_URL=postgresql://ev_rental:<db-password>@<Server2-IP>:5432/ev_rental_go

# Redis (Server 2)
REDIS_URL=redis://<Server2-IP>:6379

# Session — ใช้ key ที่ generate จาก Phase 0
SESSION_SECRET=<generated-session-secret>

# Cron job — ใช้ key ที่ generate จาก Phase 0
CRON_SECRET=<generated-cron-secret>

# App URL
NEXT_PUBLIC_PORTAL_URL=https://<domain-or-Server1-IP>

# Storage
STORAGE_PROVIDER=local
```

- [ ] ตรวจสอบทุก variable ถูกต้อง ไม่มีค่า placeholder เหลือ
- [ ] `SESSION_SECRET` ไม่ใช่ค่า dev (ต้อง generate ใหม่)
- [ ] `CRON_SECRET` ไม่ใช่ค่า dev (ต้อง generate ใหม่)

#### 2.4 Run Database Migration

```bash
cd /opt/ev-rental-backoffice
pnpm db:push
```

- [ ] Migration สำเร็จ ไม่มี error
- [ ] ตรวจสอบ tables: `psql -h <Server2-IP> -U ev_rental -d ev_rental_go -c "\dt"`
  - ต้องเห็น: `users`, `vehicles`, `customers`, `contracts`, `invoices`, `alerts`, `telemetry_history`, ฯลฯ
- [ ] สร้าง TimescaleDB hypertable:
  ```sql
  SELECT create_hypertable('telemetry_history', 'timestamp', if_not_exists => TRUE);
  ```

#### 2.5 สร้าง Admin User คนแรก

```bash
cd /opt/ev-rental-backoffice
pnpm db:seed   # ถ้ามี seed script
```

หรือ insert ตรง DB:
```sql
-- bcrypt hash ของ password ที่ต้องการ
INSERT INTO users (name, email, password_hash, role)
VALUES ('Super Admin', 'admin@company.com', '<bcrypt-hash>', 'super_admin');
```

- [ ] login ด้วย admin account ได้ที่ `http://<Server1-IP>:3000`

#### 2.6 Start Next.js ด้วย pm2

```bash
cd /opt/ev-rental-backoffice

pm2 start pnpm --name "ev-rental-backoffice" -- start
pm2 save
pm2 startup   # follow instructions เพื่อ auto-start หลัง reboot
```

- [ ] `pm2 status` → `ev-rental-backoffice` status: `online`
- [ ] `pm2 logs ev-rental-backoffice` → ไม่มี error
- [ ] เปิด `http://<Server1-IP>:3000` → เห็น login page

---

### Phase 3 — Billing Cron Jobs

> มี 2 jobs: (A) ออกใบแจ้งหนี้รายเดือนอัตโนมัติ และ (B) mark invoice ค้างชำระ

#### 3.1 สร้าง Cron File (2 jobs ในไฟล์เดียว)

```bash
sudo nano /etc/cron.d/ev-rental-billing
```

วางเนื้อหา (แทนที่ `<CRON_SECRET>` ด้วยค่าจาก `.env.local`):

```
# EV Rental — Billing cron jobs
# Secret ต้องตรงกับ CRON_SECRET ใน .env.local
CRON_SECRET=<generated-cron-secret>

# (A) ออกใบแจ้งหนี้อัตโนมัติ — รันทุกวัน 08:00
# - contract รายวัน (billingType=daily): สร้าง invoice ทุกวัน
# - contract รายเดือน (billingType=monthly): สร้าง invoice เฉพาะวันที่ 25 (สำหรับเดือนถัดไป)
0 8 * * * root /usr/bin/curl -sf \
  -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/generate-invoices \
  >> /var/log/ev-rental-cron.log 2>&1

# (B) Mark overdue invoices — รันทุกคืน 00:01
# เปลี่ยน pending invoice ที่เลย dueDate → overdue และสร้าง alert
1 0 * * * root /usr/bin/curl -sf \
  -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/mark-overdue \
  >> /var/log/ev-rental-cron.log 2>&1
```

```bash
# ตั้ง permission ให้ถูกต้อง
sudo chmod 640 /etc/cron.d/ev-rental-billing
sudo chown root:root /etc/cron.d/ev-rental-billing
```

#### 3.2 ทดสอบ Endpoints ทันที (ไม่ต้องรอ schedule)

```bash
CRON_SECRET="<generated-cron-secret>"

# ทดสอบ (A) generate-invoices — ระบุ period ที่ต้องการ (ใช้ ?year=&month= สำหรับ test)
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/cron/generate-invoices?year=2025&month=7" | python3 -m json.tool

# ทดสอบ (B) mark-overdue
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/mark-overdue | python3 -m json.tool
```

ผลลัพธ์ที่ถูกต้อง (generate-invoices):
```json
{
  "targetPeriod": "7/2025",
  "monthLabel": "กรกฎาคม 2568",
  "generated": 2,
  "skipped": 0,
  "durationMs": 45,
  "invoices": [...]
}
```

ผลลัพธ์ที่ถูกต้อง (mark-overdue):
```json
{
  "updated": 0,
  "alertsCreated": 0,
  "durationMs": 12
}
```

- [ ] generate-invoices ตอบ 200 และมี `generated` field
- [ ] mark-overdue ตอบ 200 และมี `updated` field
- [ ] ตรวจสอบ log file ถูกสร้าง: `ls -la /var/log/ev-rental-cron.log`

#### 3.3 ทดสอบ End-to-End (Smoke Test)

```bash
# Insert invoice ที่เลย dueDate ไปแล้ว
psql -h <Server2-IP> -U ev_rental -d ev_rental_go <<EOF
INSERT INTO invoices (invoice_no, customer_name, amount, due_date, billing_type, status)
VALUES ('INV-TEST-01', 'ทดสอบระบบ', 8000, '2025-01-01', 'monthly', 'pending');
EOF

# รัน cron job ทันที
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/mark-overdue | python3 -m json.tool

# ตรวจสอบว่าเปลี่ยนสถานะแล้ว
psql -h <Server2-IP> -U ev_rental -d ev_rental_go \
  -c "SELECT invoice_no, status, days_overdue FROM invoices WHERE invoice_no = 'INV-TEST-01';"

# ตรวจสอบ alert ถูกสร้าง
psql -h <Server2-IP> -U ev_rental -d ev_rental_go \
  -c "SELECT type, severity, message FROM alerts WHERE type = 'payment_overdue' ORDER BY created_at DESC LIMIT 3;"

# ลบ test data
psql -h <Server2-IP> -U ev_rental -d ev_rental_go \
  -c "DELETE FROM invoices WHERE invoice_no = 'INV-TEST-01';"
```

- [ ] `status` เปลี่ยนเป็น `overdue` ✅
- [ ] `days_overdue` มีค่าถูกต้อง ✅
- [ ] alert record ถูกสร้างใน `alerts` table ✅

---

### Phase 4 — IoT / Real-time (Sprint 3 + 4)

> ทำหลัง Phase 1–3 เสร็จแล้ว — ดู Sprint 4 สำหรับรายละเอียด IoT Gateway

- [ ] ติดตั้ง Mosquitto (MQTT Broker) บน Server 1
- [ ] Deploy IoT Gateway (separate repo — ดู SPRINT4.md)
- [ ] ตั้งค่า Mosquitto ACL (username/password per vehicle)
- [ ] ปิด GPS Simulator — ห้ามรันบน Production
- [ ] ทดสอบ: ส่ง MQTT message จาก laptop → เห็น vehicle ขยับบนแผนที่

---

### Phase 5 — Nginx Reverse Proxy + HTTPS (ถ้ามี domain)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# /etc/nginx/sites-available/ev-rental
server {
    server_name <domain>;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

sudo ln -s /etc/nginx/sites-available/ev-rental /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d <domain>
```

- [ ] `https://<domain>` เปิดได้ ไม่มี certificate warning
- [ ] HTTP redirect ไป HTTPS อัตโนมัติ

---

### Phase 6 — Final Verification (ทำก่อนส่งมอบ)

#### ระบบพื้นฐาน
- [ ] Login ด้วย super_admin ได้
- [ ] Dashboard โหลดได้ ไม่มี error ใน browser console
- [ ] เพิ่ม vehicle ได้ → ปรากฏในรายการ
- [ ] เพิ่ม customer ได้ → ปรากฏในรายการ

#### ระบบ Billing
- [ ] สร้าง Invoice ได้
- [ ] Invoice ที่ dueDate เลยวันนี้ → หลัง call cron endpoint → status เปลี่ยนเป็น `overdue`
- [ ] เปิดหน้า `/billing/overdue` → แสดง invoice ที่ overdue ถูกต้อง
- [ ] Alert feed บน Dashboard แสดง `payment_overdue` alert

#### Cron Job
- [ ] `cat /var/log/ev-rental-cron.log` — มี log entry (ตรวจวันถัดไปหลังติดตั้ง)
- [ ] Crontab ทำงาน: `sudo crontab -l -u root | grep ev-rental`

#### Process Management
- [ ] `pm2 status` → app `online`
- [ ] Reboot server แล้ว pm2 start อัตโนมัติ: `sudo reboot` → รอ 2 นาที → `pm2 status`
- [ ] `pm2 logs --lines 50` → ไม่มี uncaught exception

---

### Secrets Reference (เก็บไว้ใน Password Manager ลูกค้า)

| ชื่อ | ค่า | ใช้ที่ |
|---|---|---|
| `DATABASE_URL` | `postgresql://ev_rental:...` | `.env.local` |
| `SESSION_SECRET` | 32-byte base64 | `.env.local` |
| `CRON_SECRET` | 32-byte base64 | `.env.local` + `/etc/cron.d/ev-rental-billing` |
| `REDIS_URL` | `redis://<Server2-IP>:6379` | `.env.local` |
| PostgreSQL password | — | DB setup + `DATABASE_URL` |
| Admin email + password | — | login ครั้งแรก |

> ⚠️ **ห้าม** เก็บ secrets เหล่านี้ใน Git หรือส่งผ่าน chat — ใช้ Password Manager (Bitwarden, 1Password, ฯลฯ)

---

## 📝 Notes / Blockers

<!-- บันทึก blockers หรือ decisions ระหว่าง sprint -->

- **สิ่งที่ยังไม่ทำ (ตาม client):** Maintenance Kanban, Inspection Reports, Financial Report, Asset Report, Battery Health Report — เก็บไว้ทำถ้ามีการขยาย scope
