---
id: I-005
title: เพิ่ม rate limiting ที่ /api/auth/login และ webhook endpoints
author: พบระหว่างสำรวจโค้ด Phase A.1
source: idea
status: draft
created: 2026-09-24
decided:
---

# Intent: เพิ่ม rate limiting ที่ /api/auth/login และ webhook endpoints

## ปัญหา
`/api/auth/login` และ `/api/webhooks/stripe` (และ cron endpoint อื่นที่เรียกจากภายนอก) ไม่มี rate limiting
ใดๆ ตอนนี้ — เปิดช่องให้ brute-force รหัสผ่าน admin หรือยิง request ถี่เกินจำเป็นเข้า webhook endpoint ได้

## หลักฐาน
ยืนยันจาก `docs/planning/A1-inventory.md` (หัวข้อ "สิ่งที่เจอแต่ยังไม่แก้") — ตรวจโค้ด route handler
ที่เกี่ยวข้องไม่พบ middleware หรือ logic จำกัดอัตรา request เลย

## ผลลัพธ์ที่อยากได้
`/api/auth/login` ปฏิเสธ/ดีเลย์ request ถี่เกินไปจาก IP/account เดียวกัน และ webhook endpoint ตรวจสอบ
signature + จำกัดอัตราตามสมควรก่อนประมวลผล

## ใครและอะไรได้รับผลกระทบ
- ผู้ใช้กลุ่มไหน: Admin ทุกคน (ป้องกันบัญชีถูก brute-force), ทีม dev (ป้องกัน webhook ถูกยิงถี่ผิดปกติ)
- ส่วนไหนของระบบ: `app/api/auth/login/route.ts`, `app/api/webhooks/stripe/route.ts`, `app/api/cron/*`
- ข้อมูลอะไรที่เกี่ยวข้อง: credential ของ admin, ธุรกรรมการเงินผ่าน Stripe webhook

## ข้อจำกัดที่ต้องรักษา
- ต้องไม่ block admin ที่ login ปกติโดยไม่ได้ตั้งใจ (false positive)
- Stripe webhook ต้องยัง verify signature ผ่านได้ปกติ ไม่กระทบ payment flow ที่ทำงานอยู่

## คำถามที่ยังไม่มีคำตอบ
- [NEEDS CLARIFICATION (architecture): จะทำ rate limit ที่ระดับ Next.js middleware (ใช้ Redis ที่มีอยู่แล้วเก็บ counter) หรือใช้ reverse proxy/WAF ที่ระดับ infra (นอก repo นี้)?]

---

## การตัดสิน (เจ้าของโปรเจกต์กรอก)

- [ ] **ทำ** → ไปต่อที่ `/spec` (feature ใหญ่) หรือสร้าง task ตรง ๆ (งานเล็ก)
- [ ] **ยังไม่ทำ** → ใส่ `status: deferred` พร้อมเงื่อนไขว่าเมื่อไหร่ถึงกลับมาดู
- [ ] **ไม่ทำ** → ใส่ `status: rejected` พร้อมเหตุผล **อย่าลบไฟล์** เพราะอีก 3 เดือนจะมีคนเสนอซ้ำ

**เหตุผลของการตัดสิน:**

**เส้นทางต่อไป:** `docs/specs/<F-xx>/` หรือ `docs/backlog/tasks/T-xxx.md`

---

> **กติกา:** intent ที่ยังไม่ถูกตัดสินให้ค้างไว้ในโฟลเดอร์ได้ ไม่ต้องรีบ
> แต่ **ห้ามข้ามไปเขียนโค้ดเลย** แม้จะเป็นงานที่ดูชัดมาก —
> ถ้าชัดจริง เขียน intent เสร็จใน 3 นาที และได้ประวัติว่าทำไมถึงทำ
