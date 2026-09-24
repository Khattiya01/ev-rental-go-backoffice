#!/usr/bin/env node
/**
 * scripts/verify.mjs — the single "did this work" command for this repo.
 *
 *   pnpm verify           short summary; full step output always written to .verify.log
 *   pnpm verify -- --full print full output too
 *
 * Runs typecheck -> lint -> build -> test, stopping at the first failing step.
 * Adapted from buaflow's templates/verify.mjs.tpl for this project's actual scripts.
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const FULL = process.argv.includes('--full')
const MAX_LINES = 25
const LOG = '.verify.log'

const STEPS = [
  { name: 'typecheck', cmd: 'pnpm', args: ['typecheck'] },
  { name: 'lint', cmd: 'pnpm', args: ['lint'] },
  { name: 'build', cmd: 'pnpm', args: ['build'] },
  { name: 'test', cmd: 'pnpm', args: ['test'] },
]
const IMPORTANT = /error|fail|✗|×|expected|received|AssertionError|TS\d{4}|\bat\s+.+:\d+:\d+/i

const t0 = Date.now()
const results = []
let fullLog = ''

for (const s of STEPS) {
  const st = Date.now()
  const r = spawnSync(s.cmd, s.args, { encoding: 'utf8', shell: process.platform === 'win32', env: { ...process.env, FORCE_COLOR: '0', CI: '1' } })
  const out = (r.stdout || '') + (r.stderr || '')
  const sec = ((Date.now() - st) / 1000).toFixed(1)
  fullLog += `\n===== ${s.name} (exit ${r.status}, ${sec}s) =====\n${out}`
  results.push({ name: s.name, ok: r.status === 0, sec, out })
  if (r.status !== 0) break
}

writeFileSync(LOG, fullLog.trimStart())
const total = ((Date.now() - t0) / 1000).toFixed(1)

if (FULL) console.log(fullLog)

const failed = results.find((r) => !r.ok)
const line = results.map((r) => `${r.ok ? '✓' : '✗'} ${r.name} ${r.sec}s`).join('   ')
const skipped = STEPS.slice(results.length).map((s) => `– ${s.name} (skipped)`).join('   ')
console.log(`verify  ${line}${skipped ? '   ' + skipped : ''}   [${total}s]`)

if (!failed) {
  const t = results.find((r) => r.name === 'test')
  const m = t?.out.match(/Tests?\s+(\d+)\s+passed[^\n]*/i) || t?.out.match(/(\d+)\s+passing/i)
  if (m) console.log(`        ${m[0].trim()}`)
  console.log('        all passed')
  process.exit(0)
}

if (!FULL) {
  const all = failed.out.split('\n').map((l) => l.trimEnd()).filter(Boolean)
  let lines = all.filter((l) => IMPORTANT.test(l))
  let how = `${lines.length} relevant lines`
  if (!lines.length) { lines = all.slice(-15); how = 'no line matched the error pattern — showing the last 15 lines' }
  const shown = lines.slice(0, MAX_LINES)
  console.log(`\n${failed.name} FAILED — ${how}, showing ${shown.length}:`)
  shown.forEach((l) => console.log('  ' + l.slice(0, 200)))
  if (lines.length > MAX_LINES) console.log(`  … ${lines.length - MAX_LINES} more`)
  console.log(`\nfull log: ${LOG}   (or: pnpm verify -- --full)`)
}
process.exit(1)
