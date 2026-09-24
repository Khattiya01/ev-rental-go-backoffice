# สถานะการวางแผนโปรเจกต์

- ชื่อโปรเจกต์: EV Rental GO — Web Backoffice
- คำอธิบาย: ระบบ Backoffice สำหรับบริหารจัดการธุรกิจให้เช่ารถ EV ในไทย ครอบคลุมการติดตามฟลีตแบบเรียลไทม์ (GPS/แบตเตอรี่/IoT), e-KYC ลูกค้า, สัญญาเช่า, บิลลิ่ง/เก็บหนี้, คิวซ่อมบำรุง และรายงานบริหาร (Next.js 16 full-stack)
- โหมด: EXTEND
- แหล่ง UI: NO_DESIGN
- path อ้างอิง: -
- root ของโปรเจกต์ (git work tree): `ev-rental-go-backoffice/` (โฟลเดอร์แม่ `EV_Rental_GO/` ไม่ใช่ git repo และมี `ev-rental-iot-gateway/` ซึ่งเป็น scope แยกต่างหาก — ไม่แตะ)
- อัปเดตล่าสุด: 2026-09-24

## ความคืบหน้า
| Phase | สถานะ | ไฟล์ผลลัพธ์ |
|---|---|---|
| 0 ตั้งต้น | ✅ เสร็จ | docs/planning/_state.md |
| A สำรวจของเดิม | ✅ เสร็จ (A.1–A.8 ผ่านหมด) | docs/planning/A1-inventory.md, docs/adr/, docs/constitution.md, .claude/, docs/backlog/, docs/intents/ |
| 7 Handoff | ✅ เสร็จ (commit `e3bdd5b` บน branch `chore/buaflow-adoption` — รอ push + เปิด PR) | AGENTS.md, CLAUDE.md, REVIEW.md, CONTRIBUTING.md, docs/workflow.md, docs/standards/, .git/hooks/{pre-push,post-merge,post-checkout} |
| 8 Tune | ♻️ ทำซ้ำเรื่อยๆ | อัปเดต config หลังใช้งานจริง |

## การตัดสินใจที่ล็อกแล้ว
- 2026-09-24: ยืนยันโหมด EXTEND — มีโค้ด Next.js 16 App Router ใช้งานจริงอยู่แล้วใน `ev-rental-go-backoffice/` (app/, components/, db/, lib/, tests 21 ไฟล์, Playwright config) จึงเข้า Phase A แทน Phase 1–6 ทั้งหมด
- 2026-09-24: ยืนยัน root ของ Buaflow lifecycle คือ `ev-rental-go-backoffice/` เพราะเป็น git work tree จริงตัวเดียวที่ตรงกับ scope "Web Backoffice only" ตาม AGENTS.md/CLAUDE.md ที่มีอยู่แล้ว — `ev-rental-iot-gateway/` เป็นอีก repo แยก ไม่อยู่ใน scope นี้
- 2026-09-24: แหล่ง UI/Design = NO_DESIGN — ยังไม่มีไฟล์ design แนบมา ใช้ pattern ที่มีอยู่ในโค้ดปัจจุบันเป็นฐาน และต้องถามผู้ใช้ก่อนออกแบบ component ใหม่ทุกครั้ง
- 2026-09-24: ผลตรวจ `buaflow assess` (probes only) — proven: none, reachable: R0, next: R1, ตัวบล็อกคือยังไม่มีคำสั่ง verify เดียว (ไม่มี verifyCommand ใน .claude/stack.json และไม่มี "verify" script) — ต้องแก้ใน Phase A.2
- 2026-09-24 (A.1): สำรวจโค้ดจริงเสร็จ → `docs/planning/A1-inventory.md` ผู้ใช้ยืนยันว่าตรงกับความเข้าใจแล้ว จุดสำคัญ: auth เป็น custom JWT (jose) ไม่ใช่ NextAuth v5, ไม่มี shadcn/ui (hand-rolled ทั้งหมด), AGENTS.md มี 2 จุดที่ผิดจากโค้ดจริง
- 2026-09-24 (A.5 บางส่วน, ทำล่วงหน้าเพื่อให้ A.2 เขียนผลได้): รัน `buaflow install --plugin --write` สร้าง `.claude/` (29+1+6 ไฟล์) และ `docs/templates/` (31 ไฟล์) — 0 conflict บันทึกไว้ที่ `.buaflow/lock.json` แล้ว
- 2026-09-24 (A.2): ตั้ง verify command สำเร็จ — `pnpm verify` = `node scripts/verify.mjs` รัน typecheck → lint → build → test ตามลำดับ หยุดที่ขั้นแรกที่พัง, พิมพ์สรุป ~5 บรรทัด, เขียน log เต็มลง `.verify.log` (gitignored) วัดเวลาจริง **~25 วินาที** ตั้งใน `.claude/stack.json.verifyCommand = "pnpm verify"` ยืนยันด้วย `node .claude/verify.js` แล้ว exit 0
  - แก้ config bug 3 จุดที่ทำให้ตัวเลข verify โกหก (ได้รับอนุมัติจากผู้ใช้ก่อนแก้ทุกจุด):
    1. `eslint.config.mjs` — เพิ่ม `.next-test/`, `.scannerwork/`, `.claude/` เข้า `globalIgnores` (ไม่งั้น lint ไปสแกนไฟล์ build ที่ minify แล้วกับสคริปต์ของ kit เอง ทำให้ตัวเลขพองเป็น 11,814 problems)
    2. `vitest.config.ts` — เพิ่ม `drizzle.config.test.ts` เข้า `exclude` (ชื่อไฟล์ชนกับ test glob `**/*.test.ts` ทั้งที่เป็น drizzle config ไม่ใช่ test)
    3. เพิ่ม script `"typecheck": "tsc --noEmit"` ใน `package.json` (ไม่เคยมีมาก่อน แม้ `.github/agents/*.agent.md` จะอ้างถึงคำสั่งนี้อยู่แล้ว)
  - lint baseline: ตั้ง override ใน `eslint.config.mjs` ให้ `react-hooks/set-state-in-effect` และ `react/no-unescaped-entities` เป็น `warn` เฉพาะ 16 ไฟล์ที่มี pattern fetch-on-mount (`useEffect` + `fetch().then(setState)`) เป็น convention เดิมของทั้งระบบอยู่แล้ว — ไฟล์ใหม่ที่ทำ pattern นี้ซ้ำจะยัง fail เหมือนเดิม เปิด intent ไว้ในข้อ A.7 สำหรับพิจารณา data-fetching library ในอนาคต
  - พบ+แก้บั๊กจริง 2 จุด (ไม่ใช่ baseline เพราะเป็น pattern เสี่ยงจริง ไม่ใช่แค่ lint เข้มขึ้น): `app/(backoffice)/billing/overdue/page.tsx` และ `app/(backoffice)/customers/blacklist/page.tsx` เรียก `setPage(1)` ตรงๆ ข้างใน `useMemo` (เสี่ยง infinite loop) → ย้ายไปเป็น `useEffect(() => setPage(1), [search])` แยกต่างหาก
  - `stack.json.protected`: ลบ pattern `**/components/ui/**` ออก เพราะโปรเจกต์นี้ไม่ได้ใช้ shadcn และ component ทั้งหมดเป็นโค้ดของทีมเอง แก้ไขได้อิสระ (ตามคำแนะนำในไฟล์ template เอง)
- 2026-09-24: รัน `node .claude/check-config.js` ครั้งแรก — เจอ "ต้องแก้: 3" (ไม่มี REVIEW.md, ไม่มี docs/constitution.md, AGENTS.md ยาวเกิน 200 บรรทัด) ทั้งหมดเป็นงานของ A.3–A.5/Phase 7 ที่ยังไม่ได้ทำ ไม่ใช่ปัญหาใหม่
- 2026-09-24 (A.3): เขียน ADR ย้อนหลัง 6 ฉบับใน `docs/adr/` สถานะ Accepted ทั้งหมด (ผู้ตัดสินใจ: ทีมพัฒนา EV Rental GO) — ถามเหตุผลจากผู้ใช้ก่อนเขียนทุกฉบับ ไม่มีการแต่งเหตุผลเอง:
  1. `0001-nextjs-fullstack-monolith.md` — เลือก Next.js เพราะทีมถนัด TypeScript full-stack เดียวจบ
  2. `0002-custom-jwt-auth.md` — custom JWT (jose) แทน NextAuth v5 เพราะอยากคุม session logic เอง (ตั้งข้อสังเกตไว้ในไฟล์ว่า AGENTS.md ยังเขียนผิดว่าใช้ NextAuth — ต้องแก้ Phase 7)
  3. `0003-hand-rolled-ui-components.md` — hand-roll UI เองแทน shadcn/ui เพราะอยากคุม design เอง (ตั้งข้อสังเกตไว้ว่า `.github/agents/frontend-implementer.agent.md` ยังเขียนผิดว่าใช้ shadcn — ต้องแก้ Phase 7 ไม่งั้น AI จะพยายามรัน shadcn CLI ทับไฟล์ทีม)
  4. `0004-drizzle-orm-postgres-timescaledb.md` — Drizzle เพราะอยากคุม SQL/query เอง + type-safe, TimescaleDB สำหรับ GPS time-series
  5. `0005-hybrid-monolith-iot-gateway-split.md` — แยก IoT Gateway เพราะกลัว raw MQTT traffic บล็อก Event Loop ของ backoffice (เหตุผลนี้มีอยู่แล้วใน AGENTS.md ไม่ได้ถามใหม่)
  6. `0006-on-premise-two-server-deployment.md` — on-premise 2 เครื่องเพราะควบคุมข้อมูล/PDPA + คุมต้นทุน
- 2026-09-24 (A.4): เขียน `docs/constitution.md` v1.0 เสร็จ — มาตรา 9 บันทึกของจริงทั้งหมด (UI, Auth, ORM, i18n, Theme, Backlog SoT, Docker, Git host, CI/CD, Deploy target, API validation) พร้อมเหตุผลจาก ADR/A1-inventory ไม่มีการเดา จุดที่ต่างจาก default ของ kit อย่างมีนัยสำคัญ:
  - Docker ในโปรเจกต์นี้ใช้แค่ dev-time infra (postgres/redis/mosquitto) ไม่ได้ containerize ตัวแอปเอง (ไม่มี Dockerfile) — ต่างจาก default "ใช้ทั้ง dev และ deploy" ของ kit
  - Git host ตัดสินใจแล้วจริง (GitHub: Khattiya01/ev-rental-go-backoffice) — ต่างจาก default "ยังไม่ตัดสินใจ" ของ kit
  - เพิ่มมาตรา 9.1 (ของใหม่ vs ของเก่า) พร้อมตัวอย่างจริงจากโปรเจกต์ (baseline ของ react-hooks/set-state-in-effect)
  - เพิ่มมาตรา 9.2 ใหม่ (ไม่ได้อยู่ใน template เดิม) บันทึกเอกสารเดิม 3 จุดที่รู้แล้วว่าผิด (AGENTS.md auth, frontend-implementer.agent.md shadcn, README.md Vercel boilerplate) — ต้องแก้ Phase 7
  - `node .claude/check-config.js` ยืนยันว่า docs/constitution.md ผ่านแล้ว (ไม่อยู่ใน "ต้องแก้" อีกต่อไป) เหลือ REVIEW.md กับ AGENTS.md ยาวเกิน 200 บรรทัด ซึ่งเป็นงาน Phase 7
- 2026-09-24 (A.5): ปรับ `.claude/rules/*.md`, `.claude/stack.json`, `.claude/settings.json` ให้ตรงของจริงทั้งหมด — `check-config.js` จาก "ควรดู: 21" เหลือ "ควรดู: 15", ทุก rule ตอนนี้ "match ... ทุก pattern ใช้งานจริง" (ก่อนหน้ามี pattern ตายอยู่ใน 5 จาก 6 ไฟล์):
  - `backend-api.md`: ตัด path ที่ไม่มีจริง (modules/server/routes/services) เหลือ `**/api/**/*.ts`; แก้เนื้อหาที่อ้าง Postman collection/OpenAPI ที่ไม่มีในนี้จริง ให้บอกว่าใช้ E2E แทน + ตั้งใจให้ของใหม่เริ่ม zod/OpenAPI ส่วนของเก่าไม่ต้องรื้อ
  - `db-migration.md`: ตัด path อ้าง Prisma (`**/prisma/**`, `schema.prisma`) ที่ไม่มีจริง เพิ่ม `db/schema/**/*.ts` (ของจริงคือ Drizzle) ทำให้ match จาก 2 ไฟล์เป็น 17 ไฟล์ + เตือนห้ามใช้ `db:push` กับ DB ที่แชร์/production
  - `frontend-ui.md`: เขียนใหม่เกือบทั้งไฟล์ — ตัดทุกจุดที่อ้าง shadcn/ui registry, `components/shared/` (ไม่มีจริง — `components/ui/` คือ shared layer เดียว), `cva`/`cn()` (ไม่ใช่ dependency ของโปรเจกต์นี้เลย) ให้ตรงกับ pattern จริง (variant style map + template literal ตาม `components/ui/badge.tsx`)
  - `i18n.md`: ตัด path `**/locales/**` (ของจริงคือ `messages/`) แก้ผังคีย์จาก 3 ระดับสมมติเป็น 2 ระดับจริง (`<page>.<element>`) และแก้ที่บอกว่า "แยกไฟล์ตาม namespace" เป็นของจริง (1 ไฟล์ต่อภาษา ~1250 บรรทัด) + แก้เรื่อง Buddhist year ที่ไม่มี helper จริง (ยังไม่ implement)
  - `testing.md`: ตัด path `**/tests/**` ที่ไม่มีจริง แก้เรื่อง "Integration (API) ผ่าน Postman" เป็นของจริง (ไม่มี Postman ในนี้ ใช้ E2E แทน)
  - `.claude/stack.json`: `preflightHookPath` → `.git/hooks/pre-push` (โปรเจกต์ไม่ได้ใช้ husky), `commands.coverage`/`commands.apiTest` → `null` (ไม่มี script `test:cov`/`test:api` จริง), เอา `prisma`/`sql` ออกจาก `codeFilePattern`, เพิ่ม `.next-test` เข้า `skipPattern`
  - `.claude/settings.json`: แก้ `Read(src/**)` (ไม่มีจริง) เป็น `Read(app/**)`/`Read(components/**)`/`Read(lib/**)`/`Read(db/**)`, แก้ `Bash(pnpm test:cov)` เป็น `Bash(pnpm test:e2e)`
  - รัน `pnpm verify` ซ้ำหลังแก้ทุกจุด — ยังผ่านเหมือนเดิม (89/89 test, build ผ่าน)
  - ยังไม่แตะ: docs/evals (ยังไม่ seed, เป็นของ Phase 7.11), CLAUDE.md (อยู่แล้วถูกต้อง ไม่ต้องรื้อ), .claude/agents (ไม่มี — ปกติสำหรับโปรเจกต์นี้ตามกฎข้อ 10 ของ kit)
- 2026-09-24 (A.6): ตัดสินใจ source of truth ของงาน = **repo เป็นหลัก** บันทึกเป็น `docs/adr/0007-repo-as-backlog-source-of-truth.md` เหตุผล: ไม่มี external tracker ใช้งานอยู่จริงเลย (เช็คแล้วไม่มี GitHub Issues/Projects เปิดใช้, `gh pr list --state open` ว่างเปล่า, ทุก branch (`dev`/`prd`/`uat`/`release-sprint4`/`release-sprint5`) sync กับ `main` แล้วไม่มี commit ค้าง — ไม่มีงาน in-progress ต้อง seed เป็น task)
  - ผู้ใช้ยืนยันว่าไฟล์ sprint เดิม (`SPRINT1-5.md` ในโฟลเดอร์แม่ `EV_Rental_GO/planings/` นอก repo นี้) เป็นประวัติศาสตร์งานเสร็จหมดแล้ว **ไม่ import เป็น intent**
  - สร้าง `docs/backlog/tasks/` (ว่าง), รัน `node .claude/board.js` ได้ `docs/backlog/board.md` (0 task, 0 intent), เพิ่ม `docs/backlog/board.md` เข้า `.gitignore` (generate เท่านั้น ห้าม commit)
  - สร้าง `docs/intents/`, `docs/plans/`, `docs/specs/`, `docs/evals/` พร้อม `.gitkeep`
  - `check-config.js`: "ควรดู" ลดจาก 15 → 8, artifact-chain folder ทุกอันเป็น `ok` แล้ว เหลือ "ต้องแก้" แค่ 2 จุดเดิม (REVIEW.md, AGENTS.md ยาวเกิน 200) ซึ่งเป็นงาน Phase 7
- 2026-09-24 (A.7): บันทึกสิ่งที่เจอระหว่างสำรวจแต่ยังไม่แก้ เป็น intent (status: draft) 6 ใบใน `docs/intents/` — ยังไม่ได้ตัดสินใจทำ/ไม่ทำ รอผู้ใช้ไล่ตัดสินทีละอันภายหลัง (ไม่บังคับต้องตัดสินตอนนี้ตามกฎ kit):
  1. `I-001` — ใช้ zod validation จริงที่ API boundary แทน validate มือ
  2. `I-002` — เขียน OpenAPI spec ให้ API ที่มีอยู่ (ตอนนี้ไม่มีเลย)
  3. `I-003` — ทบทวน data-fetching pattern (useEffect+fetch) ที่ชนกับ lint ใหม่ทั้งระบบ
  4. `I-004` — เปลี่ยนจาก `db:push` เป็น `db:generate`+`db:migrate` สำหรับ production
  5. `I-005` — เพิ่ม rate limiting ที่ `/api/auth/login` และ webhook endpoints
  6. `I-006` — ทำแผน backup/disaster-recovery ที่ทดสอบจริง (จำเป็นสำหรับอ้าง readiness R3 — มาจากผล `buaflow assess` ที่ Phase 0)
  - รัน `node .claude/board.js` ซ้ำ → `docs/backlog/board.md` แสดง 0 task, 6 intent แล้ว
- 2026-09-24 (A.8): เช็กก่อนปิด Phase A — ผ่านครบทุกข้อ:
  1. ✅ `docs/planning/A1-inventory.md` ครบทุกหมวด ผู้ใช้ยืนยันแล้วว่าตรงกับความเข้าใจ (A.1)
  2. ✅ `node .claude/verify.js` มีคำสั่งจริง (`pnpm verify`) รันผ่าน — รอบล่าสุด: typecheck 2.3s + lint 7.3s + build 18.2s + test 13.9s = 41.7s, 89/89 test ผ่าน
  3. ✅ ADR ย้อนหลัง 7 ฉบับ (0001–0007) สถานะ Accepted ทั้งหมด (อยู่ในกรอบ 3–7 ของ kit)
  4. ✅ `docs/constitution.md` มาตรา 9 เป็นของจริงทั้งหมด + มาตรา 9.1 เปิดใช้ (มีมาตรา 9.2 เพิ่มเติมด้วย)
  5. ✅ ตัดสินเรื่อง source of truth แล้ว → ADR-0007
  6. ✅ งานค้างเดิม — ไม่มี (sprint เดิมเสร็จหมดแล้ว, ยืนยันจากผู้ใช้ + git branches ทุกอัน sync กับ main + ไม่มี PR เปิดค้าง)
  7. ✅ `_state.md` อัปเดตต่อเนื่องทุก sub-phase
  - `node .claude/check-config.js` เหลือ "ต้องแก้" 2 จุดเดิม (REVIEW.md, AGENTS.md ยาวเกิน 200 บรรทัด) — เป็นงานของ Phase 7 ตามที่ระบุไว้ตั้งแต่ A.1 ไม่ใช่ตัวบล็อกของ Phase A
  - `buaflow doctor` เหลือ warning เดียว: ไม่มี `.buaflow/project.json` (ยังไม่ได้รัน `buaflow init` — เป็น metadata เสริม ไม่ใช่ requirement ของ A.8)
  - **Phase A ปิดแล้ว → พร้อมเข้า Phase 7 (Handoff)**

- 2026-09-24 (Phase 7): ทำ handoff ครบตาม `phases/07-handoff.md`:
  - 7.2–7.3: เขียน `AGENTS.md` ใหม่ (167 บรรทัด, ภาษาอังกฤษ, แก้ auth/UI claim ที่ผิด, มีตัวอย่าง verify ที่ผ่านจริง, หมวด "Things the AI gets wrong" เริ่มมี 3 ข้อจริงจาก session นี้) และ `CLAUDE.md` (thin layer ตาม template)
  - **พบข้อขัดแย้ง workflow ใหญ่ระหว่างทาง**: `CLAUDE.md` เดิม import ระบบ multi-agent ของตัวเอง (`.github/agents/product-owner.agent.md` ฯลฯ ที่ห้าม AI เขียนโค้ดเอง ต้อง delegate ทุกครั้ง) ขัดกับ workflow ของ Buaflow ที่ main session ทำงานตรง — **ผู้ใช้เลือกใช้ Buaflow เป็นหลัก** บันทึกเป็น `docs/adr/0008-buaflow-as-primary-ai-workflow.md` ย้ายไฟล์เดิมไป `docs/_archive/github-agents/` (ไม่ลบ)
  - 7.4: `.claude/stack.json` ตั้ง `ciMode: local-only` ตามที่ผู้ใช้เลือก (ยังไม่มี GitHub Actions), ติดตั้ง `.git/hooks/pre-push` (เรียก `gate.js`) + `post-merge`/`post-checkout` (regenerate board.md อัตโนมัติ) เพราะไม่มี husky — ทดสอบจริงทั้ง 3 ตัวแล้วผ่าน (รวมทดสอบบน branch `fix/` จริงว่าบล็อกการแก้ไฟล์เทสได้จริง)
  - **เจอ critical security finding ระหว่างรัน gate ครั้งแรก**: `pnpm audit` พบ unauthenticated RCE 2 ตัวใน `next@16.2.6` เอง (ไม่ใช่ dev-dependency) แก้ได้ด้วยการอัป `>=16.3.3` — ผู้ใช้เลือกทำเป็น intent แยก (`I-007`) แทนการแก้ทันที
  - 7.5: เขียน `REVIEW.md`
  - 7.6: copy `docs/standards/*.md` (23 ไฟล์) + `docs/templates/` (31+ ไฟล์ จาก A.2 อยู่แล้ว) + `docs/evals/EV-001..005.json` เข้าโปรเจกต์ — แก้ `tests[]`/`ablation.disable` ของทุก eval case ให้ชี้ไฟล์จริงที่มีอยู่ในโปรเจกต์แทน path เชิงสัญลักษณ์ของ kit (ไม่งั้น `node .claude/gate.js` fail ที่ eval-harness ทันที — เจอและแก้แล้ว) และแก้เนื้อหา standards ที่อ้าง shadcn/Prisma/container-first ให้ตรงของจริง (banner note ในแต่ละไฟล์ที่กระทบ) สร้างโฟลเดอร์ว่าง `docs/incidents/`, `docs/releases/`, `docs/discovery/`
  - 7.7: เขียน `CONTRIBUTING.md` ใหม่, แก้ `README.md` (เพิ่ม stack/โครงสร้าง/ลิงก์เอกสาร, ลบท่อน "Deploy on Vercel" ที่ผิดออก)
  - 7.8: เขียน `docs/workflow.md` จาก `workflow-lifecycle.md` พร้อม banner แก้จุดที่ไม่ตรง (ไม่มี Postman/OpenAPI, ไม่มี Phase 1-6 docs, ciMode local-only)
  - 7.10: เช็กลิสต์ก่อนปิด — `check-config.js` ต้องแก้:0, `node .claude/gate.js` **ผ่านทุกด่าน** (verify 42.4s, audit warn, secrets skip เพราะไม่มี gitleaks, check-config/docs-lint/evals pass), `board.js --check` ตรงกัน, ทดสอบ hook จริงครบ (guard-edit/guard-bash/fix-branch-block) — เจอ 3 อย่างที่ต้องแก้เพิ่มระหว่างเช็ก:
    1. `.env.example` **ไม่เคยถูก commit เข้า git เลย** เพราะ `.gitignore` มี `.env*` โดยไม่มี exception — เพิ่ม `!.env.example` แล้ว `git add` แล้ว
    2. ไม่มี `/health` endpoint (ตรงกับที่ `buaflow assess` เคยเจอที่ Phase 0) → บันทึกเป็น `I-008`
    3. dark mode ไม่มีจริง มีแค่ Tailwind boilerplate ที่ไม่ได้ใช้ → บันทึกเป็น `I-009`
    ส่วนที่ต้องให้ผู้ใช้ตรวจเองในเซสชันจริง (ไม่ใช่สิ่งที่ตรวจแทนได้): เปิด session ใหม่แล้วเช็ค `/context`, `/hooks`, พิมพ์ `/` ดู skills, และ QA เต็มรูปแบบผ่าน browser จริง (th/en, docker compose up ครบวงจร)
  - 7.11: eval baseline — cases ผ่านการตรวจโครงสร้างแล้ว (`eval-harness.js` = 5 case valid) แต่**ยังไม่รัน/ยังไม่ให้คะแนน** เพราะคนที่เขียน config เอง (Claude ใน session นี้) ตรวจ eval ของตัวเองไม่ได้ตามกฎ kit — ต้องให้คนอื่น/session อื่นรันจริงทีหลัง
  - 7.12: commit ทุกอย่างบน branch ใหม่ `chore/buaflow-adoption` (commit `e3bdd5b`, 150 ไฟล์) **ไม่ commit ตรงเข้า main** ตาม ADR-0008 — ยังไม่ได้ push/เปิด PR (รอ user ยืนยัน)
  - พบบั๊กจริงเพิ่มระหว่างทาง: `.env.example` หลุดจาก git tracking ทั้งที่มีมาตั้งแต่ต้น (แก้แล้ว), เจอ Next.js RCE (บันทึกเป็น intent)

## คำถามที่ยังค้าง
(ไม่มี)
