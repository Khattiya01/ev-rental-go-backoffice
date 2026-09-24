# ADR-0005: สถาปัตยกรรม Hybrid Monolith — แยก IoT Gateway ออกเป็น service ต่างหาก

- **สถานะ:** Accepted — **บันทึกย้อนหลัง: ตัดสินใจไปแล้วก่อนใช้ Buaflow**
- **วันที่ตัดสินใจจริง:** ไม่ทราบวันที่แน่ชัด (ก่อนเริ่มใช้ Buaflow) · บันทึกย้อนหลังวันที่ 2026-09-24
- **ผู้ตัดสินใจ:** ทีมพัฒนา EV Rental GO

## บริบท
รถ EV ส่ง GPS/battery telemetry ผ่าน MQTT ทุก 1–5 วินาทีต่อคัน (สูงสุด ~100 คัน) ต้องมีการรับ, validate,
เขียนลง Redis (ตำแหน่งล่าสุด) และ PostgreSQL/TimescaleDB (ประวัติ) พร้อมกับต้อง serve หน้าเว็บ backoffice ปกติ

## ทางเลือกที่พิจารณา

### ทางเลือก 1: รับ MQTT/IoT traffic ตรงในโปรเซส Next.js เดียวกัน
- ข้อดี: ไม่ต้อง deploy/ดูแล service เพิ่ม
- ข้อเสีย: raw IoT traffic ความถี่สูงจะไปแย่ง Event Loop เดียวกับที่ serve หน้าเว็บ/API ของ admin ทำให้ backoffice ช้าไปด้วยเวลามีปัญหาที่ IoT ฝั่งเดียว

### ทางเลือก 2: แยก IoT Gateway เป็น Node.js + Express (TypeScript) microservice ต่างหาก
- ข้อดี: แยก failure domain และ Event Loop ออกจากกัน, gateway ทำหน้าที่เดียว (รับ MQTT → เขียน Redis/Postgres → trigger alert) ส่วน backoffice อ่านผลจาก Redis/Postgres เท่านั้น ไม่ยุ่งกับ raw IoT data
- ข้อเสีย: ต้อง deploy/monitor 2 service, ต้องมี data contract (schema ของ Redis key / ตาราง alerts) ที่ทั้งสองฝั่งตกลงร่วมกัน

## การตัดสินใจ
**เลือก: แยก IoT Gateway เป็น service ต่างหาก (Node.js + Express + TypeScript) สื่อสารกับ backoffice ผ่าน Redis (ตำแหน่งล่าสุด) และ PostgreSQL (ประวัติ + alert) เท่านั้น ไม่มี synchronous call ตรงระหว่างสอง service**

เหตุผล:
- ป้องกันไม่ให้ raw IoT traffic ความถี่สูงบล็อก Event Loop ของ Next.js ที่ต้อง serve backoffice UI/API พร้อมกัน (เหตุผลนี้มีอยู่แล้วใน `AGENTS.md` หัวข้อ IoT Gateway ตอนสำรวจโค้ด — ไม่ใช่การเดา)

## ผลที่ตามมา
**ผลดี:**
- Backoffice ไม่มีทาง crash/ช้าเพราะปัญหาที่ MQTT/IoT ฝั่งเดียว
- Data flow ชัดเจน: gateway เขียน, backoffice อ่านอย่างเดียว (Redis สำหรับ real-time, Postgres สำหรับ query ประวัติ)

**ผลเสีย / สิ่งที่ต้องยอมรับ:**
- ต้อง deploy และ monitor 2 service แยกกันบน Server เดียวกัน (App Server: Next.js + IoT Gateway + Mosquitto)
- ถ้า schema ของ alert/telemetry เปลี่ยน ต้องอัปเดตทั้งสอง repo ให้ตรงกัน (ไม่มี shared types ข้าม repo ในตอนนี้)

**สิ่งที่ต้องทำเพิ่มเพราะเลือกแบบนี้:**
- Backoffice repo นี้**ห้าม**เขียน MQTT ingestion/parsing logic ใดๆ (อยู่นอก scope ตาม AGENTS.md) — คงไว้แค่ read-only จาก Redis/Postgres

## ทบทวนเมื่อไหร่
ถ้าจำนวนรถโตเกิน ~100 คันจนต้อง scale gateway แยกเครื่อง หรือถ้าต้องการ shared type ระหว่าง repo (อาจพิจารณาแยก package types ร่วม)

---

> **กติกา:** ถ้าเปลี่ยนใจภายหลัง ให้เขียน ADR ใหม่ที่ supersede อันนี้
> **ห้ามแก้ ADR เดิม** เพราะ ADR คือบันทึกประวัติศาสตร์ว่าตอนนั้นคิดอะไรอยู่
