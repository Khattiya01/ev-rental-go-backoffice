---
id: I-008
title: เพิ่ม /health endpoint (ไม่มีเลยตอนนี้)
author: พบระหว่างเช็กลิสต์ Phase 7.10
source: idea
status: draft
created: 2026-09-24
decided:
---

# Intent: เพิ่ม /health endpoint

## ปัญหา
แอปนี้ไม่มี health-check endpoint เลย (`buaflow assess` ที่ Phase 0 รายงานว่า control `health-check` เป็น
`fail` — ไม่พบ) ทำให้ไม่มีทางให้ load balancer/monitoring หรือคนดูแลระบบเช็คสถานะแอปแบบมาตรฐานได้ว่า
process ยังตอบสนองอยู่ไหม โดยไม่ต้องเปิดหน้าเว็บเต็ม

## หลักฐาน
`buaflow assess` (2026-09-24): "fail health-check — no health endpoint found"

## ผลลัพธ์ที่อยากได้
`GET /api/health` (หรือ path ที่ทีมตกลง) ตอบ 200 พร้อมสถานะพื้นฐาน (เช่น DB/Redis connect ได้ไหม) เร็วและไม่ต้อง auth

## ใครและอะไรได้รับผลกระทบ
- ผู้ใช้กลุ่มไหน: ทีม ops/ผู้ดูแลระบบ (on-premise 2 เครื่อง — ไม่มี managed health check ของ cloud ให้)
- ส่วนไหนของระบบ: เพิ่ม route handler ใหม่ 1 ตัว ไม่กระทบของเดิม

## ข้อจำกัดที่ต้องรักษา
- ต้องไม่ leak ข้อมูลภายใน (connection string, version detail) ใน response

## คำถามที่ยังไม่มีคำตอบ
- [NEEDS CLARIFICATION (scope): ต้อง check DB/Redis connectivity จริงไหม หรือแค่ "process ตอบสนอง" พอ (เช็คเบื้องต้น vs เช็คลึก)?]

---

## การตัดสิน (เจ้าของโปรเจกต์กรอก)

- [ ] **ทำ** → ไปต่อที่ `/spec` (feature ใหญ่) หรือสร้าง task ตรง ๆ (งานเล็ก)
- [ ] **ยังไม่ทำ** → ใส่ `status: deferred` พร้อมเงื่อนไขว่าเมื่อไหร่ถึงกลับมาดู
- [ ] **ไม่ทำ** → ใส่ `status: rejected` พร้อมเหตุผล **อย่าลบไฟล์**

**เหตุผลของการตัดสิน:**

**เส้นทางต่อไป:** `docs/backlog/tasks/T-xxx.md` (งานเล็ก)
