# ADR-0008: ใช้ workflow ของ Buaflow เป็นหลัก แทนระบบ multi-agent เดิม (product-owner/planner/architect/...)

- **สถานะ:** Accepted
- **วันที่:** 2026-09-24
- **ผู้ตัดสินใจ:** ทีมพัฒนา EV Rental GO

## บริบท
ระหว่างทำ Phase 7 (แก้ `CLAUDE.md`) พบว่า repo มีระบบ multi-agent orchestration ของตัวเองอยู่ก่อนแล้ว
ที่ `.github/agents/*.agent.md` (`product-owner`, `planner`, `architect`, `frontend-implementer`,
`backend-implementer`, `reviewer` + 4 reviewer ย่อย) ถูก import เข้า `CLAUDE.md` ด้วย `@` syntax

กติกาเดิมกำหนดว่า Claude หลัก (บทบาท "Product Owner") **ห้ามเขียน/แก้/รันโค้ดเอง ต้อง delegate ทุกอย่าง**
ให้ subagent เสมอ — ขัดกับ workflow ของ Buaflow ที่ main session ทำงานตรงผ่าน skill
(`/intent → /spec → /plan → /task → /check → /done`) และเรียก subagent เฉพาะบางจุด (`buaflow:code-reviewer`,
`legacy-explorer`, `test-writer`) ไม่ใช่ delegate ทุกครั้ง

ระหว่างทำ Phase 0–7 ของ Buaflow ทั้งหมด Claude เขียน/แก้ไฟล์เองโดยตรงมาตลอด (ขัดกับกติกาเดิม) —
ต้องเลือกว่าอันไหนคือ workflow จริงของโปรเจกต์นี้ต่อจากนี้ ไม่ให้มี 2 sources of truth ขัดกันเอง

## ทางเลือกที่พิจารณา

### ทางเลือก 1: ใช้ Buaflow เป็นหลัก
- ข้อดี: มี gate จริงนอก session (pre-push + `.claude/gate.js`), มี artifact chain ที่ตรวจสอบย้อนได้
  (intent→spec→plan→ADR), เข้ากับสิ่งที่เพิ่งตั้งไว้ทั้งหมดใน Phase A/7
- ข้อเสีย: เสียของเดิมที่เคยออกแบบไว้ (delegate-only pattern, 4-perspective review)

### ทางเลือก 2: เก็บระบบเดิมไว้ ให้ Buaflow อยู่ข้างใต้
- ข้อดี: ไม่เสียของที่ทีมเคยออกแบบไว้
- ข้อเสีย: workflow ปนกัน 2 ระบบที่ขัดกันเอง (ใครห้ามเขียนโค้ด ใครไม่ห้าม) — AI จะเลือกเชื่อฝั่งไหนแบบสุ่ม
  ไม่มีใครเคยพิสูจน์ว่า 2 ระบบนี้ทำงานร่วมกันได้จริงในทางปฏิบัติ (ตลอด session ที่ผ่านมาไม่ได้ทำตามทางเลือกนี้เลย)

## การตัดสินใจ
**เลือก: ใช้ Buaflow เป็นหลัก** — เอา `@.github/agents/*.agent.md` ออกจาก `CLAUDE.md`
ย้ายไฟล์เดิมไปเก็บที่ `docs/_archive/github-agents/` (ไม่ลบ)

เหตุผล: ผู้ใช้ยืนยันเลือกทางเลือกนี้ตรงๆ เพราะ Buaflow เป็น workflow มาตรฐานของ kit ที่เพิ่งลงทุนตั้งค่าไว้ทั้งหมด
(gate, verify, ADR, constitution, backlog) — การให้ 2 ระบบขัดกันต่อจะทำให้ทุกอย่างที่เพิ่งทำใน Phase A/7 ไร้ความหมาย

## ผลที่ตามมา
**ผลดี:**
- มี workflow เดียวไม่ขัดกัน — AI ไม่ต้องเดาว่าจะเชื่อฝั่งไหน
- Buaflow ให้ gate ที่บังคับจริงนอก session (pre-push) ซึ่งระบบเดิมไม่มี

**ผลเสีย / สิ่งที่ต้องยอมรับ:**
- แนวคิด delegate-only ของ Product Owner เดิม (ไม่ให้ main agent เขียนโค้ดเอง) ไม่ได้ใช้งานอีกต่อไป
- 4-perspective review (correctness/quality/security/architecture) แบบเดิมไม่ได้ทำงานอัตโนมัติทุกครั้ง —
  Buaflow's `/check` เรียก built-in `/code-review` และ `/security-review` แทน ซึ่งมุมมองอาจไม่ตรงกัน 100%

**สิ่งที่ต้องทำเพิ่มเพราะเลือกแบบนี้:**
- แก้ `CLAUDE.md` เอา import เดิมออก เขียนใหม่ตาม `buaflow/templates/CLAUDE.md.tpl` (Phase 7.3)

## ทบทวนเมื่อไหร่
ถ้าทีมรู้สึกว่า `/check` (built-in code-review + security-review) ให้คุณภาพ review ไม่พอเทียบกับ 4-perspective
เดิม ให้เปิด intent พิจารณาเพิ่ม custom review step เข้าไปใน `/check` ของ Buaflow แทนการฟื้นระบบเดิมทั้งชุด

---

> **กติกา:** ถ้าเปลี่ยนใจภายหลัง ให้เขียน ADR ใหม่ที่ supersede อันนี้
> **ห้ามแก้ ADR เดิม** เพราะ ADR คือบันทึกประวัติศาสตร์ว่าตอนนั้นคิดอะไรอยู่
