# 🟧 SPRINT 4 — IoT Gateway Service

**ระยะเวลา:** 22 มิ.ย. 2569 – 5 ก.ค. 2569 (14 วัน)  
**เป้าหมาย:** IoT Gateway ทำงานได้เต็มรูปแบบ — รับ MQTT จากรถ, เขียน Redis, เขียน TimescaleDB, trigger alerts  
**Demo วันที่:** 5 ก.ค. 2569  
**Prerequisites:** Sprint 1–3 ✅, Redis + PostgreSQL + Mosquitto ติดตั้งบน Server แล้ว

> 📦 **Separate Repository** — IoT Gateway อยู่ใน repo แยก (ไม่ใช่ repo Next.js นี้)
> Stack: **Node.js + Express + TypeScript + pnpm**

> 🔗 **Contract กับ Next.js:** Redis key format `vehicle:pos:{vehicle_id}` ต้องตรงกับที่ GPS Simulator ใช้ใน Sprint 3
> Next.js ไม่รู้ว่าใครเขียน Redis — แค่อ่าน key เดิม

---

## 📊 Progress Overview

| Feature | Status |
|---|---|
| MQTT Subscriber (connect + subscribe + reconnect) | ⬜ Not Started |
| Payload Parser + Validator | ⬜ Not Started |
| Redis Writer (latest position) | ⬜ Not Started |
| PostgreSQL Writer (telemetry_history TimescaleDB) | ⬜ Not Started |
| Battery Alert trigger (SoC < 15%) | ⬜ Not Started |
| Vehicle offline detection | ⬜ Not Started |
| Vehicle status sync จาก IoT payload | ⬜ Not Started |
| MQTT Authentication (Mosquitto ACL) | ⬜ Not Started |
| Express Health Check + Status API | ⬜ Not Started |
| Error handling + Graceful reconnect ทุก service | ⬜ Not Started |
| Integration test เทียบกับ GPS Simulator | ⬜ Not Started |
| Production deployment บน Server 1 | ⬜ Not Started |

---

## 📐 MQTT Contract (ข้อตกลงกับ IoT Device Vendor)

> กำหนดก่อนเขียน code ทุกบรรทัด — ทั้ง IoT device และ Gateway ต้องใช้ format นี้

### Topic Structure

```
vehicle/{vehicle_id}/data   ← ข้อมูลหลัก (GPS + Battery + Status)
```

> ใช้ `vehicle_id` (UUID จาก PostgreSQL) ไม่ใช่ plate number เพราะ plate เปลี่ยนได้

### Payload Format (JSON)

```json
{
  "vehicle_id": "550e8400-e29b-41d4-a716-446655440000",
  "lat": 13.7563,
  "lng": 100.5018,
  "speed": 45.5,
  "heading": 180,
  "soc": 78.5,
  "temperature": 35.2,
  "odometer": 12450,
  "charge_cycles": 142,
  "status": "rented",
  "timestamp": "2025-06-08T10:30:00.000Z"
}
```

| Field | Type | หน่วย | หมายเหตุ |
|---|---|---|---|
| `vehicle_id` | string (UUID) | — | ต้องมีใน DB ไม่งั้น reject |
| `lat` | number | degrees | -90 ถึง 90 |
| `lng` | number | degrees | -180 ถึง 180 |
| `speed` | number | km/h | 0–200 |
| `heading` | number | degrees | 0–360 |
| `soc` | number | % | 0–100 |
| `temperature` | number | °C | -20–80 |
| `odometer` | number | km | cumulative |
| `charge_cycles` | number | ครั้ง | cumulative |
| `status` | string | — | available, rented, charging, under_repair |
| `timestamp` | string | ISO 8601 | UTC |

### Redis Key Format (ต้องตรงกับ GPS Simulator ใน Sprint 3)

```
key:   vehicle:pos:{vehicle_id}
value: { lat, lng, speed, heading, soc, temperature, status, updated_at }
TTL:   300 วินาที (5 นาที) — ถ้าหมด = vehicle offline
```

---

## 🗄️ DB Schema ที่ต้องเพิ่มใน Next.js Repo (ทำก่อน Sprint 4 เริ่ม)

> ⚠️ **Gap จาก Sprint 2** — Sprint 2 Day 2 query TimescaleDB แต่ table ยังไม่มีใน `db/schema/`
> ต้องเพิ่มใน **Next.js repo** เพราะ Drizzle ORM manage schema ที่นั่น

### `db/schema/telemetry_history.ts` (ใน Next.js repo)

```ts
// TimescaleDB hypertable — partition by timestamp
// สร้าง hypertable ด้วย: SELECT create_hypertable('telemetry_history', 'timestamp');

export const telemetryHistory = pgTable('telemetry_history', {
  id:           bigserial('id'),
  vehicleId:    uuid('vehicle_id').notNull().references(() => vehicles.id),
  lat:          doublePrecision('lat').notNull(),
  lng:          doublePrecision('lng').notNull(),
  speed:        doublePrecision('speed').notNull().default(0),
  heading:      integer('heading').default(0),
  soc:          doublePrecision('soc').notNull(),
  temperature:  doublePrecision('temperature'),
  odometer:     integer('odometer'),
  chargeCycles: integer('charge_cycles'),
  timestamp:    timestamp('timestamp', { withTimezone: true }).notNull(),
})
```

> Sprint 2 Telematics API ใช้ table นี้ query SoC graph + charge cycles
> IoT Gateway INSERT ลง table นี้ทุก message

---

## 🗓️ Day-by-Day Plan

### WEEK 1 (22–28 มิ.ย.) — Core Pipeline

#### Day 1 — 22 มิ.ย.
**Focus: Project Setup + MQTT Contract**

- [ ] สร้าง repo ใหม่ `ev-rental-iot-gateway`
- [ ] `pnpm init` + ติดตั้ง dependencies:
  ```
  pnpm add express mqtt ioredis pg dotenv zod
  pnpm add -D typescript @types/express @types/node ts-node nodemon
  ```
- [ ] `tsconfig.json` — strict mode, target ES2022
- [ ] `src/index.ts` — Express app entry point
- [ ] `.env.example`:
  ```env
  MQTT_URL=mqtt://localhost:1883
  MQTT_USERNAME=iot_gateway
  MQTT_PASSWORD=secret
  REDIS_URL=redis://localhost:6379
  DATABASE_URL=postgresql://user:pass@localhost:5432/ev_rental
  OFFLINE_TIMEOUT_SECONDS=300
  PORT=3001
  ```
- [ ] เพิ่ม `db/schema/telemetry_history.ts` ใน **Next.js repo** + run migration

#### Day 2 — 23 มิ.ย.
**Focus: MQTT Subscriber**

- [ ] `src/mqtt/client.ts` — MQTT client singleton
  - [ ] connect ด้วย `MQTT_USERNAME` + `MQTT_PASSWORD`
  - [ ] subscribe `vehicle/+/data` (wildcard ทุกคัน)
  - [ ] auto-reconnect เมื่อ connection หลุด (exponential backoff)
  - [ ] log: connected / reconnecting / disconnected
- [ ] `src/mqtt/handler.ts` — จัดการ message ที่รับมา
  - [ ] parse JSON payload
  - [ ] ส่งต่อไป validator ก่อน process

#### Day 3 — 24 มิ.ย.
**Focus: Payload Validator**

- [ ] `src/validators/telemetry.ts` — Zod schema ตาม MQTT Contract
  - [ ] validate ทุก field + type
  - [ ] reject ถ้า `vehicle_id` ไม่ใช่ UUID format
  - [ ] reject ถ้า lat/lng อยู่นอก range ที่กำหนด
  - [ ] reject ถ้า `timestamp` เก่ากว่า 60 วินาที (clock drift protection)
- [ ] `src/services/vehicle-validator.ts`
  - [ ] query PostgreSQL ตรวจว่า `vehicle_id` มีอยู่จริงใน DB
  - [ ] cache ผลลัพธ์ใน memory Map (TTL 5 นาที) ไม่ต้อง query ทุก message
  - [ ] reject message ถ้า vehicle ไม่มีใน DB

#### Day 4 — 25 มิ.ย.
**Focus: Redis Writer**

- [ ] `src/redis/client.ts` — Redis client singleton
  - [ ] handle connect error gracefully (log + retry ไม่ crash)
- [ ] `src/services/redis-writer.ts`
  - [ ] `SET vehicle:pos:{vehicle_id}` ด้วย payload ที่ผ่าน validate
  - [ ] `EX 300` (TTL 5 นาที — ถ้าหมดแปลว่า offline)
  - [ ] ตรวจ key format ตรงกับ GPS Simulator ใน Sprint 3 ✅

#### Day 5 — 26 มิ.ย.
**Focus: PostgreSQL Writer (TimescaleDB)**

- [ ] `src/db/client.ts` — PostgreSQL pool (node-pg)
- [ ] `src/services/telemetry-writer.ts`
  - [ ] INSERT ลง `telemetry_history` ทุก message ที่ผ่าน validate
  - [ ] ใช้ batch insert (buffer 10 records หรือทุก 2 วินาที) เพื่อลด DB load
  - [ ] handle INSERT error → log แต่ไม่ crash process

### WEEK 2 (29 มิ.ย. – 5 ก.ค.) — Smart Features + Production

#### Day 6 — 29 มิ.ย.
**Focus: Battery Alert + Vehicle Status Sync**

- [ ] `src/services/alert-service.ts`
  - [ ] ตรวจ `soc < 15` ทุก message → INSERT ลง `alerts` table ใน PostgreSQL
  - [ ] **Debounce:** ไม่สร้าง alert ซ้ำถ้า alert เดิมยัง `resolved = false` อยู่
  - [ ] severity: `warning` ถ้า soc 15–20%, `critical` ถ้า < 15%
- [ ] `src/services/vehicle-sync.ts`
  - [ ] เปรียบ `status` ใน payload กับ DB — ถ้าต่างกัน → UPDATE `vehicles.status`
  - [ ] UPDATE `vehicles.soc_percent` ทุก message
  - [ ] UPDATE `vehicles.odometer` ถ้า payload odometer > DB odometer (ป้องกัน rollback)

#### Day 7 — 30 มิ.ย.
**Focus: Vehicle Offline Detection**

- [ ] `src/services/offline-detector.ts`
  - [ ] cron ทุก 60 วินาที → scan Redis keys `vehicle:pos:*`
  - [ ] vehicle ใดที่ key หมด TTL (ไม่มีใน Redis) = offline
  - [ ] UPDATE `vehicles.status = 'offline'` ใน PostgreSQL
  - [ ] สร้าง alert type `vehicle_offline` ลง DB
  - [ ] เมื่อ vehicle กลับมาส่ง data → Redis key กลับมา → UPDATE status กลับ (ตาม payload.status)

#### Day 8 — 1 ก.ค.
**Focus: MQTT Authentication + Express API**

- [ ] ตั้งค่า Mosquitto ACL (`/etc/mosquitto/passwd` + `acl_file`)
  - [ ] สร้าง user `iot_gateway` สำหรับ Gateway subscribe
  - [ ] สร้าง user per vehicle หรือ shared vehicle user สำหรับ publish
  - [ ] policy: vehicle publish ได้เฉพาะ topic `vehicle/{own_id}/data`
- [ ] `src/api/health.ts` — Express route
  - [ ] `GET /health` → `{ status: "ok", mqtt: bool, redis: bool, db: bool }`
- [ ] `src/api/status.ts`
  - [ ] `GET /status` → จำนวน vehicle ที่ online (มี Redis key), message rate ต่อนาที

#### Day 9 — 2 ก.ค.
**Focus: Error Handling + Resilience**

- [ ] MQTT reconnect: exponential backoff 1s → 2s → 4s → ... max 60s
- [ ] Redis: ถ้า connect fail → log error + ต่อ process (ไม่ crash) → retry background
- [ ] PostgreSQL: ถ้า INSERT fail → log + ต่อ process → retry ครั้งถัดไป
- [ ] Graceful shutdown: `SIGTERM` → drain pending writes → close connections → exit 0
- [ ] Structured logging ด้วย `console.log` JSON format:
  ```json
  { "level": "info", "ts": "...", "event": "gps_received", "vehicle_id": "..." }
  ```

#### Day 10 — 3 ก.ค.
**Focus: Integration Test เทียบกับ GPS Simulator**

- [ ] รัน GPS Simulator (Sprint 3) และ IoT Gateway พร้อมกัน
- [ ] ตรวจว่า Redis key format ตรงกัน 100% (field names, types)
- [ ] ตรวจว่า Next.js อ่าน positions ได้ทั้งจาก Simulator และ Gateway
- [ ] ตรวจ `telemetry_history` table มี rows เพิ่มขึ้นทุก message
- [ ] ตรวจ battery alert สร้าง record เมื่อ soc < 15%
- [ ] ตรวจ offline detection ทำงาน (หยุด Gateway 6 นาที → vehicle → offline)
- [ ] ตรวจ `GET /health` response ครบ

#### Day 11 — 4 ก.ค.
**Focus: Production Deployment บน Server 1**

- [ ] copy repo ขึ้น Server 1
- [ ] ตั้งค่า `.env` ชี้ Server 2 (Redis + PostgreSQL)
- [ ] ติดตั้ง Mosquitto บน Server 1 + ตั้งค่า auth
- [ ] รัน IoT Gateway ด้วย `pm2` (process manager)
  ```bash
  pm2 start dist/index.js --name iot-gateway
  pm2 save
  pm2 startup
  ```
- [ ] ตรวจ `GET /health` จาก Server 1 → ทุก service green
- [ ] ปิด GPS Simulator (ไม่รันบน Production)

#### Day 12 — 5 ก.ค. 🎯 DEMO DAY
**Focus: End-to-End Test + Handoff**

- [ ] ทดสอบ: ส่ง MQTT message จาก laptop → Broker → Gateway → Redis → Next.js map ขยับ
- [ ] ทดสอบ: ส่ง soc < 15% → alert ปรากฏใน dashboard feed
- [ ] ทดสอบ: หยุดส่ง message → vehicle icon เป็น offline ใน 5 นาที
- [ ] ทดสอบ: Next.js WebSocket + geofence breach (ใช้ข้อมูลจาก Gateway จริง)
- [ ] `GET /status` แสดงจำนวน vehicle online ถูกต้อง

---

## 🏗️ โครงสร้าง Project (Separate Repo)

```
ev-rental-iot-gateway/
  src/
    index.ts              ← Entry point (Express + start all services)
    mqtt/
      client.ts           ← MQTT connection + subscribe
      handler.ts          ← Message router
    redis/
      client.ts           ← Redis singleton
    db/
      client.ts           ← PostgreSQL pool
    validators/
      telemetry.ts        ← Zod schema ตาม MQTT Contract
    services/
      vehicle-validator.ts ← ตรวจ vehicle_id มีใน DB
      redis-writer.ts     ← เขียน latest position
      telemetry-writer.ts ← เขียน gps_history (batch)
      alert-service.ts    ← battery alert + debounce
      vehicle-sync.ts     ← sync status + soc + odometer
      offline-detector.ts ← cron ตรวจ TTL หมด
    api/
      health.ts           ← GET /health
      status.ts           ← GET /status
  .env.example
  package.json
  tsconfig.json
```

---

## 📦 Dependencies

```bash
# Runtime
pnpm add express mqtt ioredis pg dotenv zod node-cron

# Dev
pnpm add -D typescript @types/express @types/node @types/pg ts-node nodemon
```

---

## ⚙️ Environment Variables

```env
# MQTT Broker (Mosquitto บน Server 1)
MQTT_URL=mqtt://localhost:1883
MQTT_USERNAME=iot_gateway
MQTT_PASSWORD=your_secret

# Redis (Server 2)
REDIS_URL=redis://192.168.x.x:6379

# PostgreSQL (Server 2)
DATABASE_URL=postgresql://user:pass@192.168.x.x:5432/ev_rental

# Config
OFFLINE_TIMEOUT_SECONDS=300
TELEMETRY_BATCH_SIZE=10
TELEMETRY_BATCH_INTERVAL_MS=2000
PORT=3001
```

---

## ⚠️ Gap Fix ที่ต้องทำก่อน Sprint 4 เริ่ม (ใน Next.js Repo)

| งาน | ทำใน | เหตุผล |
|---|---|---|
| เพิ่ม `db/schema/telemetry_history.ts` | Next.js repo | Sprint 2 Day 2 Telematics API query table นี้ แต่ยังไม่มี |
| run `pnpm db:push` | Next.js repo | สร้าง table ใน PostgreSQL |
| run `SELECT create_hypertable(...)` | PostgreSQL | เปิด TimescaleDB compression |
| Sprint 2 Day 2 telematics API อ่าน table จริง | Next.js repo | ตอนนี้ยัง pending อยู่ |

---

## 📝 Notes

- **IoT device vendor** ต้องได้รับ MQTT Contract (topic + payload format) ก่อน Sprint 4 เริ่ม
- Gateway ไม่ทำ geofence breach detection — ยังคงอยู่ที่ Next.js WebSocket broadcaster (Sprint 3) เพราะ geofence polygon data อยู่ใน PostgreSQL ที่ Next.js manage อยู่แล้ว
- `pm2` คือ process manager สำหรับ Node.js บน Production — auto-restart เมื่อ crash + auto-start หลัง reboot
