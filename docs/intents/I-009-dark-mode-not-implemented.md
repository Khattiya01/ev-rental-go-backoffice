---
id: I-009
title: dark mode ไม่ได้ implement จริง (มีแค่ boilerplate ของ Tailwind)
author: พบระหว่างเช็กลิสต์ Phase 7.10
source: idea
status: draft
created: 2026-09-24
decided:
---

# Intent: dark mode ไม่ได้ implement จริง

## ปัญหา
`app/globals.css` มีบรรทัด `@custom-variant dark (&:where(.dark, .dark *));` ที่มาจาก `create-next-app`
boilerplate แต่ไม่มีไฟล์ไหนใช้ class `dark:` เลยสักที่ (`grep -rl "dark:" components app` = 0 ไฟล์) และไม่มี
ปุ่ม/กลไกสลับธีม — พูดสั้นๆ คือ **dark mode ไม่มีจริงในแอปนี้** แม้จะดูเหมือนมี infra รองรับอยู่

## หลักฐาน
ตรวจโค้ดจริงระหว่างเช็กลิสต์ Phase 7.10 ("สลับ th/en และ light/dark ได้") — th/en ทำงานจริง (next-intl),
light/dark ไม่มี

## ผลลัพธ์ที่อยากได้
ตัดสินใจอย่างใดอย่างหนึ่งชัดเจน: (ก) ทำ dark mode จริงถ้าต้องการ หรือ (ข) ลบ boilerplate `@custom-variant dark`
ทิ้งเพื่อไม่ให้เข้าใจผิดว่ามี — ไม่ปล่อยไว้กึ่งๆ แบบนี้

## ใครและอะไรได้รับผลกระทบ
- ผู้ใช้กลุ่มไหน: Admin ที่อาจอยากใช้ dark mode ตอนทำงานกลางคืน (เช่น เฝ้า alert)
- ส่วนไหนของระบบ: `app/globals.css`, ทุก component ถ้าจะทำจริง (งานใหญ่พอสมควร)

## ข้อจำกัดที่ต้องรักษา
- ถ้าทำจริง ต้องผ่าน token เดิมใน `app/globals.css` ไม่ใช่เพิ่มสีดิบคู่ขนาน

## คำถามที่ยังไม่มีคำตอบ
- [NEEDS CLARIFICATION (scope): ต้องการ dark mode จริงไหม หรือแค่ลบ boilerplate ที่ไม่ได้ใช้ทิ้ง?]

---

## การตัดสิน (เจ้าของโปรเจกต์กรอก)

- [ ] **ทำ** → ไปต่อที่ `/spec` (feature ใหญ่) หรือสร้าง task ตรง ๆ (งานเล็ก)
- [ ] **ยังไม่ทำ** → ใส่ `status: deferred` พร้อมเงื่อนไขว่าเมื่อไหร่ถึงกลับมาดู
- [ ] **ไม่ทำ** → ใส่ `status: rejected` พร้อมเหตุผล **อย่าลบไฟล์**

**เหตุผลของการตัดสิน:**

**เส้นทางต่อไป:** `docs/backlog/tasks/T-xxx.md` หรือ `/spec` ถ้าตัดสินใจทำจริง
