# ADR-0001: ใช้ Next.js (App Router) เป็น full-stack framework หลักของ Web Backoffice

- **สถานะ:** Accepted — **บันทึกย้อนหลัง: ตัดสินใจไปแล้วก่อนใช้ Buaflow**
- **วันที่ตัดสินใจจริง:** ไม่ทราบวันที่แน่ชัด (ก่อนเริ่มใช้ Buaflow) · บันทึกย้อนหลังวันที่ 2026-09-24
- **ผู้ตัดสินใจ:** ทีมพัฒนา EV Rental GO

## บริบท
ต้องสร้างระบบ Web Backoffice สำหรับบริหารฟลีตรถเช่า EV ที่มีทั้งหน้าเว็บ (UI) และ API/business logic
(auth, rentals, customers, billing, reports) ทีมต้องเลือก stack ที่ทำได้ทั้งสองฝั่งโดยไม่ต้องแยกทีม frontend/backend

## ทางเลือกที่พิจารณา

### ทางเลือก 1: Next.js (App Router) — full-stack เดียว
- ข้อดี: เขียน UI + API route handler ในโปรเจกต์เดียว, ทีมใช้ TypeScript ตลอดสาย, deploy เป็นก้อนเดียว
- ข้อเสีย: งานที่ทำนอกเหนือ request/response ปกติ (เช่น WebSocket แบบ persistent) ต้องเขียน custom server เอง (ดูผลที่ตามมา)

### ทางเลือก 2: แยก frontend (React/Vite) + backend (Express/Nest) คนละ service
- ข้อดี: แยก concern ชัดเจน, scale แต่ละฝั่งอิสระ
- ข้อเสีย: ต้อง maintain 2 codebase, ทีมต้องดูแล API contract เอง, deploy ซับซ้อนขึ้น

## การตัดสินใจ
**เลือก: Next.js (App Router) แบบ full-stack เดียว**

เหตุผล:
- ทีมพัฒนาถนัด TypeScript full-stack เดียวจบ — ไม่ต้องสลับ context ระหว่าง 2 codebase/2 stack

## ผลที่ตามมา
**ผลดี:**
- Deploy ง่าย (1 process หลัก), type ใช้ร่วมกันได้ทั้ง client/server (`lib/types.ts`)
- ความเร็วในการพัฒนาเพราะทีมคุ้นเคย TypeScript อยู่แล้ว

**ผลเสีย / สิ่งที่ต้องยอมรับ:**
- Next.js ไม่รองรับ long-lived WebSocket connection ผ่าน route handler ปกติ → ต้องเขียน `server.ts` เป็น custom http server ครอบ Next.js request handler + `ws` library เอง (ดู AGENTS.md หัวข้อ Real-time)
- การอัปเกรด Next.js เวอร์ชันใหญ่กระทบทั้งเว็บและ API พร้อมกัน (ไม่แยกความเสี่ยง)

**สิ่งที่ต้องทำเพิ่มเพราะเลือกแบบนี้:**
- ดูแล `server.ts` เป็น production entrypoint แทน `next start` ปกติ (ทั้ง dev/start script)

## ทบทวนเมื่อไหร่
ถ้าปริมาณ traffic ของ API โตจนต้อง scale แยกจากหน้าเว็บ หรือถ้าต้องเปิด public API ให้บริการอื่นเรียกนอกเหนือจาก backoffice UI เอง

---

> **กติกา:** ถ้าเปลี่ยนใจภายหลัง ให้เขียน ADR ใหม่ที่ supersede อันนี้
> **ห้ามแก้ ADR เดิม** เพราะ ADR คือบันทึกประวัติศาสตร์ว่าตอนนั้นคิดอะไรอยู่
