import { useRef, useEffect, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import { Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Room half-dimensions (must match CageOutline geometry args / 2)
const W = 5.5   // half-width  (room is 11 units wide)
const H = 4     // half-height (room is 8 units tall)
const D = 4     // half-depth  (room is 8 units deep)
const BALL_R = 0.75

/* ── Draggable Physics Ball ─────────────────── */
function PhysicsBall({ orbitRef }) {
  const bodyRef    = useRef(null)
  const { camera, gl } = useThree()

  const isDragging = useRef(false)
  const dragPlane  = useRef(new THREE.Plane())
  const dragTarget = useRef(new THREE.Vector3())
  const raycaster  = useRef(new THREE.Raycaster())
  const ndc        = useRef(new THREE.Vector2())
  const history    = useRef([])

  const onPointerDown = useCallback((e) => {
    e.stopPropagation()
    if (!bodyRef.current) return

    isDragging.current = true
    history.current    = []
    gl.domElement.style.cursor = 'grabbing'
    if (orbitRef.current) orbitRef.current.enabled = false

    // Drag plane: perpendicular to camera, at the ball's current depth
    const p = bodyRef.current.translation()
    const camDir = camera.getWorldDirection(new THREE.Vector3())
    dragPlane.current.setFromNormalAndCoplanarPoint(
      camDir,
      new THREE.Vector3(p.x, p.y, p.z)
    )

    // Switch to kinematic — rapier stops simulating; we move it manually
    bodyRef.current.setBodyType(2, true)   // 2 = KinematicPositionBased
    bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }, [camera, gl, orbitRef])

  useEffect(() => {
    const canvas = gl.domElement

    const onMove = (e) => {
      if (!isDragging.current || !bodyRef.current) return
      const rect = canvas.getBoundingClientRect()
      ndc.current.set(
        ((e.clientX - rect.left) / rect.width)  *  2 - 1,
        -((e.clientY - rect.top)  / rect.height) *  2 + 1
      )
      raycaster.current.setFromCamera(ndc.current, camera)
      raycaster.current.ray.intersectPlane(dragPlane.current, dragTarget.current)

      // Clamp inside room so we can't drag through walls
      dragTarget.current.x = Math.max(-(W - BALL_R), Math.min(W - BALL_R, dragTarget.current.x))
      dragTarget.current.y = Math.max(-(H - BALL_R), Math.min(H - BALL_R, dragTarget.current.y))
      dragTarget.current.z = Math.max(-(D - BALL_R), Math.min(D - BALL_R, dragTarget.current.z))

      bodyRef.current.setNextKinematicTranslation(dragTarget.current)

      history.current.push({ p: dragTarget.current.clone(), t: performance.now() })
      if (history.current.length > 8) history.current.shift()
    }

    const onUp = () => {
      if (!isDragging.current || !bodyRef.current) return
      isDragging.current = false
      canvas.style.cursor = 'default'
      if (orbitRef.current) orbitRef.current.enabled = true

      // Compute throw velocity from the last few tracked positions
      const h = history.current
      let vx = 0, vy = 0, vz = 0
      if (h.length >= 2) {
        const newest = h[h.length - 1]
        const older  = h[Math.max(0, h.length - 4)]
        const dt = (newest.t - older.t) / 1000
        if (dt > 0.005) {
          const CLAMP = 20
          const clamp = (v) => Math.max(-CLAMP, Math.min(CLAMP, v))
          vx = clamp((newest.p.x - older.p.x) / dt)
          vy = clamp((newest.p.y - older.p.y) / dt)
          vz = clamp((newest.p.z - older.p.z) / dt)
        }
      }

      // Return to dynamic physics, apply throw impulse
      bodyRef.current.setBodyType(0, true)  // 0 = Dynamic
      bodyRef.current.setLinvel({ x: vx, y: vy, z: vz }, true)
    }

    canvas.addEventListener('pointermove',   onMove)
    canvas.addEventListener('pointerup',     onUp)
    canvas.addEventListener('pointercancel', onUp)
    return () => {
      canvas.removeEventListener('pointermove',   onMove)
      canvas.removeEventListener('pointerup',     onUp)
      canvas.removeEventListener('pointercancel', onUp)
    }
  }, [camera, gl, orbitRef])

  return (
    <RigidBody
      ref={bodyRef}
      position={[0, 0, 0]}
      restitution={0.72}
      friction={0.35}
      linearDamping={0.08}
      angularDamping={0.25}
      colliders="ball"
    >
      <mesh
        onPointerDown={onPointerDown}
        onPointerOver={() => { if (!isDragging.current) gl.domElement.style.cursor = 'grab' }}
        onPointerOut={() => { if (!isDragging.current) gl.domElement.style.cursor = 'default' }}
        castShadow
      >
        <icosahedronGeometry args={[BALL_R, 1]} />
        <meshStandardMaterial
          color="#a3e635"
          emissive="#3d6600"
          emissiveIntensity={0.6}
          metalness={0.1}
          roughness={0.3}
        />
      </mesh>
    </RigidBody>
  )
}

/* ── Six-wall containment room ──────────────── */
// Each wall: position places its centre so the inner surface aligns with ±W/H/D.
// CuboidCollider args are HALF-extents.  T = half-thickness of each wall.
const T = 0.6

function BoundingBox() {
  const wallProps = { type: 'fixed', restitution: 0.72, friction: 0.4 }
  return (
    <>
      {/* Floor — inner surface at y = -H */}
      <RigidBody {...wallProps} position={[0, -H - T, 0]}>
        <CuboidCollider args={[W + T, T, D + T]} />
      </RigidBody>
      {/* Ceiling — inner surface at y = +H */}
      <RigidBody {...wallProps} position={[0, H + T, 0]}>
        <CuboidCollider args={[W + T, T, D + T]} />
      </RigidBody>
      {/* Left wall — inner surface at x = -W */}
      <RigidBody {...wallProps} position={[-(W + T), 0, 0]}>
        <CuboidCollider args={[T, H + T, D + T]} />
      </RigidBody>
      {/* Right wall — inner surface at x = +W */}
      <RigidBody {...wallProps} position={[W + T, 0, 0]}>
        <CuboidCollider args={[T, H + T, D + T]} />
      </RigidBody>
      {/* Back wall — inner surface at z = -D */}
      <RigidBody {...wallProps} position={[0, 0, -(D + T)]}>
        <CuboidCollider args={[W + T, H + T, T]} />
      </RigidBody>
      {/* Front wall — inner surface at z = +D */}
      <RigidBody {...wallProps} position={[0, 0, D + T]}>
        <CuboidCollider args={[W + T, H + T, T]} />
      </RigidBody>
    </>
  )
}

/* ── Cage wireframe (visual only) ───────────── */
function CageOutline() {
  return (
    <mesh>
      <boxGeometry args={[W * 2, H * 2, D * 2]} />
      <meshBasicMaterial color="#162112" wireframe />
    </mesh>
  )
}

/* ── Scene ──────────────────────────────────── */
function Scene() {
  const orbitRef = useRef(null)

  return (
    <>
      <color attach="background" args={['#080c0a']} />

      <ambientLight intensity={0.2} />
      <directionalLight position={[6, 8, 5]} intensity={0.8} castShadow />
      <pointLight position={[0, 2, 2]} color="#a3e635" intensity={8} distance={14} decay={2} />

      <OrbitControls
        ref={orbitRef}
        target={[0, 0, 0]}
        enablePan={false}
        minDistance={9}
        maxDistance={18}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.85}
      />

      <Physics gravity={[0, -9.81, 0]} timeStep="vary">
        <BoundingBox />
        <PhysicsBall orbitRef={orbitRef} />
      </Physics>

      <CageOutline />

      <Grid
        position={[0, -H, 0]}
        args={[W * 2, D * 2]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#152011"
        sectionSize={W * 2}
        sectionThickness={1}
        sectionColor="#2a3d1a"
        fadeDistance={20}
        fadeStrength={1}
      />
    </>
  )
}

/* ── Root export ────────────────────────────── */
export default function PhysicsScene() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [0, 1, 13], fov: 50, near: 0.1, far: 100 }}
        style={{ background: '#080c0a' }}
      >
        <Scene />
      </Canvas>

      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em',
        color: 'var(--text-muted)', pointerEvents: 'none',
        background: 'rgba(8,12,10,0.75)', padding: '6px 18px',
        border: '1px solid var(--border-dim)', borderRadius: '999px',
        backdropFilter: 'blur(6px)', whiteSpace: 'nowrap',
      }}>
        CLICK + DRAG to grab · RELEASE to throw · SCROLL to zoom
      </div>
    </div>
  )
}
