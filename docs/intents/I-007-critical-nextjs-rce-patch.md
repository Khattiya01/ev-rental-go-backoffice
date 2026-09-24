---
id: I-007
title: "[SECURITY - CRITICAL] อัปเกรด Next.js 16.2.6 → 16.3.6+ ปิด unauthenticated RCE 2 ตัว"
author: พบระหว่างรัน gate ครั้งแรก Phase 7
source: idea
status: draft
created: 2026-09-24
decided:
---

# Intent: [SECURITY - CRITICAL] อัปเกรด Next.js ปิด unauthenticated RCE 2 ตัว

> ⚠️ **นี่คือช่องโหว่ critical severity แบบ unauthenticated remote code execution** ควรพิจารณาก่อน intent อื่นในคิว
> ผู้ใช้เลือกจะทำเป็น intent แยกแทนการแก้ทันทีตอนสำรวจ (2026-09-24) — ไม่ได้แปลว่าไม่สำคัญ แค่ยังไม่ถึงคิวตัดสินใจ

## ปัญหา
`next@16.2.6` (เวอร์ชันที่ pin ตรงๆ ใน `package.json` โดยไม่มี `^`) มีช่องโหว่ critical 2 ตัว:

1. **Unauthenticated RCE บน Windows-hosted servers** — [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36)
2. **Unauthenticated RCE ใน Image Optimization API เมื่อใช้ไฟล์ AVIF** — [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4)

ทั้งสองตัวกระทบช่วงเวอร์ชัน `>=16.0.0 <16.3.3` แก้แล้วใน `>=16.3.3` (เวอร์ชัน stable ล่าสุด ณ วันที่พบคือ `16.3.6`)

## หลักฐาน
รัน `pnpm audit --audit-level=high` ตอนติดตั้ง gate ครั้งแรก (Phase 7) พบ 45 vulnerabilities รวม
(2 critical, 23 high, 18 moderate, 2 low) — 2 ตัว critical เป็นช่องโหว่ตรงใน `next` เอง ไม่ใช่ transitive
dev-dependency เหมือนตัวอื่นๆ ส่วนที่เหลือ (js-yaml ผ่าน eslint toolchain, sharp ผ่าน next-intl) เป็น
build-time/dev tooling ความเสี่ยงต่ำกว่ามาก ไม่ได้รวมไว้ใน intent นี้

## ผลลัพธ์ที่อยากได้
`next` อัปเกรดเป็น `>=16.3.3` (แนะนำ `16.3.6` เวอร์ชัน stable ล่าสุด ณ ตอนสำรวจ — เช็คเวอร์ชันใหม่กว่านี้อีกทีก่อนอัปเกรดจริงเพราะเวลาผ่านไปอาจมีตัวใหม่กว่า) และ `pnpm audit` ไม่มี critical เหลือจาก `next` เอง

## ใครและอะไรได้รับผลกระทบ
- ผู้ใช้กลุ่มไหน: ทุกคนที่เข้าถึง backoffice ผ่าน network (ช่องโหว่แบบ unauthenticated = ไม่ต้อง login ก็โจมตีได้)
- ส่วนไหนของระบบ: ทั้งแอป (Next.js เป็น framework หลัก) โดยเฉพาะถ้า deploy บน Windows หรือมีการใช้ AVIF image
- ข้อมูลอะไรที่เกี่ยวข้อง: ทุกข้อมูลในระบบ ถ้า RCE สำเร็จคือ compromise ทั้งเครื่อง App Server

## ข้อจำกัดที่ต้องรักษา
- ต้องรัน `pnpm verify` เต็มชุด (typecheck+lint+build+test) หลังอัปเกรดเพื่อยืนยันว่าไม่มี breaking change
- ควรทดสอบ manual smoke test อย่างน้อยหน้าเว็บหลัก + live map + WebSocket (`server.ts` ครอบ Next.js request handler) ก่อน deploy จริง เพราะ custom server อาจไวต่อการเปลี่ยนแปลง internal API ของ Next.js มากกว่าปกติ

## คำถามที่ยังไม่มีคำตอบ
- [NEEDS CLARIFICATION (scope): App Server ที่ deploy จริงเป็น Windows หรือ Linux? (ถ้าไม่ใช่ Windows ช่องโหว่ตัวแรกไม่กระทบโดยตรง แต่ตัวที่สอง (AVIF) กระทบทุก OS — ยังควรอัปเกรดอยู่ดี)]
- [NEEDS CLARIFICATION (scope): จะอัปเกรดทันทีเป็นงานเดี่ยว หรือรวมกับรอบ dependency update ปกติ — ถ้ารอ ควรกำหนดวันที่ deadline ชัดเจนเพราะเป็น critical unauthenticated]

---

## การตัดสิน (เจ้าของโปรเจกต์กรอก)

- [ ] **ทำ** → ไปต่อที่ `/spec` (feature ใหญ่) หรือสร้าง task ตรง ๆ (งานเล็ก)
- [ ] **ยังไม่ทำ** → ใส่ `status: deferred` พร้อมเงื่อนไขว่าเมื่อไหร่ถึงกลับมาดู
- [ ] **ไม่ทำ** → ใส่ `status: rejected` พร้อมเหตุผล **อย่าลบไฟล์** เพราะอีก 3 เดือนจะมีคนเสนอซ้ำ

**เหตุผลของการตัดสิน:**

**เส้นทางต่อไป:** `docs/backlog/tasks/T-xxx.md` (งานเล็ก ทำได้เป็น task ตรงๆ ไม่ต้องมี spec เต็ม)

---

> **กติกา:** intent ที่ยังไม่ถูกตัดสินให้ค้างไว้ในโฟลเดอร์ได้ ไม่ต้องรีบ — **ยกเว้นตัวนี้** ที่ควรได้รับการตัดสินใจเร็วกว่าปกติเพราะเป็น critical security finding
