---
id: I-004
title: เปลี่ยนจาก db:push เป็น db:generate + db:migrate สำหรับ production
author: พบระหว่างสำรวจโค้ด Phase A.1 / ADR-0004
source: idea
status: draft
created: 2026-09-24
decided:
---

# Intent: เปลี่ยนจาก db:push เป็น db:generate + db:migrate สำหรับ production

## ปัญหา
ตอนนี้ schema sync ระหว่าง dev กับ database ทำผ่าน `pnpm db:push` (Drizzle Kit push mode) ซึ่งเขียน schema
ตรงเข้า database โดยไม่มีไฟล์ migration ที่ review ได้ก่อน apply — `db/migrations/meta/` มีแค่ snapshot/journal
ของ Drizzle Kit ไม่มีไฟล์ SQL migration จริงที่ commit ไว้ ถ้าใช้ `db:push` กับ production โดยไม่ระวัง
อาจเกิดการเปลี่ยน schema แบบ destructive โดยไม่มีขั้นตอน backup/rollback ที่ชัดเจน

## หลักฐาน
ยืนยันจาก `docs/planning/A1-inventory.md` ข้อ 6 และ `docs/adr/0004-drizzle-orm-postgres-timescaledb.md`
("ผลเสีย" — ไม่มีไฟล์ SQL migration ดิบ, ใช้ `db:push` เป็นหลัก)

## ผลลัพธ์ที่อยากได้
Schema change ที่จะขึ้น production ผ่านไฟล์ migration ที่ review ได้ก่อน apply (`db:generate` แล้วเช็ค diff
ก่อน `db:migrate`) ตามหลัก expand/contract ใน `.claude/rules/db-migration.md`

## ใครและอะไรได้รับผลกระทบ
- ผู้ใช้กลุ่มไหน: ทีม dev/DBA ที่ deploy schema change ขึ้น production
- ส่วนไหนของระบบ: workflow การ deploy schema ทั้งหมด (ไม่กระทบ business logic)
- ข้อมูลอะไรที่เกี่ยวข้อง: ข้อมูลจริงทั้งหมดในตาราง production (เสี่ยงถ้าทำผิดพลาด)

## ข้อจำกัดที่ต้องรักษา
- `db:push` ยังใช้ได้ปกติสำหรับ local/dev database (ไม่ต้องเปลี่ยน dev workflow)
- ต้องไม่กระทบ schema/data ที่มีอยู่จริงใน production ระหว่างเปลี่ยน workflow

## คำถามที่ยังไม่มีคำตอบ
- [NEEDS CLARIFICATION (data): ตอนนี้ production database sync ล่าสุดตรงกับ schema ใน `db/schema/*.ts` หรือไม่ — ถ้าไม่แน่ใจ ต้อง `db:generate` เทียบ diff ก่อนตัดสินใจเปลี่ยน workflow]
- [NEEDS CLARIFICATION (scope): ต้องทำแผน rollback/backup ควบคู่ไปด้วยเลยไหม (เกี่ยวโยงกับ I-006 เรื่อง backup/DR ของ ADR-0006)]

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
