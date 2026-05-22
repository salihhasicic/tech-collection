import { useRef, useState, useEffect, useCallback } from 'react'
import './HandTracking.css'

const WASM_URL  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task'

// 21-landmark skeleton connections
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
]

// Status: idle | requesting | loading | active | denied | error
export default function HandTracking() {
  const videoRef      = useRef(null)
  const canvasRef     = useRef(null)
  const landmarkerRef = useRef(null)
  const animRef       = useRef(null)
  const streamRef     = useRef(null)
  const isPinchRef    = useRef(false)

  const [status, setStatus]       = useState('idle')
  const [isPinching, setIsPinching] = useState(false)
  const [tipPos, setTipPos]       = useState(null)

  /* ── Detection loop ──────────────────────── */
  const startDetection = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !landmarkerRef.current) return

    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')

    const detect = () => {
      if (video.readyState >= 2) {
        const result = landmarkerRef.current.detectForVideo(video, performance.now())
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (result.landmarks.length > 0) {
          const hand = result.landmarks[0]
          const W = canvas.width, H = canvas.height

          // Skeleton lines
          ctx.strokeStyle = 'rgba(163,230,53,0.55)'
          ctx.lineWidth = 2
          CONNECTIONS.forEach(([a, b]) => {
            ctx.beginPath()
            ctx.moveTo(hand[a].x * W, hand[a].y * H)
            ctx.lineTo(hand[b].x * W, hand[b].y * H)
            ctx.stroke()
          })

          // Landmark dots
          hand.forEach((lm, i) => {
            const key = [4, 8].includes(i)
            ctx.beginPath()
            ctx.arc(lm.x * W, lm.y * H, key ? 7 : 3.5, 0, Math.PI * 2)
            ctx.fillStyle = key ? '#a3e635' : 'rgba(163,230,53,0.45)'
            ctx.fill()
            if (key) {
              ctx.strokeStyle = 'rgba(163,230,53,0.8)'
              ctx.lineWidth = 1.5
              ctx.stroke()
            }
          })

          // Index fingertip = landmark 8 (CSS-mirrored, so flip x for the div)
          const tip = hand[8]
          setTipPos({ x: 1 - tip.x, y: tip.y })

          // Pinch: thumb (4) ↔ index (8)
          const thumb = hand[4]
          const dx    = thumb.x - tip.x
          const dy    = thumb.y - tip.y
          const dist  = Math.sqrt(dx * dx + dy * dy)
          const pinching = dist < 0.055

          if (pinching !== isPinchRef.current) {
            isPinchRef.current = pinching
            setIsPinching(pinching)
          }
        } else {
          setTipPos(null)
          if (isPinchRef.current) {
            isPinchRef.current = false
            setIsPinching(false)
          }
        }
      }
      animRef.current = requestAnimationFrame(detect)
    }
    detect()
  }, [])

  /* ── MediaPipe init ──────────────────────── */
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
        startDetection()
      }
    } catch (err) {
      console.error('MediaPipe error:', err)
      setStatus('error')
    }
  }, [startDetection])

  /* ── Camera request ──────────────────────── */
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

  /* ── Cleanup on unmount ──────────────────── */
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
                Point your index finger at the camera. Pinch thumb + index to
                trigger an interaction. Your video stays local — nothing is sent
                to a server.
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
              <span className="ht__sub">Downloading ~9 MB from Google CDN (cached after first load)</span>
            </div>
          )}

          {status === 'denied' && (
            <div className="ht__prompt">
              <div className="ht__icon ht__icon--error">✕</div>
              <h2>Camera Access Denied</h2>
              <p>
                Allow camera permissions in your browser settings, then refresh
                the page.
              </p>
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

      <video
        ref={videoRef}
        className="ht__video"
        playsInline
        muted
        style={{ display: status === 'active' ? 'block' : 'none' }}
      />

      <canvas
        ref={canvasRef}
        className="ht__canvas"
        style={{ display: status === 'active' ? 'block' : 'none' }}
      />

      {status === 'active' && tipPos && (
        <div
          className={`ht__cursor${isPinching ? ' ht__cursor--pinch' : ''}`}
          style={{ left: `${tipPos.x * 100}%`, top: `${tipPos.y * 100}%` }}
        />
      )}

      {status === 'active' && (
        <div className="ht__hud">
          <span className={`ht__pinch${isPinching ? ' ht__pinch--active' : ''}`}>
            {isPinching ? '● PINCH DETECTED' : '○ WAITING FOR PINCH'}
          </span>
        </div>
      )}
    </div>
  )
}
