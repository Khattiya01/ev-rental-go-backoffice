# ธรรมนูญโปรเจกต์ — EV Rental GO — Web Backoffice

> หลักการถาวรที่ **ทุก spec ทุก plan ทุก PR ต้องผ่าน** ไม่ใช่คำแนะนำ
> เก็บที่ `docs/constitution.md` — แก้ได้ แต่ต้องแก้แบบมีเวอร์ชันและมีเหตุผล (ดูท้ายไฟล์)
> อ่านโดย: `/spec`, `/plan`, `/review` และ subagent `code-reviewer`

---

## มาตรา 1 — เอกสารคือความจริง (Artifact over memory)
ทุกงานต้องมีร่องรอยเป็นไฟล์ใน git ตามสายนี้:

```
intent.md → spec (requirements → design → tasks) → plan.md → diff → review → done
```

- ห้ามเริ่มงานที่ไม่มี task file
- ห้ามเขียนโค้ดของ feature ใหญ่ที่ยังไม่มี spec อนุมัติครบ 3 ไฟล์
- **ถ้าโค้ดกับเอกสารไม่ตรงกัน แปลว่ามีอย่างหนึ่งผิด** ต้องแก้ให้ตรงกันในรอบนั้น
  เพราะ AI อ่านเอกสารเป็นความจริง ถ้าเอกสารโกหก AI จะเขียนโค้ดผิดต่อเนื่อง
  (โปรเจกต์นี้เจอแล้วจริง — ดูมาตรา 9.2)

## มาตรา 2 — ห้ามเดา (No guessing)
ทุกจุดที่ไม่ชัดและมีผลต่อผลลัพธ์ ต้องทำเครื่องหมาย **ห้ามเติมเอาเอง**:

```
[NEEDS CLARIFICATION: <คำถามที่ต้องการคำตอบ>]
```

- spec จะผ่าน gate ไปขั้นถัดไปไม่ได้ถ้ายังเหลือ marker
- ถามทีละกลุ่ม ไม่เกิน 4 ข้อต่อรอบ และ **ต้องเสนอคำแนะนำพร้อมเหตุผลเสมอ** ไม่ใช่ยิงคำถามเปล่า

## มาตรา 3 — ต้องพิสูจน์ได้ (Verification) — **ห้ามต่อรอง**
- ทุก task ต้องระบุ **proof** ว่าอะไรพิสูจน์ว่าเสร็จ (เทสไหน / คำสั่งไหน / ภาพหน้าจอไหน)
- **ห้ามรายงานว่าผ่านถ้ายังไม่ได้รันจริง** ต้องแปะผลลัพธ์จริงให้ดู ไม่ใช่ประกาศว่าสำเร็จ
- bug ทุกตัว: **เขียนเทสที่ fail ก่อน** แล้วค่อยแก้ให้ผ่าน
- backend: unit test เขียนพร้อม module เสมอ ไม่เลื่อน
- คำสั่งตรวจมาตรฐานคือ **`pnpm verify`** (= `node scripts/verify.mjs` → typecheck → lint → build → test)
  ต้องรันจบใน **~30 วินาที** (วัดจริง ~25s ตอนตั้งค่า — ดู A.2 ใน `docs/planning/_state.md`)
  (ถ้าช้ากว่านี้ AI จะไม่วนซ้ำ = feedback loop ตาย)

## มาตรา 4 — เล็กก่อนเสมอ (Simplicity)
ก่อนผ่าน design gate ต้องตอบได้ว่า:
- [ ] แก้ปัญหานี้ด้วยของที่มีอยู่แล้วในโปรเจกต์ไม่ได้จริงหรือ
- [ ] ไม่ได้เผื่ออนาคตที่ยังไม่มี requirement รองรับ
- [ ] ไม่ได้เพิ่ม dependency ใหม่ทั้งที่ของเดิมทำได้

## มาตรา 5 — ห้ามห่อโดยไม่จำเป็น (Anti-abstraction)
- ใช้ framework ตรง ๆ ก่อน อย่าสร้าง wrapper ของตัวเองครอบไว้เฉย ๆ
- ข้อมูลหนึ่งชนิดมี representation เดียว อย่าทำ DTO ซ้อน model ซ้อน type โดยไม่มีเหตุผล
- **abstract เร็วเกินไปแย่กว่า duplicate 2 ครั้ง** — เห็นซ้ำครั้งที่ 2 ค่อยยกขึ้นกลาง (แต่ต้องยกจริง)

## มาตรา 6 — สัญญาต้องมาก่อน (Contract-first)
- API ควรมี OpenAPI แต่**ของจริงตอนนี้ยังไม่มีเลย** (ยืนยันใน A.1-inventory) — ถือเป็นหนี้ที่มีอยู่ก่อนธรรมนูญนี้
  **API ใหม่ทุกตัวตั้งแต่วันนี้ต้องมี OpenAPI** ส่วน API เดิมทยอยเพิ่มตอนแตะไฟล์นั้น (ตามมาตรา 9.1)
- error ตอบตาม envelope กลาง `{ error: string }` พร้อม HTTP status ที่เหมาะสม (pattern เดิมของโปรเจกต์ — ดู A1-inventory ข้อ 4)
- breaking change ต้องประกาศและคุยเรื่อง version ก่อนทำ

## มาตรา 7 — คนเป็นคนอนุมัติ (Separation of duties)
- **AI ไม่อนุมัติงานของตัวเอง** ไม่ว่ากรณีใด — ในทางปฏิบัติคือ **AI ไม่ merge เข้า main** `/done` เปิด PR ให้คนกด (hook บล็อก merge/push เข้า main)
- main รับของผ่าน PR ที่ gate (verify + check-config + docs-lint) ผ่านแล้วเท่านั้น — ทำงานคนเดียวก็ยังกด merge เองใน UI
- AI ทำงานที่ไม่ต้องใช้วิจารณญาณ (เขียน ตรวจ รัน format สรุป)
- คนตัดสินสิ่งที่ต้องใช้วิจารณญาณ (ยอมรับความเสี่ยงไหม ขึ้น prd ไหม นโยบายชนกันเอาทางไหน)

## มาตรา 8 — กฎที่ห้ามพัง ต้องมี hook
กติกาแบ่งเป็น 3 ชั้น ถ้ากฎข้อไหน "ห้ามพังเด็ดขาด" แต่มีแค่ข้อความ ถือว่ายังไม่เสร็จ:

| ชั้น | ที่อยู่ | ความแข็ง |
|---|---|---|
| ความรู้ที่ต้องรู้ตลอด | `AGENTS.md` / `CLAUDE.md` | แนะนำ (AI อาจพลาด) |
| ข้อบังคับเฉพาะโซนไฟล์ | `.claude/rules/*.md` + `paths:` | แนะนำ แต่ตรงจุดกว่า |
| **กฎที่ห้ามพัง** | `.claude/hooks/` + `settings.json` | **บังคับจริง** (ใน session ของ Claude) |
| **กฎที่ต้องอยู่นอก session** | `.claude/gate.js` ใน pre-push + CI + branch protection | **บังคับจริง** (คน / AI ตัวอื่น ก็ข้ามไม่ได้) — ยังไม่ติดตั้ง รอ Phase 7 |

## มาตรา 9 — ข้อกำหนดที่ล็อกของโปรเจกต์นี้
<!-- เติมจากผลการสำรวจโค้ดจริงใน Phase A (A1-inventory.md) และ ADR ใน docs/adr/ — ของจริงชนะ default ของ kit เสมอ -->

| หัวข้อ | ค่าที่ล็อก | เพราะ |
|---|---|---|
| UI library | Hand-rolled component ทั้งหมดใน `components/ui/` (ไม่ใช่ shadcn/ui แม้ agent doc เดิมจะเขียนผิดไว้) | ADR-0003 — ทีมต้องการคุม design เองทั้งหมด ไม่ผูกกับ shadcn |
| Auth | Custom JWT (`jose`) + httpOnly cookie + `bcryptjs` (ไม่ใช่ NextAuth แม้ AGENTS.md เดิมจะเขียนผิดไว้) | ADR-0002 — ทีมต้องการคุม session logic เองทั้งหมด |
| ORM / Database | Drizzle ORM บน PostgreSQL + TimescaleDB extension (ตาราง `telemetry_history`) | ADR-0004 — คุม SQL/query เอง + type-safe, TimescaleDB เหมาะกับ GPS time-series |
| i18n | th + en ตั้งแต่วันแรก ทุกข้อความผ่าน key (`next-intl`, `messages/{en,th}.json`) | ของจริงใช้แบบนี้อยู่แล้ว — เพิ่มทีหลังแพงกว่ามาก |
| Theme | CSS variable token ทั้งหมดใน `app/globals.css` (`--color-*`) ห้ามสีดิบใน component | ของจริงใช้แบบนี้อยู่แล้ว — dark mode / rebrand ทำได้โดยไม่แตะ component |
| Backlog source of truth | ไฟล์ `docs/backlog/tasks/*.md` generate เป็น `docs/backlog/board.md` ด้วย `node .claude/board.js` ห้ามแก้ `board.md` มือ | โปรเจกต์นี้ไม่มี issue tracker เดิม (ยืนยันใน A1-inventory) — ใช้ default ของ kit ได้ตรงๆ ไม่ชนกับของเดิม |
| Docker | ใช้เฉพาะ **dev-time infra dependencies** เท่านั้น (Postgres/TimescaleDB, Redis, Mosquitto ผ่าน `docker-compose.yml`) — ตัวแอป (`server.ts`) **ไม่ได้ containerize**, รันตรงด้วย `pnpm start`/`tsx` บนเครื่อง | ของจริงเป็นแบบนี้ — **ต่างจาก default ของ kit** ("ใช้ทั้ง dev และ deploy") ห้ามเสนอเขียน Dockerfile ให้แอปโดยไม่มี intent ที่อนุมัติก่อน |
| Git host | GitHub (`github.com/Khattiya01/ev-rental-go-backoffice`) | มี remote จริงอยู่แล้ว — ต่างจาก default "ยังไม่ตัดสินใจ" ของ kit ใช้ GitHub Actions เป็นตัวเลือกแรกถ้าจะต่อ CI |
| CI/CD | ยังไม่มี pipeline (`ต้องแก้` ใน check-config) แต่ `pnpm verify` เป็น one-command แล้ว พร้อมต่อ CI ได้ทันทีที่ Phase 7 | ยังไม่เคยตั้งมาก่อน ไม่ใช่ของเดิมที่ต้องรักษาไว้ |
| Deploy target | On-premise 2 เครื่อง (App Server: Next.js+IoT Gateway+Mosquitto / Data Server: PostgreSQL+Redis) | ADR-0006 — ควบคุมข้อมูล/PDPA + คุมต้นทุน |
| API validation | Zod อยู่ใน dependency แต่ route handler ส่วนใหญ่ validate มือ (ของเดิม) — **API ใหม่ควรเริ่มใช้ zod schema จริง** ส่วนของเดิมทยอยแก้ตอนแตะไฟล์นั้น | ลดความเสี่ยง input ไม่ตรง type ที่ boundary โดยไม่ต้อง refactor ของเดิมทั้งหมดทันที |

### มาตรา 9.1 — ของใหม่กับของเก่า

- โค้ด**ใหม่**ต้องตามมาตรฐานในธรรมนูญนี้ทุกข้อ
- โค้ด**เก่า**ที่ไม่ตรงมาตรฐาน: ปรับ**เฉพาะไฟล์ที่กำลังแตะอยู่แล้ว** และเฉพาะส่วนที่แตะ
  **ห้าม** refactor ไฟล์ข้างเคียงเพราะเห็นว่าไม่ตรงมาตรฐาน
- ห้ามเปิด task "ทำให้ทั้งระบบตรงมาตรฐาน" โดยไม่มี intent ที่ผู้ใช้อนุมัติ
- ของเก่าที่ไม่ตรงมาตรฐานและ**ยังทำงานได้** ไม่ใช่บั๊ก — ห้ามรายงานเป็น finding ใน review
- ตัวอย่างที่ใช้กฎนี้จริงในโปรเจกต์นี้: pattern `useEffect` + `fetch().then(setState)` ที่ใช้ทั้งระบบ
  ชนกับกฎ lint ใหม่ `react-hooks/set-state-in-effect` — **ไม่ใช่บั๊ก** ถูก baseline ไว้ใน `eslint.config.mjs`
  (ดู A.2 ใน `docs/planning/_state.md`) ห้ามเสนอ refactor data-fetching pattern ทั้งระบบโดยไม่มี intent อนุมัติก่อน

> เหตุผล: ธรรมนูญที่ขัดกับโค้ดเดิมโดยไม่มีข้อนี้ จะทำให้ AI พยายาม refactor ทั้งระบบทุกครั้งที่แตะไฟล์
> หรือไม่ก็เลือกระหว่างกฎกับของเดิมแบบสุ่ม — ทั้งสองแบบแย่กว่าไม่มีธรรมนูญ

### มาตรา 9.2 — เอกสารเดิมที่รู้แล้วว่าผิด (ต้องแก้ใน Phase 7 ไม่ใช่เดี๋ยวนี้)

พบระหว่างสำรวจ (A.1) ว่าเอกสารต่อไปนี้ไม่ตรงกับโค้ดจริง — **ถือโค้ดเป็นความจริงจนกว่าจะแก้เอกสาร**:

| ไฟล์ | เขียนว่าอะไร | ของจริง |
|---|---|---|
| `AGENTS.md` (แถว Tech Stack) | "Auth: NextAuth v5" | Custom JWT (`jose`) — ดู ADR-0002 |
| `.github/agents/frontend-implementer.agent.md` | "UI Components: shadcn/ui", "ALWAYS use existing shadcn/ui components" | Hand-rolled ทั้งหมด ไม่มี shadcn — ดู ADR-0003 |
| `README.md` (ท้ายไฟล์) | ยังมีท่อน "Deploy on Vercel" จาก `create-next-app` boilerplate | Deploy จริงเป็น on-premise 2 เครื่อง — ดู ADR-0006 |

ห้าม AI เชื่อ 3 จุดนี้จนกว่าจะแก้ในขั้น Phase 7 (handoff)

---

## การแก้ธรรมนูญ
| ข้อ | วิธี |
|---|---|
| เพิ่ม/แก้มาตรา | เขียน ADR อธิบายเหตุผล → แก้ไฟล์นี้ → เพิ่มเลขเวอร์ชันด้านล่าง |
| มาตราที่ขัดกันเอง | หยุด ถามเจ้าของโปรเจกต์ **ห้าม AI เลือกเอง** |
| ยกเว้นเป็นครั้งคราว | ต้องมีคนอนุมัติ และบันทึกเหตุผลไว้ในไฟล์ task นั้น |

**เวอร์ชัน:** v1.0 — 2026-09-24 (ฉบับแรก เขียนตอน Phase A.4 ของโปรเจกต์ที่ adopt ของเดิม — EXTEND mode)
