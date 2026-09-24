---
id: I-001
title: ใช้ zod schema validation จริงที่ API boundary แทนการ validate มือ
author: พบระหว่างสำรวจโค้ด Phase A.1
source: idea
status: draft
created: 2026-09-24
decided:
---

# Intent: ใช้ zod schema validation จริงที่ API boundary แทนการ validate มือ

## ปัญหา
`zod` เป็น dependency อยู่ในโปรเจกต์แล้ว แต่ route handler ส่วนใหญ่ใน `app/api/**/route.ts` validate input
ด้วยการ type-coerce + guard มือ (เช่น `body.email?.toString().trim()`) แทนที่จะประกาศ schema จริง
ทำให้ input ที่ไม่ตรง type หลุดเข้าไปถึงชั้น DB ได้ง่ายกว่าที่ควร และ error message ไม่สม่ำเสมอกันระหว่าง endpoint

## หลักฐาน
ยืนยันจากการอ่านโค้ดจริงใน Phase A.1 (`docs/planning/A1-inventory.md` ข้อ 4) — ตรวจ route handler ตัวอย่าง
5 ตัวใน `app/api/` พบว่าไม่มีตัวไหนใช้ zod schema เลยแม้จะ import อยู่ใน `package.json`

## ผลลัพธ์ที่อยากได้
Input ที่ผิดรูปแบบถูกปฏิเสธที่ boundary ด้วย error message ที่สม่ำเสมอ (envelope กลางตามธรรมนูญ มาตรา 6)
ลดความเสี่ยงข้อมูลผิด type หลุดเข้า DB

## ใครและอะไรได้รับผลกระทบ
- ผู้ใช้กลุ่มไหน: Admin ที่กรอกฟอร์มผิด จะได้ error message ชัดเจนขึ้นแทน error 500 ที่ไม่ทราบสาเหตุ
- ส่วนไหนของระบบ: ทุก `app/api/**/route.ts` (40 ไฟล์)
- ข้อมูลอะไรที่เกี่ยวข้อง: ทุก request payload ที่เข้า API

## ข้อจำกัดที่ต้องรักษา
- ห้าม refactor ทุก endpoint พร้อมกันทีเดียว (ธรรมนูญ มาตรา 9.1) — endpoint เดิมที่ยังทำงานถูกต้องไม่ใช่บั๊ก
- ต้องไม่เปลี่ยน response shape ของ endpoint ที่ frontend เรียกอยู่แล้วโดยไม่ประกาศ breaking change ก่อน

## คำถามที่ยังไม่มีคำตอบ
- [NEEDS CLARIFICATION (scope): จะเริ่มทำทุก endpoint ใหม่ตั้งแต่วันนี้เท่านั้น (ตามธรรมนูญ 9.1) หรือจะเปิด task ไล่แปลง endpoint เดิมทีละกลุ่มด้วย — ถ้าใช่ ลำดับความสำคัญคือ endpoint ไหนก่อน (เช่น auth/payment ก่อนเพราะอ่อนไหวสุด)?]

---

## การตัดสิน (เจ้าของโปรเจกต์กรอก)

- [ ] **ทำ** → ไปต่อที่ `/spec` (feature ใหญ่) หรือสร้าง task ตรง ๆ (งานเล็ก)
- [ ] **ยังไม่ทำ** → ใส่ `status: deferred` พร้อมเงื่อนไขว่าเมื่อไหร่ถึงกลับมาดู
- [ ] **ไม่ทำ** → ใส่ `status: rejected` พร้อมเหตุผล **อย่าลบไฟล์** เพราะอีก 3 เดือนจะมีคนเสนอซ้ำ

**เหตุผลของการตัดสิน:**

**เส้นทางต่อไป:** `docs/specs/<F-xx>/` หรือ `docs/backlog/tasks/T-xxx.md`

---

> **กติกา:** intent ที่ยังไม่ถูกตัดสินให้ค้างไว้ในโฟลเดอร์ได้ ไม่ต้องรีบ
> แต่ **ห้ามข้าม intent ไปเขียนโค้ดเลย** แม้จะเป็นงานที่ดูชัดมาก —
> ถ้าชัดจริง เขียน intent เสร็จใน 3 นาที และได้ประวัติว่าทำไมถึงทำ
