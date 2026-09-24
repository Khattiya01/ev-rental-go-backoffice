# ADR-0004: Drizzle ORM + PostgreSQL/TimescaleDB เป็นชั้นข้อมูล

- **สถานะ:** Accepted — **บันทึกย้อนหลัง: ตัดสินใจไปแล้วก่อนใช้ Buaflow**
- **วันที่ตัดสินใจจริง:** ไม่ทราบวันที่แน่ชัด (ก่อนเริ่มใช้ Buaflow) · บันทึกย้อนหลังวันที่ 2026-09-24
- **ผู้ตัดสินใจ:** ทีมพัฒนา EV Rental GO

## บริบท
ระบบต้องเก็บทั้งข้อมูลธุรกิจปกติ (customers, contracts, invoices — relational) และข้อมูล GPS/telemetry
ความถี่สูง (ทุก 1–5 วินาทีต่อคัน, สูงสุด ~100 คัน) ซึ่งเป็น time-series ล้วนๆ และต้อง query ย้อนหลังเพื่อทำรายงานได้

## ทางเลือกที่พิจารณา

### ทางเลือก 1: Prisma + PostgreSQL
- ข้อดี: DX ดี, migration tool ครบ, ใช้แพร่หลาย
- ข้อเสีย: query builder เป็น abstraction ที่ห่างจาก SQL จริง ปรับ query ซับซ้อน (aggregate รายงานการเงิน) ทำยากกว่า

### ทางเลือก 2: Drizzle ORM + PostgreSQL + TimescaleDB extension
- ข้อดี: query builder ใกล้เคียง SQL จริง, type-safe จาก schema (`$inferSelect`/`$inferInsert`), TimescaleDB hypertable จัดการ time-series data (`telemetry_history`) ได้มีประสิทธิภาพกว่า table ธรรมดา
- ข้อเสีย: ecosystem/tooling เล็กกว่า Prisma, ทีมต้องเข้าใจ SQL มากกว่าใช้ ORM ทั่วไป

## การตัดสินใจ
**เลือก: Drizzle ORM บน PostgreSQL พร้อม TimescaleDB extension สำหรับตาราง `telemetry_history`**

เหตุผล:
- อยากคุม SQL/query เองและได้ type-safety ไปพร้อมกัน — เหมาะกับ query รายงานสรุปที่ซับซ้อน (dashboard summary, revenue chart)
- TimescaleDB รองรับ GPS history แบบ time-series ได้มีประสิทธิภาพกว่า PostgreSQL ตารางธรรมดา (ตามที่ระบุใน AGENTS.md หัวข้อ IoT Gateway)

## ผลที่ตามมา
**ผลดี:**
- Query ซับซ้อน (join, aggregate, sql tag) เขียนได้ตรงไปตรงมา ไม่ต้องหลบ abstraction ของ ORM
- Type inference จาก schema เดียว (`db/schema/`) ใช้ได้ทั้ง backend และ shared types

**ผลเสีย / สิ่งที่ต้องยอมรับ:**
- ไม่มีไฟล์ SQL migration ดิบ commit ไว้ในโปรเจกต์ตอนนี้ (มีแค่ `db/migrations/meta/` snapshot/journal) — ใช้ `db:push` เป็นหลักในการซิงก์ schema ระหว่าง dev ซึ่งเสี่ยงถ้าใช้ `db:push` ตรงกับ production โดยไม่ผ่าน migration ที่ review แล้ว

**สิ่งที่ต้องทำเพิ่มเพราะเลือกแบบนี้:**
- พิจารณาเปลี่ยนไปใช้ `db:generate` + `db:migrate` (migration ไฟล์จริง) แทน `db:push` ตรงๆ สำหรับ production ในอนาคต (บันทึกเป็น intent ในข้อ A.7 ไม่ใช่ทำตอนนี้)

## ทบทวนเมื่อไหร่
ถ้าทีมโตและต้องการ migration history ที่ review ได้ก่อน apply เข้า production หรือถ้าปริมาณ GPS history โตจนต้องพิจารณา retention policy/compression ของ TimescaleDB เพิ่มเติม

---

> **กติกา:** ถ้าเปลี่ยนใจภายหลัง ให้เขียน ADR ใหม่ที่ supersede อันนี้
> **ห้ามแก้ ADR เดิม** เพราะ ADR คือบันทึกประวัติศาสตร์ว่าตอนนั้นคิดอะไรอยู่
