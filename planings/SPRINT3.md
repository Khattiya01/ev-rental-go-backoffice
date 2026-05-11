# 🟦 SPRINT 3 — Real-Time Fleet Operations

**ระยะเวลา:** 8 มิ.ย. 2569 – 21 มิ.ย. 2569 (14 วัน)  
**เป้าหมาย:** Live GPS Tracking, Geofencing, WebSocket real-time updates  
**Demo วันที่:** 21 มิ.ย. 2569  
**Prerequisites:** Sprint 1 + 2 ✅ (Auth, DB, CRUD, RBAC พร้อม)

> ⚠️ **หมายเหตุ:** Sprint นี้ต้องมี **IoT Gateway** (separate service) ทำงานอยู่เพื่อ push GPS → Redis
> ถ้า IoT Gateway ยังไม่พร้อม → ใช้ simulation script แทนก่อน (seed GPS positions ลง Redis ทุก 5 วินาที)

> 🚫 **Out of Scope ตามที่ลูกค้าแจ้ง:** Maintenance Kanban, Inspection Reports, Financial/Asset/Battery Reports

---

## 📊 Progress Overview

| Epic | Feature | BE | FE | Status |
|---|---|---|---|---|
| Fleet | Live GPS Map (Redis read) | ⬜ | ✅ | 🔴 BE Pending |
| Fleet | WebSocket real-time position | ⬜ | ⬜ | 🔴 Not Started |
| Fleet | Geofencing CRUD | ⬜ | ✅ | 🔴 BE Pending |
| Fleet | Geofence breach alert | ⬜ | ⬜ | 🔴 Not Started |
| Fleet | Vehicle clustering on map | ⬜ | ⬜ | 🔴 Not Started |

---

## 🗓️ Day-by-Day Plan

### WEEK 1 (8–14 มิ.ย.)

#### Day 1 — 8 มิ.ย.
**Focus: Redis Setup + GPS Data Layer**

- [ ] Install `ioredis` → `pnpm add ioredis`
- [ ] `lib/redis.ts` — Redis client singleton
- [ ] กำหนด Redis key convention: `vehicle:pos:{vehicle_id}` → `{ lat, lng, soc, speed, updated_at }`
- [ ] `app/api/vehicles/positions/route.ts` — GET all vehicle positions from Redis
  - [ ] fallback: ถ้า Redis miss → query last known position from PostgreSQL
- [ ] GPS Simulator script: `scripts/gps-simulator.ts`
  - [ ] loop ทุก 5 วินาที → random walk positions ของทุก vehicle → เขียนลง Redis
  - [ ] ใช้แทน IoT Gateway ระหว่าง dev/demo

#### Day 2 — 9 มิ.ย.
**Focus: WebSocket Server**

- [ ] `app/api/fleet/ws/route.ts` — WebSocket route handler (Next.js 16)
  - [ ] client connect → server push vehicle positions ทุก 5 วินาที
  - [ ] broadcast เฉพาะ vehicles ที่ position เปลี่ยนแปลง
- [ ] `lib/ws-broadcaster.ts` — manage connected clients + broadcast loop
- [ ] ทดสอบ WebSocket connection ด้วย websocat / browser devtools

#### Day 3 — 10 มิ.ย.
**Focus: Live Map FE เชื่อม WebSocket**

- [ ] `components/maps/FleetMap.tsx` — เชื่อม WebSocket แทน mock data
  - [ ] useEffect → connect WS → update vehicle positions in state
  - [ ] vehicle icons ขยับ real-time บน map
- [ ] `app/(backoffice)/fleet/map/page.tsx` — ลบ mockVehicles
- [ ] เพิ่ม vehicle clustering ด้วย `react-leaflet-cluster`
  - [ ] `pnpm add react-leaflet-cluster`
  - [ ] cluster vehicles ที่ zoom ออก → แสดงจำนวนใน cluster
- [ ] สังเกต: icon สีต่างตาม status ยังคงทำงาน

#### Day 4 — 11 มิ.ย.
**Focus: Dashboard Map เชื่อม real-time**

- [ ] `components/maps/DashboardMap.tsx` — เชื่อม API `/api/vehicles/positions`
  - [ ] poll ทุก 10 วินาที (ไม่ต้อง WS เพราะ dashboard ไม่ต้อง ultra real-time)
- [ ] Dashboard summary cards เชื่อม real position data
- [ ] Alert Feed — เพิ่ม low SoC alert (< 15%) จาก live positions

#### Day 5 — 12 มิ.ย.
**Focus: Geofencing BE**

- [ ] `db/schema/geofence_zones.ts` — (id, name, coordinates JSONB, active, alert_recipients JSONB, created_by)
- [ ] `app/api/geofences/route.ts` — GET list / POST create
- [ ] `app/api/geofences/[id]/route.ts` — GET / PUT / DELETE
- [ ] เชื่อม `fleet/geofencing/page.tsx` — zone list จาก DB จริง, toggle active ได้
- [ ] save zone ที่วาดบน map → POST ไป API

### WEEK 2 (15–21 มิ.ย.)

#### Day 6 — 15 มิ.ย.
**Focus: Geofence Breach Detection**

- [ ] `lib/geofence-checker.ts` — point-in-polygon algorithm
  - [ ] รับ vehicle position + active geofence list
  - [ ] return zones ที่ vehicle อยู่นอกขอบเขต
- [ ] ใน WebSocket broadcaster → เรียก geofence checker ทุก position update
  - [ ] ถ้า breach → สร้าง alert record ลง DB
  - [ ] push alert ไปยัง connected dashboard clients ด้วย WS
- [ ] `app/api/alerts/route.ts` — GET alerts รวม geofence breach alerts

#### Day 7–8 — 16–17 มิ.ย.
**Focus: Geofence Map Drawing UX**

- [ ] เชื่อม Leaflet.Draw หรือ manual polygon tool กับ save flow จริง
  - [ ] เมื่อ user วาด polygon เสร็จ → pre-fill zone name form
  - [ ] กด Save → POST `/api/geofences` → zone ปรากฏบน map ทันที
- [ ] Alert recipient config — เลือก admin users จาก DB (dropdown)
- [ ] ทดสอบ: สร้าง zone → ย้าย simulated vehicle ออกนอก zone → เห็น alert

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
REDIS_URL=redis://localhost:6379
```

---

## 📝 Notes / Blockers

<!-- บันทึก blockers หรือ decisions ระหว่าง sprint -->

- **สิ่งที่ยังไม่ทำ (ตาม client):** Maintenance Kanban, Inspection Reports, Financial Report, Asset Report, Battery Health Report — เก็บไว้ทำถ้ามีการขยาย scope
