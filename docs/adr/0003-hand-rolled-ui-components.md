# ADR-0003: Hand-roll UI component library เองแทนการใช้ shadcn/ui

- **สถานะ:** Accepted — **บันทึกย้อนหลัง: ตัดสินใจไปแล้วก่อนใช้ Buaflow**
- **วันที่ตัดสินใจจริง:** ไม่ทราบวันที่แน่ชัด (ก่อนเริ่มใช้ Buaflow) · บันทึกย้อนหลังวันที่ 2026-09-24
- **ผู้ตัดสินใจ:** ทีมพัฒนา EV Rental GO

> ⚠️ **เอกสารเดิมยังเขียนผิด:** `.github/agents/frontend-implementer.agent.md` เขียนว่า "UI Components: shadcn/ui in components/ui/"
> และสั่งให้ "ALWAYS use existing shadcn/ui components" ซึ่งไม่ตรงกับโค้ดจริง (ไม่มี `components.json`, ไม่มี shadcn CLI เกี่ยวข้องเลย)
> ADR ฉบับนี้ถือโค้ดจริงเป็นความจริง — ต้องแก้ไฟล์ agent นั้นในขั้น Phase 7 ไม่งั้น AI จะพยายามรัน `shadcn add` ทับไฟล์ของทีมเอง

## บริบท
โปรเจกต์ต้องการ UI component set (modal, form, table, uploader ฯลฯ) สำหรับหน้า backoffice ที่มี domain-specific
ต้องการมาก (เช่น vehicle-form, contract-form, geofence map overlay) ซึ่งไม่ตรงกับ component ทั่วไปที่ library สำเร็จรูปมีให้

## ทางเลือกที่พิจารณา

### ทางเลือก 1: shadcn/ui (copy-paste source เข้าโปรเจกต์ + Radix primitives)
- ข้อดี: a11y ทำมาให้แล้ว, source code อยู่ในโปรเจกต์ (แก้ได้), มี CLI ติดตั้งเพิ่มทีหลังได้
- ข้อเสีย: ต้อง onboard ทีมกับ convention/token ของ shadcn ก่อน, component เฉพาะทางของธุรกิจ (เช่น geofence map, vehicle telematics card) ก็ต้องเขียนเองอยู่ดี

### ทางเลือก 2: เขียน component เองทั้งหมด (`components/ui/`)
- ข้อดี: คุม design/behavior ได้ 100% ไม่ผูกกับ convention ของ library ภายนอก ปรับ business-specific UI ได้อิสระ
- ข้อเสีย: ต้องดูแล a11y/edge case เอง (keyboard nav, focus trap ฯลฯ), maintenance overhead สูงขึ้นตามจำนวน component (ปัจจุบัน 23 ไฟล์)

## การตัดสินใจ
**เลือก: เขียน component เองทั้งหมดใน `components/ui/`**

เหตุผล:
- อยากคุม design เองทั้งหมด ไม่ผูกกับ shadcn หรือ design system ของภายนอก

## ผลที่ตามมา
**ผลดี:**
- Design ของ backoffice เป็นเอกลักษณ์ของทีมเอง ปรับแก้ business logic ที่ผูกกับ UI (เช่น optimistic-lock conflict banner) ได้อิสระ ไม่ต้อง fork library

**ผลเสีย / สิ่งที่ต้องยอมรับ:**
- Maintenance overhead: 23 component ต้องดูแล a11y/responsive/edge case เอง โดยไม่มี upstream คอย patch ให้
- Onboarding คนใหม่ต้องอ่าน component เดิมเพื่อรู้ convention เพราะไม่มีเอกสาร design system ภายนอกอ้างอิงได้

**สิ่งที่ต้องทำเพิ่มเพราะเลือกแบบนี้:**
- แก้ `.github/agents/frontend-implementer.agent.md` ให้ตรงกับของจริง (Phase 7) — ห้ามสั่งให้ AI ใช้/ติดตั้ง shadcn อีก
- ลบ `**/components/ui/**` ออกจาก `protected` ใน `.claude/stack.json` (ทำไปแล้วใน A.2/A.5) เพราะไม่ใช่โค้ด generated จาก CLI ไหน

## ทบทวนเมื่อไหร่
ถ้าจำนวน component โตจนดูแล a11y เองไม่ไหว หรือถ้าทีมขยายและต้องการมาตรฐาน design system ที่มีเอกสาร/testing จาก community

---

> **กติกา:** ถ้าเปลี่ยนใจภายหลัง ให้เขียน ADR ใหม่ที่ supersede อันนี้
> **ห้ามแก้ ADR เดิม** เพราะ ADR คือบันทึกประวัติศาสตร์ว่าตอนนั้นคิดอะไรอยู่
