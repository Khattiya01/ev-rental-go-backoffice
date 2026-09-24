# A1 — Inventory ของโปรเจกต์เดิม (EV Rental GO — Web Backoffice)

> บันทึกย้อนหลังจากการสำรวจโค้ดจริง (subagent `legacy-explorer` + ตรวจซ้ำด้วยการรันคำสั่งจริงในเทอร์มินัลหลัก)
> วันที่สำรวจ: 2026-09-24 · commit `a4b4dc6`

## 1. Stack (จาก package.json / lockfile จริง — ไม่ใช่จากคำโฆษณาใน AGENTS.md)

| Layer | ของจริง | หมายเหตุ |
|---|---|---|
| Framework | Next.js 16.2.6 (App Router) | ใช้ custom `server.ts` (http + ws) แทน `next start` ตรงๆ |
| Language | TypeScript 5, strict | `tsc --noEmit` ผ่านสะอาด (0 error) |
| Styling | Tailwind CSS v4 | ไม่มี `tailwind.config.ts` — ใช้ `postcss.config.mjs` เท่านั้น (ปกติของ Tailwind v4) |
| UI library | **hand-rolled ล้วน** ใน `components/ui/` (23 ไฟล์) | ไม่มี `components.json` → **ไม่ได้ใช้ shadcn/ui** แม้ AGENTS.md จะเขียนไว้ว่าใช้ |
| ORM | Drizzle ORM 0.45.2 + PostgreSQL/TimescaleDB | `db/schema/` คือ source of truth (15 ตาราง) |
| Auth | **custom JWT ผ่าน `jose` 6.2.3** + httpOnly cookie + bcryptjs | ไม่ใช่ NextAuth v5 ตามที่ AGENTS.md เขียนไว้ — เอกสารผิด |
| i18n | next-intl 4.11.1 | th/en, locale จาก cookie ใน `i18n/request.ts` |
| Maps | Leaflet 1.9.4 + react-leaflet 5 + react-leaflet-cluster | ตรงตามเอกสาร |
| Charts | Recharts 3.8.1 | wrapper เองใน `components/charts/` |
| Real-time | `ws` 8.21 ผ่าน custom `server.ts`, อ่าน Redis (ioredis) | ตรงตาม data flow ที่ AGENTS.md อธิบาย |
| Payment | Stripe 22.3.2 (รวม PromptPay) + `@napi-rs/canvas` สร้าง PDF ใบเสร็จ | **ฟีเจอร์ใหม่ที่ AGENTS.md ยังไม่พูดถึง** |
| Validation | Zod 4.4.3 อยู่ใน dependency แต่ **ไม่ได้ใช้จริงใน route handler ส่วนใหญ่** (validate มือแทน) | ช่องว่างที่ควรรู้ ไม่ใช่ของด่วน |
| Test runner | Vitest 4.1.9 (unit) + Playwright 1.61.1 (e2e, มี suite แยกสำหรับ IoT gateway) | ดูข้อ 7 |
| Lint | ESLint 9 + `eslint-config-next` 16.2.6 (flat config) | ดูข้อ 3 — เจอ config bug |

## 2. โครงโฟลเดอร์จริง เทียบกับที่ AGENTS.md เขียนไว้

โครงหลัก (`app/`, `components/`, `db/`, `lib/`, `i18n/`, `messages/`) **ตรงกับที่ AGENTS.md อธิบาย** ส่วนที่ต่างคือ:

- มีของใหม่ที่ยังไม่ถูกบันทึก: `app/(backoffice)/alerts/`, `app/(backoffice)/settings/payment/`, `app/(backoffice)/settings/permissions/`, `app/(backoffice)/settings/audit-log/`, `app/api/webhooks/stripe/`, `app/api/cron/*`
- `app/register/` (public self-registration) มีแค่ API (`app/api/public/register`) — หน้า UI `app/register/page.tsx` มีอยู่จริงด้วย (ตรงตามที่เอกสารระบุ)
- `components/ui/` เป็นโค้ดของทีมเอง 100% ไม่ใช่ของ generate จาก CLI ไหน — **แก้ไขได้อิสระ ไม่ต้อง protect**
- `db/migrations/meta/` มีแค่ snapshot/journal ของ Drizzle Kit ไม่มีไฟล์ SQL migration ดิบอยู่ในโฟลเดอร์ — ใช้ `db:push` เป็นหลักในการซิงก์ schema

## 3. คำสั่งที่มีจริง และผลตอนรันจริง (ตรวจซ้ำในเทอร์มินัลหลัก ไม่ใช่แค่รายงานจาก subagent)

| Script ใน package.json | คำสั่ง | ผลตอนรันจริง |
|---|---|---|
| `dev` / `start` / `dev:test` | `tsx --env-file=... server.ts` | ไม่ได้รัน (long-running) |
| `build` | `next build` | ✅ **ผ่าน** — build สำเร็จทุก route |
| `lint` | `eslint` | ⚠️ ดูรายละเอียดด้านล่าง — ตัวเลขดิบหลอกตา |
| `test` | `vitest run` | ⚠️ ดูรายละเอียดด้านล่าง |
| `test:e2e` / `test:e2e:gateway` | `playwright test` | ไม่ได้รัน (ต้องมี DB/server จริง) |
| — | `npx tsc --noEmit` (ไม่มี script `typecheck` จริงใน package.json แม้ AGENTS.md จะอ้างถึง) | ✅ **ผ่านสะอาด 0 error** |

**🔴 พบ config bug 2 จุด ที่ทำให้ผลลัพธ์ verify โกหก (ยังไม่ได้แก้ — รอ user ตัดสินใจใน A.2):**

1. **`eslint.config.mjs`** — `globalIgnores` มีแค่ `.next/`, `out/`, `build/`, `next-env.d.ts` แต่โปรเจกต์นี้มีโฟลเดอร์ build แยกสำหรับ test env ชื่อ `.next-test/` ซึ่ง**ไม่ถูก ignore** ผลคือ `pnpm lint` ไปสแกน JS ที่ compile/minify แล้วในนั้น ทำให้ตัวเลขดิบขึ้นเป็น **11,814 problems (1,083 errors)**
   เมื่อกรอง `.next-test/` และ `.scannerwork/` ออก (โฟลเดอร์ generated ล้วน ไม่ใช่ source) เหลือของจริงจากซอร์สโค้ดแค่ **27 ไฟล์ที่มีปัญหา = 21 errors, 29 warnings**
2. **`vitest.config.ts`** — `include: ['**/*.test.{ts,tsx}']` ไปแมตช์ไฟล์ `drizzle.config.test.ts` (ตั้งชื่อแบบนั้นเพราะเป็น drizzle config สำหรับ test DB ไม่ใช่ test file) → vitest พยายามรันเป็น test suite แล้ว fail เพราะไม่มี test อยู่ข้างใน ผลจริงคือ **89 tests ผ่านหมดใน 11 ไฟล์เทสจริง** ส่วนไฟล์ที่ 12 คือ false-positive จาก naming collision

**ของจริงหลังกรอง noise ออก:**
- Type check: **0 error**
- Build: **ผ่าน**
- Unit test: **89 ผ่าน / 89** (ของจริง ไม่นับ false-positive)
- Lint (เฉพาะซอร์สโค้ดจริง): **21 errors, 29 warnings** ใน 27 ไฟล์

**21 error ของจริงเกือบทั้งหมด (18/21) เป็นกฎเดียว: `react-hooks/set-state-in-effect`** — กฎใหม่จาก `eslint-plugin-react-hooks` เวอร์ชันที่มากับ Next 16 ที่กำหนดว่า "ห้ามเรียก setState ตรงๆ ใน `useEffect`" เพราะโปรเจกต์นี้ใช้ pattern `useEffect(() => { fetch(...).then(json => setState(json)) }, [])` เป็น convention หลักในการดึงข้อมูลแทบทุกหน้า (fetch-on-mount) — ไม่ใช่บั๊กใหม่ที่เพิ่งเกิด แต่เป็น convention เดิมที่ชนกับกฎ lint ใหม่ที่มากับการอัปเกรด dependency พบใน 15 หน้า/component: `billing/invoices/[id]`, `billing/invoices`, `billing/overdue`, `contracts/[id]`, `customers/[id]`, `customers/blacklist`, `fleet/geofencing`, `settings/audit-log`, `settings/permissions`, `settings/pricing`, `settings/users`, `components/ui/contract-form.tsx`, `components/ui/modal.tsx`, `components/ui/registration-link-modal.tsx`, `components/ui/vehicle-form-modal.tsx`
ที่เหลืออีก 3 error เป็น `react/no-unescaped-entities` (เครื่องหมาย `"` ดิบใน JSX) ที่ `fleet/geofencing/page.tsx` — แก้ง่าย ไม่เกี่ยวกับ pattern

→ **ตัดสินใจเรื่องนี้อยู่ใน A.2 ของ `_state.md`** ไม่ตัดสินใจในเอกสารนี้

## 4. Convention ที่ใช้จริง (จากการอ่านโค้ด ไม่ใช่จาก README)

- **API route handler**: หนึ่งโฟลเดอร์ต่อ resource, export `GET/POST/PATCH/DELETE` แบบ named async function, ครอบด้วย try/catch, ตอบ error เป็น `NextResponse.json({ error }, { status })`
- **Auth guard ใน route**: เรียก `getCurrentUser()` แล้ว `requirePermission(user, resource, action)` — คืน `null` = ผ่าน, คืน `NextResponse` = 403 (pattern `if (denied) return denied`)
- **Validation**: ทำมือ (type coercion + guard) แม้จะมี zod ติดตั้งอยู่ — ยังไม่ใช้ schema-based validation จริง
- **Component**: server component เป็นค่าเริ่มต้น, `'use client'` เฉพาะที่ต้อง interactive/browser API (map, form, modal) — ตรงตามที่ AGENTS.md ระบุ
- **DB query**: Drizzle query builder ตรงๆ (`db.select().from().where()`), ใช้ `$inferSelect` / `$inferInsert` สำหรับ type, มี `version` field ทำ optimistic lock ใน `vehicles`/`contracts`
- **Data fetching ฝั่ง client**: `useEffect` + `fetch` ตรงๆ ไม่ผ่าน library อย่าง SWR/React Query (นี่คือที่มาของปัญหาข้อ 3)

## 5. โฟลเดอร์ auto-generated / ห้ามแก้มือ

| โฟลเดอร์ | สถานะ |
|---|---|
| `.next/`, `.next-test/` | auto-generated โดย Next.js build — gitignored |
| `node_modules/` | auto-generated โดย pnpm |
| `db/migrations/meta/` | auto-generated โดย Drizzle Kit (snapshot/journal) |
| `e2e/.auth/` | auto-generated โดย Playwright (cache session login) |
| `components/ui/` | **ไม่ใช่ auto-generated — เป็นโค้ดของทีม แก้ได้อิสระ** (ไม่มี shadcn CLI เกี่ยวข้อง) |

→ `stack.json.protected` ไม่ต้องกัน `components/ui/**`

## 6. Data model (source of truth = `db/schema/`)

15 ตารางใน `db/schema/*.ts` (re-export จาก `index.ts`): `vehicles`, `customers`, `contracts`, `invoices`, `payments`, `telemetry_history` (TimescaleDB hypertable), `alerts`, `geofence_zones`, `users`, `role_permissions`, `audit_logs`, `pricing_plans`, `registration-links`, `settings` — ครบตาม core entities ที่ AGENTS.md ระบุ บวก `payments`/`role_permissions`/`audit_logs` ที่เป็นของใหม่กว่าเอกสาร schema ตรงกับ business domain (vehicle status lifecycle, e-KYC workflow, billing) — ยึดเป็น source of truth ตั้งแต่วันนี้

## 7. เทส

- **Unit (Vitest)**: 11 ไฟล์เทสจริงใน `lib/` ครอบ permissions/RBAC, session JWT, geofence math, invoice period, overdue calc, date parsing, storage, ws hook — **89 test ผ่านหมด**
- **E2E (Playwright)**: 8 spec ใน `e2e/` ครอบ auth, RBAC visibility, alerts, blacklist, cron billing, remote control (motor cutoff) + suite แยก `@gateway` อีก 3 spec ที่ต้องมี IoT gateway รันอยู่จริง — ไม่ได้รันจริงรอบนี้ (ต้องมี DB/Redis/server)
- ไม่ได้วัด coverage number (ไม่มี config coverage)

## 8. CI/CD

ไม่มี `.github/workflows/` เลย — ยังไม่มี pipeline อัตโนมัติใดๆ (lint/test/deploy ทำมือทั้งหมดตอนนี้) โฟลเดอร์ `.github/agents/` ที่มีอยู่เป็นนิยาม role agent สำหรับ Claude Code เท่านั้น ไม่เกี่ยวกับ CI

## 9. เอกสารเดิมที่ไม่ตรงกับโค้ด (ถือโค้ดเป็นความจริง)

| คำกล่าวอ้างใน AGENTS.md | ของจริง |
|---|---|
| "Auth: NextAuth v5" | custom JWT (`jose`) + httpOnly cookie — **ไม่ใช่ NextAuth** |
| "UI library" เป็นนัยว่าจะใช้ระบบ component registry | hand-rolled component ทั้งหมด ไม่มี shadcn |
| หน้า/ฟีเจอร์ที่ระบุไว้ | ครบ + มีเพิ่ม: `/alerts`, `/settings/payment` (Stripe), `/settings/permissions`, `/settings/audit-log`, cron jobs (generate-invoices, mark-overdue, payment-reminders) |

## 10. งานค้าง / signal อื่น

- Git: อยู่ที่ `main`, sync กับ origin, ไม่มี uncommitted change (ยกเว้น `docs/` ที่เพิ่งสร้างจาก Buaflow เอง)
- Branch อื่นที่มีอยู่: `dev`, `prd`, `uat`, `release-sprint4`, `release-sprint5` — ไม่ได้ตรวจว่ามี PR เปิดค้างอยู่หรือไม่ (ต้องดูใน git host)
- ไม่มีระบบ issue tracker ในเอกสาร repo (มี sprint docs เก่าที่โฟลเดอร์แม่ `EV_Rental_GO/planings/` ซึ่งอยู่นอก scope ของ backoffice repo นี้) → ตัดสินใจเรื่อง source of truth ของงานอยู่ใน A.6

## สิ่งที่เจอแต่ยังไม่แก้ (บันทึกไว้ตาม A.7 — ไปเป็น intent ทีหลัง ไม่ใช่ทำเลย)

- Validation แบบมือใน route handler ทั้งที่มี zod อยู่แล้ว
- ไม่มี OpenAPI spec แม้ AGENTS.md บอกว่า "ต้องมี OpenAPI เสมอเมื่อมี API"
- Data-fetching pattern (`useEffect` + `fetch` ตรงๆ) ชนกับกฎ lint ใหม่ทั้งระบบ — อาจต้องพิจารณา custom hook หรือ data-fetching library ในอนาคต (ไม่ใช่ตอนนี้)
- ไม่มี rate limiting บน `/api/auth/login` และ webhook endpoints
