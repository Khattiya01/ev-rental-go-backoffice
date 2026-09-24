---
id: I-003
title: ทบทวน data-fetching pattern (useEffect + fetch) ที่ชนกับกฎ lint ใหม่ทั้งระบบ
author: พบระหว่างตั้ง verify command Phase A.2
source: idea
status: draft
created: 2026-09-24
decided:
---

# Intent: ทบทวน data-fetching pattern (useEffect + fetch) ที่ชนกับกฎ lint ใหม่ทั้งระบบ

## ปัญหา
ทุกหน้าที่ต้องดึงข้อมูลใช้ pattern เดียวกันคือ `useEffect(() => { fetch(...).then(json => setState(json)) }, [])`
ซึ่งเป็น convention เดิมของทั้งระบบ (พบใน 15 ไฟล์ตอนสำรวจ) แต่กฎ lint ใหม่ `react-hooks/set-state-in-effect`
(มากับ eslint-plugin-react-hooks เวอร์ชันที่อัปเกรดมาพร้อม Next 16) มองว่านี่คือ anti-pattern
ตอนนี้ต้อง baseline (downgrade เป็น warn เฉพาะไฟล์เดิม) ไว้ใน `eslint.config.mjs` เพื่อให้ `pnpm verify` ผ่าน
แต่ทุกหน้าใหม่ที่ทำ pattern เดิมซ้ำจะเจอ error ทันที ต้องเขียนต่างออกไป (เช่น ใส่ dummy dependency หรือใช้
data-fetching library) ทำให้โค้ดใหม่กับเก่าไม่สอดคล้องกันในระยะยาว

## หลักฐาน
ยืนยันจาก `docs/planning/_state.md` หัวข้อ A.2 — รายชื่อ 15 ไฟล์ที่ถูก baseline ไว้ใน `eslint.config.mjs`
และ `docs/constitution.md` มาตรา 9.1 ที่อ้างถึงกรณีนี้เป็นตัวอย่าง

## ผลลัพธ์ที่อยากได้
มีทางเลือกที่ชัดเจนสำหรับหน้าใหม่ (เช่น custom hook กลาง `useFetch`/`useApiData`, หรือ data-fetching library
อย่าง SWR/TanStack Query) ที่ไม่ชนกับกฎ lint และลดโค้ดซ้ำระหว่างหน้า — แล้วค่อยพิจารณาไล่แปลง 15 ไฟล์เดิม
เป็นงานแยกถ้าคุ้มค่า

## ใครและอะไรได้รับผลกระทบ
- ผู้ใช้กลุ่มไหน: ทีม dev เอง (ลด boilerplate, ลด bug จาก race condition ระหว่างดึงข้อมูล)
- ส่วนไหนของระบบ: ทุกหน้า client component ที่ดึงข้อมูลจาก `app/api/**` (เกือบทุกหน้าใน `app/(backoffice)/`)
- ข้อมูลอะไรที่เกี่ยวข้อง: ไม่มีข้อมูลอ่อนไหวเพิ่มเติม เป็นเรื่อง pattern ของโค้ดล้วนๆ

## ข้อจำกัดที่ต้องรักษา
- ห้าม refactor 15 ไฟล์เดิมพร้อมกันทีเดียวโดยไม่มี intent/task แยกที่อนุมัติ (ธรรมนูญ มาตรา 9.1)
- ถ้าเลือกเพิ่ม library ใหม่ ต้องมี ADR ใหม่ (ธรรมนูญ ข้อ "installing a new library ต้องมี intent + ADR")

## คำถามที่ยังไม่มีคำตอบ
- [NEEDS CLARIFICATION (scope): จะแก้แค่ระดับ "ทางที่ถูกสำหรับของใหม่" (เช่น เขียน custom hook เอง ไม่เพิ่ม dependency) หรือเปิดทางเพิ่ม library ภายนอก (SWR/TanStack Query) เข้ามาเปลี่ยน convention ทั้งระบบในระยะยาว?]

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
