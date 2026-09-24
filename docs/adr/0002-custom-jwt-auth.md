# ADR-0002: ใช้ custom JWT session (jose + httpOnly cookie) แทน NextAuth v5

- **สถานะ:** Accepted — **บันทึกย้อนหลัง: ตัดสินใจไปแล้วก่อนใช้ Buaflow**
- **วันที่ตัดสินใจจริง:** ไม่ทราบวันที่แน่ชัด (ก่อนเริ่มใช้ Buaflow) · บันทึกย้อนหลังวันที่ 2026-09-24
- **ผู้ตัดสินใจ:** ทีมพัฒนา EV Rental GO

> ⚠️ **เอกสารเดิมยังเขียนผิด:** `AGENTS.md` แถว Tech Stack ระบุว่า "Auth: NextAuth v5" ซึ่งไม่ตรงกับโค้ดจริง
> ADR ฉบับนี้ถือโค้ดจริงเป็นความจริง — ต้องแก้ `AGENTS.md` ให้ตรงในขั้น Phase 7

## บริบท
ระบบต้องมี session สำหรับ admin user (super_admin/admin/viewer) ที่ล็อกอินเข้า backoffice
พร้อม RBAC ตาม `role_permissions` และต้องรองรับ action ที่ละเอียดอ่อน (เช่น remote motor cutoff ที่ต้องยืนยันรหัสผ่านซ้ำ)

## ทางเลือกที่พิจารณา

### ทางเลือก 1: NextAuth v5
- ข้อดี: ระบบ session/provider สำเร็จรูป, ecosystem ใหญ่
- ข้อเสีย: session strategy ค่อนข้างเป็น black-box, ปรับ custom claim/RBAC ละเอียดยาก, ตอนตัดสินใจ NextAuth v5 ยังอยู่ในสถานะ beta

### ทางเลือก 2: Custom JWT ด้วย `jose` + httpOnly cookie
- ข้อดี: ควบคุม session logic เองทั้งหมด (payload, expiry, การ revoke, การผูกกับ RBAC), โค้ด auth อยู่ใน `lib/session.ts` อ่านและแก้ได้ตรงไปตรงมา
- ข้อเสีย: ต้องดูแลเรื่อง security best practice เอง (rotation, secret management) แทนที่จะพึ่ง library ที่ผ่านการตรวจสอบมาแล้ว

## การตัดสินใจ
**เลือก: Custom JWT (jose) + httpOnly cookie + bcryptjs สำหรับ password hashing**

เหตุผล:
- ต้องการควบคุม session logic เองทั้งหมด — ไม่ต้องพึ่งพา NextAuth ที่ตอนนั้นเป็น library เปลี่ยนเวอร์ชันหลักอยู่ (v4→v5) และ session strategy เป็น black-box

## ผลที่ตามมา
**ผลดี:**
- Auth flow อ่านตรงไปตรงมาใน `lib/session.ts` / `lib/dal.ts` / `lib/permissions.ts` — debug และต่อ RBAC ง่าย
- ไม่ผูกกับ dependency ที่เปลี่ยน breaking API บ่อย

**ผลเสีย / สิ่งที่ต้องยอมรับ:**
- ทีมต้องดูแล security ของ session เอง (JWT secret rotation, cookie flags, CSRF) โดยไม่มี library คอยเตือน best practice ให้
- ไม่มี OAuth/SSO provider สำเร็จรูป ถ้าต้องเพิ่ม (เช่น Google Workspace SSO) ต้องเขียนเอง

**สิ่งที่ต้องทำเพิ่มเพราะเลือกแบบนี้:**
- แก้ `AGENTS.md` แถว Auth ให้ตรงกับของจริง (Phase 7)

## ทบทวนเมื่อไหร่
ถ้าต้องรองรับ SSO/OAuth จากภายนอก หรือถ้าทีมโตจนต้องการมาตรฐาน auth ที่ผ่าน audit จาก third-party

---

> **กติกา:** ถ้าเปลี่ยนใจภายหลัง ให้เขียน ADR ใหม่ที่ supersede อันนี้
> **ห้ามแก้ ADR เดิม** เพราะ ADR คือบันทึกประวัติศาสตร์ว่าตอนนั้นคิดอะไรอยู่
