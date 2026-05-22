import { useRef, useEffect, useState, useCallback } from 'react'
import './ParticleField.css'

const PARTICLE_COUNT = 220
const MAX_SPEED       = 4
const FORCE_RADIUS    = 140
const FORCE_STRENGTH  = 0.28
const FRICTION        = 0.965
const CONNECTION_DIST = 80

class Particle {
  constructor(w, h) {
    this.reset(w, h)
  }

  reset(w, h) {
    this.x  = Math.random() * w
    this.y  = Math.random() * h
    this.vx = (Math.random() - 0.5) * 0.6
    this.vy = (Math.random() - 0.5) * 0.6
    this.r  = Math.random() * 1.8 + 0.5
    this.baseAlpha = Math.random() * 0.4 + 0.25
    this.alpha = this.baseAlpha
  }

  update(w, h, mx, my, mode) {
    const dx   = this.x - mx
    const dy   = this.y - my
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < FORCE_RADIUS && dist > 0.1) {
      const t  = 1 - dist / FORCE_RADIUS
      const f  = t * FORCE_STRENGTH
      const nx = dx / dist
      const ny = dy / dist
      if (mode === 'attract') {
        this.vx -= nx * f
        this.vy -= ny * f
      } else {
        this.vx += nx * f * 1.4
        this.vy += ny * f * 1.4
      }
      this.alpha = Math.min(1, this.baseAlpha + t * 0.55)
    } else {
      this.alpha += (this.baseAlpha - this.alpha) * 0.04
    }

    this.vx *= FRICTION
    this.vy *= FRICTION

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    if (speed > MAX_SPEED) {
      const inv = MAX_SPEED / speed
      this.vx  *= inv
      this.vy  *= inv
    }

    this.x += this.vx
    this.y += this.vy

    if (this.x < 0) this.x = w
    if (this.x > w) this.x = 0
    if (this.y < 0) this.y = h
    if (this.y > h) this.y = 0
  }

  draw(ctx) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(163,230,53,${this.alpha})`
    ctx.fill()
  }
}

export default function ParticleField() {
  const canvasRef   = useRef(null)
  const particlesRef = useRef([])
  const mouseRef    = useRef({ x: -9999, y: -9999 })
  const modeRef     = useRef('attract')
  const rafRef      = useRef(null)
  const [mode, setMode] = useState('attract')

  const init = useCallback((w, h) => {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => new Particle(w, h))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      init(canvas.width, canvas.height)
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 } }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)

    const draw = () => {
      const { width: w, height: h } = canvas
      const { x: mx, y: my } = mouseRef.current
      const m = modeRef.current
      const pts = particlesRef.current

      // Semi-transparent clear → motion trail
      ctx.fillStyle = 'rgba(8,12,10,0.18)'
      ctx.fillRect(0, 0, w, h)

      // Draw connections
      ctx.lineWidth = 0.5
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const d2 = dx * dx + dy * dy
          if (d2 < CONNECTION_DIST * CONNECTION_DIST) {
            const t = 1 - Math.sqrt(d2) / CONNECTION_DIST
            ctx.strokeStyle = `rgba(163,230,53,${t * 0.14})`
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.stroke()
          }
        }
      }

      pts.forEach((p) => {
        p.update(w, h, mx, my, m)
        p.draw(ctx)
      })

      // Mouse radius ring
      if (mx > 0) {
        const repel = m === 'repel'
        ctx.beginPath()
        ctx.arc(mx, my, FORCE_RADIUS, 0, Math.PI * 2)
        ctx.strokeStyle = repel
          ? 'rgba(255,107,107,0.12)'
          : 'rgba(163,230,53,0.10)'
        ctx.lineWidth = 1
        ctx.stroke()

        // Crosshair dot
        ctx.beginPath()
        ctx.arc(mx, my, 3, 0, Math.PI * 2)
        ctx.fillStyle = repel ? 'rgba(255,107,107,0.6)' : 'rgba(163,230,53,0.6)'
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [init])

  const toggle = () => {
    const next = modeRef.current === 'attract' ? 'repel' : 'attract'
    modeRef.current = next
    setMode(next)
  }

  return (
    <div className="particle-field">
      <canvas ref={canvasRef} className="particle-field__canvas" />
      <div className="particle-field__controls">
        <button className="particle-field__btn" onClick={toggle}>
          MODE:{' '}
          <span className={`particle-field__mode${mode === 'repel' ? ' particle-field__mode--repel' : ''}`}>
            {mode.toUpperCase()}
          </span>
        </button>
        <span className="particle-field__hint">move cursor over canvas</span>
      </div>
    </div>
  )
}
