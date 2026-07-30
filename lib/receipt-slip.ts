import 'server-only'
import fs from 'fs/promises'
import path from 'path'
import { GlobalFonts, createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas'

// Same branded visual language as the client-side `buildBrandedSlipCanvas`
// helper in app/(backoffice)/billing/invoices/[id]/page.tsx (rounded-card,
// indigo header-band) — kept in sync deliberately so the Stripe-generated
// receipt reads as the same product as the pre-payment slip download.
const CARD_WIDTH = 480
const CARD_HEIGHT = 620
const HEADER_HEIGHT = 140
const CARD_RADIUS = 24
const HEADER_COLOR = '#4f46e5'

const SHOP_NAME = 'EV RENTAL GO'
// payments.method is currently a single-value enum ('promptpay') combined with a
// single-value provider ('stripe') — this label is intentionally a fixed string
// rather than derived from the row, since PromptPay-via-Stripe is the only
// payment path that produces a receipt today.
const PAYMENT_METHOD_LABEL = 'PromptPay via Stripe'

const FONT_FAMILY = 'Noto Sans Thai'
const FONT_PATH = path.join(process.cwd(), 'lib', 'assets', 'fonts', 'NotoSansThai-Regular.ttf')
const LOGO_PATH = path.join(process.cwd(), 'public', 'images', 'logo.png')

let fontRegistered = false
function ensureFontRegistered(): void {
  if (fontRegistered) return
  if (!GlobalFonts.has(FONT_FAMILY)) {
    GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY)
  }
  fontRegistered = true
}

function font(weightAndSize: string): string {
  return `${weightAndSize} "${FONT_FAMILY}"`
}

function traceRoundedRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function fmtAmount(n: number): string {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0 })
}

export interface GenerateReceiptSlipParams {
  invoiceNo: string
  /** Whole baht (decimal currency units) — same convention as payments.amount. */
  amount: number
  /** Thai-formatted paid-at display string, e.g. from lib/date.ts formatThaiDate. */
  paidAtLabel: string
  /** Stripe PaymentIntent id, printed for traceability. */
  paymentIntentId: string
}

/**
 * Renders a branded post-payment receipt PNG for a succeeded Stripe/PromptPay
 * payment. Pure rendering helper — no DB or storage I/O happens here, the
 * caller is responsible for persisting the returned buffer.
 */
export async function generateReceiptSlipPng(params: GenerateReceiptSlipParams): Promise<Buffer> {
  ensureFontRegistered()

  const logoBuffer = await fs.readFile(LOGO_PATH)
  const logoImg = await loadImage(logoBuffer)

  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT)
  const ctx = canvas.getContext('2d')

  // White rounded card background
  traceRoundedRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  // Clip everything below to the card's rounded outline so the header band's
  // top corners pick up the same rounding for free.
  ctx.save()
  traceRoundedRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS)
  ctx.clip()

  // Header band
  ctx.fillStyle = HEADER_COLOR
  ctx.fillRect(0, 0, CARD_WIDTH, HEADER_HEIGHT)

  // Logo (preserve aspect ratio), centered near the top of the header
  const logoTargetHeight = 40
  const logoRatio = logoImg.naturalWidth && logoImg.naturalHeight
    ? logoImg.naturalWidth / logoImg.naturalHeight
    : 1
  const logoTargetWidth = logoTargetHeight * logoRatio
  const logoX = (CARD_WIDTH - logoTargetWidth) / 2
  const logoY = 26
  ctx.drawImage(logoImg, logoX, logoY, logoTargetWidth, logoTargetHeight)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Shop name + subtitle
  ctx.fillStyle = '#ffffff'
  ctx.font = font('600 15px')
  ctx.fillText(SHOP_NAME, CARD_WIDTH / 2, logoY + logoTargetHeight + 26)
  ctx.font = font('400 12px')
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.fillText('ใบเสร็จรับเงิน / Payment Receipt', CARD_WIDTH / 2, logoY + logoTargetHeight + 46)

  // Success badge
  const badgeY = HEADER_HEIGHT + 50
  ctx.fillStyle = '#dcfce7'
  ctx.beginPath()
  ctx.arc(CARD_WIDTH / 2, badgeY, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#16a34a'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(CARD_WIDTH / 2 - 10, badgeY)
  ctx.lineTo(CARD_WIDTH / 2 - 3, badgeY + 8)
  ctx.lineTo(CARD_WIDTH / 2 + 11, badgeY - 9)
  ctx.stroke()

  ctx.fillStyle = '#16a34a'
  ctx.font = font('600 14px')
  ctx.fillText('ชำระเงินสำเร็จ', CARD_WIDTH / 2, badgeY + 46)

  // Amount
  ctx.fillStyle = '#1e293b'
  ctx.font = font('bold 36px')
  ctx.fillText(`฿${fmtAmount(params.amount)}`, CARD_WIDTH / 2, badgeY + 96)

  // Divider
  const dividerY = badgeY + 122
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(40, dividerY)
  ctx.lineTo(CARD_WIDTH - 40, dividerY)
  ctx.stroke()

  // Detail rows
  const rows: [string, string][] = [
    ['เลขที่ใบแจ้งหนี้ / Invoice No.', params.invoiceNo],
    ['วันที่ชำระเงิน / Paid At', params.paidAtLabel],
    ['ช่องทางชำระเงิน / Method', PAYMENT_METHOD_LABEL],
    ['รหัสอ้างอิง / Payment ID', params.paymentIntentId],
  ]

  let rowY = dividerY + 34
  const rowGap = 40
  const labelX = 40
  const valueX = CARD_WIDTH - 40

  ctx.textAlign = 'left'
  for (const [label, value] of rows) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = font('400 11px')
    ctx.fillText(label, labelX, rowY)

    ctx.fillStyle = '#1e293b'
    ctx.font = font('600 13px')
    ctx.textAlign = 'right'
    ctx.fillText(value, valueX, rowY + 18, CARD_WIDTH - 80)
    ctx.textAlign = 'left'

    rowY += rowGap
  }

  // Footer
  ctx.textAlign = 'center'
  ctx.fillStyle = '#94a3b8'
  ctx.font = font('400 11px')
  ctx.fillText('เอกสารนี้สร้างโดยระบบโดยอัตโนมัติ', CARD_WIDTH / 2, CARD_HEIGHT - 24)

  ctx.restore()

  return canvas.encode('png')
}
