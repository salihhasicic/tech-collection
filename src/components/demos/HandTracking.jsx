import { useRef, useState, useEffect, useCallback } from 'react'
import './HandTracking.css'

const WASM_URL  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task'

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
]

const TRAIL_LEN  = 22
const GRAB_DIST  = 0.13   // normalized — ~13% of screen width
const ORB_COUNT  = 5

function makeOrbs() {
  return [
    { x: 0.18, y: 0.20, vx:  0.0008, vy: 0 },
    { x: 0.35, y: 0.14, vx: -0.0006, vy: 0.0004 },
    { x: 0.55, y: 0.22, vx:  0.0004, vy: -0.0006 },
    { x: 0.72, y: 0.18, vx: -0.0008, vy: 0 },
    { x: 0.50, y: 0.55, vx:  0,      vy: -0.0005 },
  ].map(o => ({ ...o, grabbed: false, trail: [] }))
}

export default function HandTracking() {
  const videoRef      = useRef(null)
  const lCanvasRef    = useRef(null)   // hand skeleton (640×480, CSS-mirrored)
  const orbCanvasRef  = useRef(null)   // glowing orbs (display res, not mirrored)
  const landmarkerRef = useRef(null)
  const animRef       = useRef(null)
  const streamRef     = useRef(null)
  const isPinchRef    = useRef(false)

  const [status, setStatus]       = useState('idle')
  const [isPinching, setIsPinching] = useState(false)
  const [tipPos, setTipPos]       = useState(null)

  /* ─────────────────────────────────────────────
     Main session loop: hand detection + orb sim
  ───────────────────────────────────────────── */
  const startSession = useCallback(() => {
    cancelAnimationFrame(animRef.current)

    const video   = videoRef.current
    const lCanvas = lCanvasRef.current
    const oCanvas = orbCanvasRef.current
    if (!video || !lCanvas || !oCanvas || !landmarkerRef.current) return

    lCanvas.width  = video.videoWidth  || 640
    lCanvas.height = video.videoHeight || 480
    const lCtx = lCanvas.getContext('2d')
    const oCtx = oCanvas.getContext('2d')

    // Match orb canvas to its CSS display size (and update on resize)
    const resizeOrb = () => {
      oCanvas.width  = oCanvas.offsetWidth  || 640
      oCanvas.height = oCanvas.offsetHeight || 480
    }
    resizeOrb()
    const ro = new ResizeObserver(resizeOrb)
    ro.observe(oCanvas)

    // Mutable orb state (refs, not React state — no re-render per frame)
    const orbs = makeOrbs()
    let grabbedIdx   = -1
    let prevPinching = false
    let pulseRings   = []
    const pinchHist  = []

    const tick = () => {
      const OW = oCanvas.width
      const OH = oCanvas.height
      const orbR = Math.min(OW, OH) * 0.038   // radius in pixels

      /* ── Hand detection ── */
      let handMid  = null
      let pinching = false

      if (video.readyState >= 2) {
        const result = landmarkerRef.current.detectForVideo(video, performance.now())
        lCtx.clearRect(0, 0, lCanvas.width, lCanvas.height)

        if (result.landmarks.length > 0) {
          const hand = result.landmarks[0]
          const lW = lCanvas.width, lH = lCanvas.height

          // Skeleton lines
          lCtx.strokeStyle = 'rgba(163,230,53,0.5)'
          lCtx.lineWidth = 2
          CONNECTIONS.forEach(([a, b]) => {
            lCtx.beginPath()
            lCtx.moveTo(hand[a].x * lW, hand[a].y * lH)
            lCtx.lineTo(hand[b].x * lW, hand[b].y * lH)
            lCtx.stroke()
          })

          // Landmark dots
          hand.forEach((lm, i) => {
            const key = [4, 8].includes(i)
            lCtx.beginPath()
            lCtx.arc(lm.x * lW, lm.y * lH, key ? 7 : 3.5, 0, Math.PI * 2)
            lCtx.fillStyle = key ? '#a3e635' : 'rgba(163,230,53,0.4)'
            lCtx.fill()
          })

          const tip   = hand[8]   // index fingertip
          const thumb = hand[4]   // thumb tip

          // All display positions are mirrored (1-x) to match CSS scaleX(-1) on video
          setTipPos({ x: 1 - tip.x, y: tip.y })

          handMid = {
            x: 1 - (tip.x + thumb.x) / 2,
            y: (tip.y + thumb.y) / 2,
          }

          const dx = thumb.x - tip.x
          const dy = thumb.y - tip.y
          pinching = Math.sqrt(dx * dx + dy * dy) < 0.055

          if (pinching !== isPinchRef.current) {
            isPinchRef.current = pinching
            setIsPinching(pinching)
          }

          if (pinching && handMid) {
            pinchHist.push({ ...handMid, t: performance.now() })
            if (pinchHist.length > 10) pinchHist.shift()
          }
        } else {
          setTipPos(null)
          if (isPinchRef.current) {
            isPinchRef.current = false
            setIsPinching(false)
          }
        }
      }

      /* ── Grab / release ── */
      if (pinching && !prevPinching && handMid) {
        // Pinch just started — find closest orb
        let bestIdx = -1, bestDist = GRAB_DIST
        orbs.forEach((o, i) => {
          const d = Math.sqrt((o.x - handMid.x) ** 2 + (o.y - handMid.y) ** 2)
          if (d < bestDist) { bestDist = d; bestIdx = i }
        })
        if (bestIdx >= 0) {
          grabbedIdx = bestIdx
          orbs[bestIdx].grabbed = true
          orbs[bestIdx].vx = 0
          orbs[bestIdx].vy = 0
          pinchHist.length = 0
          pulseRings.push({ x: handMid.x, y: handMid.y, r: 0, alpha: 1.0 })
        }
      } else if (!pinching && prevPinching && grabbedIdx >= 0) {
        // Pinch just released — throw the orb
        const o = orbs[grabbedIdx]
        o.grabbed = false
        if (pinchHist.length >= 2) {
          const newest = pinchHist[pinchHist.length - 1]
          const older  = pinchHist[Math.max(0, pinchHist.length - 5)]
          const dt = (newest.t - older.t) / 1000
          if (dt > 0.01) {
            const SCALE = 1 / 60    // convert per-second to per-frame
            const MAX_V = 0.038
            const clamp = (v) => Math.max(-MAX_V, Math.min(MAX_V, v))
            o.vx = clamp((newest.x - older.x) / dt * SCALE)
            o.vy = clamp((newest.y - older.y) / dt * SCALE)
          }
        }
        pulseRings.push({ x: o.x, y: o.y, r: 0, alpha: 0.85 })
        grabbedIdx = -1
        pinchHist.length = 0
      }
      prevPinching = pinching

      /* ── Orb physics ── */
      const margin = orbR / Math.min(OW, OH)
      orbs.forEach((o) => {
        if (o.grabbed && handMid) {
          o.x = handMid.x
          o.y = handMid.y
        } else {
          o.vy += 0.00011       // gravity (per frame)
          o.vx *= 0.982
          o.vy *= 0.982
          o.x += o.vx
          o.y += o.vy

          // Bounce off edges
          if (o.x < margin)       { o.x = margin;       o.vx *= -0.62 }
          if (o.x > 1 - margin)   { o.x = 1 - margin;   o.vx *= -0.62 }
          if (o.y < margin)       { o.y = margin;        o.vy *= -0.62 }
          if (o.y > 1 - margin)   { o.y = 1 - margin;   o.vy *= -0.62 }
        }
        o.trail.push({ x: o.x, y: o.y })
        if (o.trail.length > TRAIL_LEN) o.trail.shift()
      })

      /* ── Orb rendering ── */
      oCtx.clearRect(0, 0, OW, OH)

      orbs.forEach((o) => {
        const cx = o.x * OW
        const cy = o.y * OH

        // Trail (fading dots)
        o.trail.forEach((pt, i) => {
          const t  = i / o.trail.length
          const tr = Math.max(1, orbR * t * (o.grabbed ? 0.65 : 0.45))
          oCtx.beginPath()
          oCtx.arc(pt.x * OW, pt.y * OH, tr, 0, Math.PI * 2)
          oCtx.fillStyle = `rgba(163,230,53,${t * (o.grabbed ? 0.38 : 0.22)})`
          oCtx.fill()
        })

        // Outer halo via radial gradient
        const haloR = orbR * (o.grabbed ? 2.4 : 1.8)
        const grad  = oCtx.createRadialGradient(cx, cy, 0, cx, cy, haloR)
        grad.addColorStop(0, `rgba(163,230,53,${o.grabbed ? 0.38 : 0.22})`)
        grad.addColorStop(1, 'rgba(163,230,53,0)')
        oCtx.shadowColor = '#a3e635'
        oCtx.shadowBlur  = o.grabbed ? 28 : 14
        oCtx.beginPath()
        oCtx.arc(cx, cy, haloR, 0, Math.PI * 2)
        oCtx.fillStyle = grad
        oCtx.fill()

        // Main sphere
        oCtx.beginPath()
        oCtx.arc(cx, cy, orbR, 0, Math.PI * 2)
        oCtx.fillStyle = o.grabbed
          ? 'rgba(163,230,53,0.95)'
          : 'rgba(163,230,53,0.72)'
        oCtx.fill()

        // Specular highlight
        oCtx.shadowBlur = 0
        oCtx.beginPath()
        oCtx.arc(cx - orbR * 0.28, cy - orbR * 0.28, orbR * 0.36, 0, Math.PI * 2)
        oCtx.fillStyle = 'rgba(218,255,175,0.75)'
        oCtx.fill()

        // Selection ring when grabbed
        if (o.grabbed) {
          oCtx.beginPath()
          oCtx.arc(cx, cy, orbR * 1.5, 0, Math.PI * 2)
          oCtx.strokeStyle = 'rgba(163,230,53,0.55)'
          oCtx.lineWidth = 1.5
          oCtx.stroke()
        }
      })

      // Pulse rings (grab/release feedback)
      oCtx.shadowBlur = 0
      pulseRings = pulseRings.filter((r) => r.alpha > 0.02)
      pulseRings.forEach((ring) => {
        const rPx = ring.r * Math.min(OW, OH)
        oCtx.beginPath()
        oCtx.arc(ring.x * OW, ring.y * OH, orbR + rPx, 0, Math.PI * 2)
        oCtx.strokeStyle = `rgba(163,230,53,${ring.alpha})`
        oCtx.lineWidth = 2
        oCtx.stroke()
        ring.r     += 0.016
        ring.alpha -= 0.027
      })

      animRef.current = requestAnimationFrame(tick)
    }

    tick()
    return () => ro.disconnect()
  }, [])

  /* ── MediaPipe init ────────────────────────── */
  const initMediaPipe = useCallback(async (stream) => {
    setStatus('loading')
    try {
      const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(WASM_URL)
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
      })
      landmarkerRef.current = landmarker

      const video = videoRef.current
      video.srcObject = stream
      video.onloadedmetadata = () => {
        video.play()
        setStatus('active')
        startSession()
      }
    } catch (err) {
      console.error('MediaPipe error:', err)
      setStatus('error')
    }
  }, [startSession])

  /* ── Camera request ────────────────────────── */
  const requestCamera = useCallback(async () => {
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })
      streamRef.current = stream
      await initMediaPipe(stream)
    } catch {
      setStatus('denied')
    }
  }, [initMediaPipe])

  /* ── Cleanup ───────────────────────────────── */
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      landmarkerRef.current?.close?.()
    }
  }, [])

  const showOverlay = status !== 'active'

  return (
    <div className="ht">
      {showOverlay && (
        <div className="ht__overlay">
          {status === 'idle' && (
            <div className="ht__prompt">
              <div className="ht__icon">⊙</div>
              <h2>Hand Tracking</h2>
              <p>
                Pinch your thumb and index finger to <strong>grab</strong> a
                glowing orb — then throw it by releasing the pinch. Move your
                hand faster for a harder throw.
              </p>
              <p style={{ fontSize: '0.72rem', marginTop: '0.5rem' }}>
                Your video is processed entirely on-device. Nothing leaves the browser.
              </p>
              <button className="ht__btn" onClick={requestCamera}>
                ENABLE CAMERA
              </button>
            </div>
          )}

          {status === 'requesting' && (
            <div className="ht__prompt">
              <div className="ht__spinner" />
              <p>Requesting camera access…</p>
            </div>
          )}

          {status === 'loading' && (
            <div className="ht__prompt">
              <div className="ht__spinner" />
              <p>Loading hand tracking model…</p>
              <span className="ht__sub">~9 MB from Google CDN — cached after first load</span>
            </div>
          )}

          {status === 'denied' && (
            <div className="ht__prompt">
              <div className="ht__icon ht__icon--error">✕</div>
              <h2>Camera Access Denied</h2>
              <p>Allow camera permissions in your browser settings, then refresh.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="ht__prompt">
              <div className="ht__icon ht__icon--error">!</div>
              <h2>Failed to Load Model</h2>
              <p>Check your internet connection and refresh to try again.</p>
            </div>
          )}
        </div>
      )}

      {/* Webcam feed — mirrored for selfie view */}
      <video
        ref={videoRef}
        className="ht__video"
        playsInline
        muted
        style={{ display: status === 'active' ? 'block' : 'none' }}
      />

      {/* Hand skeleton overlay — also CSS-mirrored to match video */}
      <canvas
        ref={lCanvasRef}
        className="ht__canvas"
        style={{ display: status === 'active' ? 'block' : 'none' }}
      />

      {/* Orb interaction layer — NOT mirrored (uses pre-flipped coords) */}
      <canvas
        ref={orbCanvasRef}
        className="ht__orbs"
        style={{ display: status === 'active' ? 'block' : 'none' }}
      />

      {/* Fingertip cursor div */}
      {status === 'active' && tipPos && (
        <div
          className={`ht__cursor${isPinching ? ' ht__cursor--pinch' : ''}`}
          style={{ left: `${tipPos.x * 100}%`, top: `${tipPos.y * 100}%` }}
        />
      )}

      {status === 'active' && (
        <div className="ht__hud">
          <span className={`ht__pinch${isPinching ? ' ht__pinch--active' : ''}`}>
            {isPinching ? '● PINCHING — release to throw' : '○ PINCH an orb to grab it'}
          </span>
        </div>
      )}
    </div>
  )
}
