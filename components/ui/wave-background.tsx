'use client'

import { useEffect, useRef } from 'react'

export default function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let t = 0

    const COLS = 28
    const ROWS = 16
    const DOT_COLOR = 'rgba(34, 211, 238,' // cyan-400

    function resize() {
      if (!canvas || !ctx) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function draw() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const cellW = canvas.width / (COLS - 1)
      const cellH = canvas.height / (ROWS - 1)

      // Draw grid lines
      ctx.lineWidth = 0.4

      // Horizontal lines
      for (let r = 0; r < ROWS; r++) {
        ctx.beginPath()
        for (let c = 0; c < COLS; c++) {
          const x = c * cellW
          const waveY = Math.sin((c / COLS) * Math.PI * 2 + t + r * 0.4) * 18 +
                        Math.sin((c / COLS) * Math.PI * 3.5 - t * 0.7) * 10
          const y = r * cellH + waveY
          const alpha = 0.08 + 0.12 * Math.abs(Math.sin((c / COLS) * Math.PI + t * 0.5 + r))
          if (c === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
          ctx.strokeStyle = `${DOT_COLOR}${alpha})`
        }
        ctx.stroke()
      }

      // Vertical lines
      for (let c = 0; c < COLS; c++) {
        ctx.beginPath()
        for (let r = 0; r < ROWS; r++) {
          const x = c * cellW
          const waveY = Math.sin((c / COLS) * Math.PI * 2 + t + r * 0.4) * 18 +
                        Math.sin((c / COLS) * Math.PI * 3.5 - t * 0.7) * 10
          const y = r * cellH + waveY
          const alpha = 0.05 + 0.08 * Math.abs(Math.sin((r / ROWS) * Math.PI + t * 0.3 + c))
          ctx.strokeStyle = `${DOT_COLOR}${alpha})`
          if (r === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
      }

      // Glowing dots at intersections
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * cellW
          const waveY = Math.sin((c / COLS) * Math.PI * 2 + t + r * 0.4) * 18 +
                        Math.sin((c / COLS) * Math.PI * 3.5 - t * 0.7) * 10
          const y = r * cellH + waveY
          const glow = 0.15 + 0.5 * Math.pow(Math.abs(Math.sin((c + r) * 0.3 + t * 0.8)), 3)
          ctx.beginPath()
          ctx.arc(x, y, 1.2, 0, Math.PI * 2)
          ctx.fillStyle = `${DOT_COLOR}${glow})`
          ctx.fill()
        }
      }

      t += 0.012
      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
