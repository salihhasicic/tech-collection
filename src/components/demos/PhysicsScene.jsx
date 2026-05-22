import { useRef, useEffect, useCallback } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import { Grid, Environment } from '@react-three/drei'
import * as THREE from 'three'

/* ── Draggable Physics Ball ─────────────────── */
function PhysicsBall() {
  const bodyRef  = useRef(null)
  const meshRef  = useRef(null)
  const { camera, gl } = useThree()

  const isDragging  = useRef(false)
  const dragPlane   = useRef(new THREE.Plane())
  const dragTarget  = useRef(new THREE.Vector3())
  const raycaster   = useRef(new THREE.Raycaster())
  const ndc         = useRef(new THREE.Vector2())
  const posHistory  = useRef([])

  // Spring-drag: every frame, when dragging, pull body toward target
  useFrame(() => {
    if (!isDragging.current || !bodyRef.current) return

    const pos = bodyRef.current.translation()
    const tgt = dragTarget.current
    const vel = bodyRef.current.linvel()

    const kp = 180, kd = 22
    bodyRef.current.setLinvel({
      x: (tgt.x - pos.x) * kp - vel.x * kd,
      y: (tgt.y - pos.y) * kp - vel.y * kd,
      z: (tgt.z - pos.z) * kp - vel.z * kd,
    }, true)
    bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
  })

  const onPointerDown = useCallback((e) => {
    e.stopPropagation()
    if (!bodyRef.current) return

    isDragging.current = true
    posHistory.current = []
    gl.domElement.style.cursor = 'grabbing'

    // Plane at ball's current depth, facing the camera
    const p = bodyRef.current.translation()
    const camDir = camera.getWorldDirection(new THREE.Vector3())
    dragPlane.current.setFromNormalAndCoplanarPoint(
      camDir,
      new THREE.Vector3(p.x, p.y, p.z)
    )

    // Disable gravity while held
    bodyRef.current.setGravityScale(0, true)
  }, [camera, gl])

  useEffect(() => {
    const canvas = gl.domElement

    const onMove = (e) => {
      if (!isDragging.current || !bodyRef.current) return
      const rect = canvas.getBoundingClientRect()
      ndc.current.set(
        ((e.clientX - rect.left) / rect.width)  * 2 - 1,
        -((e.clientY - rect.top)  / rect.height) * 2 + 1
      )
      raycaster.current.setFromCamera(ndc.current, camera)
      raycaster.current.ray.intersectPlane(dragPlane.current, dragTarget.current)

      posHistory.current.push({
        p: dragTarget.current.clone(),
        t: performance.now(),
      })
      if (posHistory.current.length > 8) posHistory.current.shift()
    }

    const onUp = () => {
      if (!isDragging.current || !bodyRef.current) return
      isDragging.current = false
      canvas.style.cursor = 'default'

      // Restore gravity
      bodyRef.current.setGravityScale(1, true)

      // Compute throw velocity from recent history
      const h = posHistory.current
      if (h.length >= 2) {
        const recent = h[h.length - 1]
        const older  = h[Math.max(0, h.length - 4)]
        const dt = (recent.t - older.t) / 1000
        if (dt > 0.001) {
          const CLAMP = 22
          const clamp = (v) => Math.max(-CLAMP, Math.min(CLAMP, v))
          bodyRef.current.setLinvel({
            x: clamp((recent.p.x - older.p.x) / dt),
            y: clamp((recent.p.y - older.p.y) / dt),
            z: clamp((recent.p.z - older.p.z) / dt),
          }, true)
        }
      }
    }

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup',   onUp)
    canvas.addEventListener('pointercancel', onUp)
    return () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup',   onUp)
      canvas.removeEventListener('pointercancel', onUp)
    }
  }, [camera, gl])

  return (
    <RigidBody
      ref={bodyRef}
      position={[0, 1.5, 0]}
      restitution={0.75}
      friction={0.3}
      linearDamping={0.05}
      angularDamping={0.2}
      colliders="ball"
    >
      <mesh
        ref={meshRef}
        onPointerDown={onPointerDown}
        onPointerOver={() => { if (!isDragging.current) gl.domElement.style.cursor = 'grab' }}
        onPointerOut={() => { if (!isDragging.current) gl.domElement.style.cursor = 'default' }}
        castShadow
      >
        <icosahedronGeometry args={[0.75, 1]} />
        <meshStandardMaterial
          color="#a3e635"
          emissive="#4d7a00"
          emissiveIntensity={0.55}
          metalness={0.15}
          roughness={0.25}
        />
      </mesh>
    </RigidBody>
  )
}

/* ── Bounding Box Walls ─────────────────────── */
function BoundingBox() {
  const W = 5.5, H = 4, D = 4, T = 0.3
  return (
    <>
      {/* Floor — visible */}
      <RigidBody type="fixed" position={[0, -H, 0]}>
        <CuboidCollider args={[W, T, D]} />
      </RigidBody>
      {/* Ceiling */}
      <RigidBody type="fixed" position={[0, H, 0]}>
        <CuboidCollider args={[W, T, D]} />
      </RigidBody>
      {/* Left */}
      <RigidBody type="fixed" position={[-W, 0, 0]}>
        <CuboidCollider args={[T, H, D]} />
      </RigidBody>
      {/* Right */}
      <RigidBody type="fixed" position={[W, 0, 0]}>
        <CuboidCollider args={[T, H, D]} />
      </RigidBody>
      {/* Back */}
      <RigidBody type="fixed" position={[0, 0, -D]}>
        <CuboidCollider args={[W, H, T]} />
      </RigidBody>
      {/* Front (behind camera) */}
      <RigidBody type="fixed" position={[0, 0, D]}>
        <CuboidCollider args={[W, H, T]} />
      </RigidBody>
    </>
  )
}

/* ── Wireframe cage outline (visual only) ───── */
function CageOutline() {
  return (
    <mesh>
      <boxGeometry args={[11, 8, 8]} />
      <meshBasicMaterial color="#1a2814" wireframe />
    </mesh>
  )
}

/* ── Scene ──────────────────────────────────── */
function Scene() {
  return (
    <>
      <color attach="background" args={['#080c0a']} />
      <fog attach="fog" args={['#080c0a', 18, 35]} />

      <ambientLight intensity={0.25} />
      <directionalLight position={[6, 10, 6]} intensity={0.9} castShadow />
      <pointLight position={[0, 3, 2]} color="#a3e635" intensity={6} distance={12} decay={2} />

      <Physics gravity={[0, -9.81, 0]} timeStep="vary">
        <BoundingBox />
        <PhysicsBall />
      </Physics>

      <CageOutline />

      <Grid
        position={[0, -4, 0]}
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a2814"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2a3d1a"
        fadeDistance={18}
        fadeStrength={1}
        infiniteGrid
      />
    </>
  )
}

/* ── Root export ────────────────────────────── */
export default function PhysicsScene() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        shadows
        camera={{ position: [0, 0, 11], fov: 50, near: 0.1, far: 100 }}
        style={{ background: '#080c0a' }}
      >
        <Scene />
      </Canvas>
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em',
        color: 'var(--text-muted)', pointerEvents: 'none',
        background: 'rgba(8,12,10,0.7)', padding: '6px 16px',
        border: '1px solid var(--border-dim)', borderRadius: '999px',
        backdropFilter: 'blur(6px)',
      }}>
        CLICK + DRAG to grab · RELEASE to throw
      </div>
    </div>
  )
}
