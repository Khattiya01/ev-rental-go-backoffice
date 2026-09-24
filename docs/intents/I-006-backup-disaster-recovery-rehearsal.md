---
id: I-006
title: ทำแผน backup / disaster-recovery ที่ทดสอบจริง (จำเป็นสำหรับอ้าง readiness R3)
author: พบระหว่างเขียน ADR-0006 / buaflow assess
source: idea
status: draft
created: 2026-09-24
decided:
---

# Intent: ทำแผน backup / disaster-recovery ที่ทดสอบจริง

## ปัญหา
โปรเจกต์ deploy บน on-premise 2 เครื่อง (App Server / Data Server) แบบไม่มี multi-AZ หรือ managed backup
ของ cloud — ถ้า Data Server ล่ม (disk พัง, human error ลบข้อมูล) ระบบทั้งหมดหยุดจนกว่าจะกู้คืนได้
ตอนนี้ยังไม่มีหลักฐานว่าเคยทดสอบ restore จาก backup จริงเลย

## หลักฐาน
`buaflow assess` (Phase 0) รายงานว่า control ด้าน rollback/clean-environment ของ readiness ระดับ R3
ยังเป็น `fail` (ไม่พบ rollback procedure หรือ rehearsal record) และ `docs/adr/0006-on-premise-two-server-deployment.md`
ระบุไว้ในหัวข้อ "ผลเสีย" ตรงๆ ว่ายังไม่มีหลักฐานนี้

## ผลลัพธ์ที่อยากได้
มี backup schedule ที่ทำงานจริง (PostgreSQL/TimescaleDB + Redis snapshot) และมีบันทึกว่าเคย restore
จาก backup สำเร็จอย่างน้อย 1 ครั้งในสภาพแวดล้อมทดสอบ — เพื่อให้อ้างระดับ readiness R3 ได้ตามเกณฑ์ของ kit

## ใครและอะไรได้รับผลกระทบ
- ผู้ใช้กลุ่มไหน: ทุกคนที่ใช้ระบบ (ถ้า Data Server ล่มโดยไม่มีแผนกู้คืน ธุรกิจหยุดทำงานทั้งหมด)
- ส่วนไหนของระบบ: infra ระดับ Data Server (PostgreSQL/TimescaleDB, Redis) — นอกเหนือจากโค้ดใน repo นี้โดยตรง
- ข้อมูลอะไรที่เกี่ยวข้อง: ข้อมูลลูกค้า (e-KYC), สัญญา, การเงิน — ข้อมูลธุรกิจทั้งหมด

## ข้อจำกัดที่ต้องรักษา
- การทดสอบ restore ต้องไม่กระทบ production จริงระหว่างทดสอบ (ทำในสภาพแวดล้อมแยก)

## คำถามที่ยังไม่มีคำตอบ
- [NEEDS CLARIFICATION (data): ตอนนี้มี backup job อัตโนมัติอยู่แล้วหรือไม่ (เช่น pg_dump cron) แค่ไม่เคยทดสอบ restore หรือไม่มี backup เลย?]
- [NEEDS CLARIFICATION (scope): นี่เป็นงานระดับ infra/ops ล้วนๆ ที่อาจอยู่นอก scope ของ repo นี้ (เทียบ ev-rental-iot-gateway ที่แยก scope) — ควรทำที่ระดับไหน และใครเป็นเจ้าของงานนี้?]

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
