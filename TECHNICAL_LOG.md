# Technical Log — Tech Collection
**Author:** Salih Hasicic  
**Course:** Advanced AI-UX  
**Stack:** Vite + React 19, react-router-dom v7

---

## Module 01 — Generative Visuals & Shaders
**Route:** `/generative-visuals`

**Framework:** Native Canvas API (browser built-in — no library)

**Why this one:**  
The Canvas 2D API is the lowest-level drawing surface available in the browser. It gives direct control over every pixel every frame via `requestAnimationFrame`, with no abstraction overhead. For a particle simulation where 250 objects update 60 times per second, this matters — no virtual DOM, no scene graph, just a tight JS loop writing into a pixel buffer. It also means zero extra dependencies.

**How it works:**  
Each `Particle` instance stores position, velocity, radius, and alpha. Per frame: a semi-transparent fill (not a full clear) creates the motion-trail effect. Each particle computes a force vector toward or away from the mouse, applies it to velocity, then applies friction damping. Nearby particles are connected with faint lines (the "constellation web"). Mouse mode (attract / repel) is stored in a `useRef` so the animation loop always reads the latest value without React re-rendering.

**UX Potential (general):**  
Ambient generative backgrounds that react to user state; loading/idle state visualisations; data-density readouts disguised as art; onboarding animations that feel alive.

**UX Potential (AI systems):**  
Visualising model "attention" — particles cluster toward high-salience tokens. Confidence distributions rendered as particle density. Real-time latency pulse (attract = fast, repel = slow). Generative "thinking" indicator that's more informative than a spinner.

---

## Module 02 — Spatial & Physical Systems
**Route:** `/spatial-physics`

**Framework:** React Three Fiber (`@react-three/fiber`) + Rapier physics (`@react-three/rapier`)

**Why this one:**  
React Three Fiber lets you write 3D scenes as React component trees — `<mesh>`, `<pointLight>`, `<Physics>` — which means the full React mental model (state, refs, effects) applies to 3D. Rapier is the modern successor to Cannon.js: written in Rust, compiled to WebAssembly, significantly faster and more stable. It handles rigid body simulation, collision detection, and constraint solving. `@react-three/rapier` bridges it into R3F's declarative style.

**How it works:**  
A `<RigidBody colliders="ball">` wraps an icosahedron mesh. Six invisible `<CuboidCollider>` walls form the bounded space. The drag mechanic uses a spring controller in `useFrame`: while dragging, the body's linear velocity is set each physics tick to a PD-controller output pointing toward the 3D mouse intersection with a camera-facing drag plane. On release, velocity from the last 4 tracked positions is applied as the throw impulse. Gravity is paused (via `setGravityScale(0)`) while held so the ball tracks the hand cleanly.

**UX Potential (general):**  
3D product configurators users can physically handle; interactive data sculptures; physics-based onboarding tutorials; drag-to-connect node editors with satisfying tactile feedback.

**UX Potential (AI systems):**  
Embodied AI interfaces where agents occupy 3D space and users can physically reposition them. Spatial reasoning demonstrations. Physics-driven layout engines for AI-generated content. "Weight" metaphors for model uncertainty — heavier objects = lower confidence.

---

## Module 03 — Multimodal Vision (Hand Tracking)
**Route:** `/multimodal-vision`

**Framework:** MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) — Google's in-browser ML inference pipeline

**Why this one:**  
MediaPipe runs a quantised `float16` hand landmark model entirely in the browser via WebAssembly + WebGL GPU delegation. No server, no data leaves the device. It tracks 21 3D landmarks per hand at 30+ fps on a modern laptop. The `tasks-vision` package is the newer, unified API that supersedes the legacy `@mediapipe/hands` package — it supports hot-swappable models and a consistent cross-platform API surface.

**How it works:**  
MediaPipe initialises lazily (dynamic `import()`) only after the user grants camera access — avoiding a 9 MB download on page load. The webcam stream feeds a hidden `<video>` element; `HandLandmarker.detectForVideo()` is called each `requestAnimationFrame` tick. Results are 21 `{x, y, z}` normalised landmark coordinates. The skeleton is drawn onto a mirrored `<canvas>` overlay. Index fingertip (landmark 8) drives an absolutely-positioned cursor div; the x-axis is flipped (`1 - x`) to match the CSS-mirrored selfie view. Pinch detection compares Euclidean distance between thumb tip (4) and index tip (8) — threshold 0.055 (5.5% of frame width).

**UX Potential (general):**  
Touchless kiosk interfaces; accessibility tools for motor-impaired users; sign-language interpretation; AR try-on experiences; presentation controls without a clicker.

**UX Potential (AI systems):**  
Gestural AI prompting — pinch to "select", point to "focus". Embodied interaction with LLM agents in AR/XR. Gesture-based refinement of generative image outputs. Real-time sign-language-to-text relay as a multimodal input channel to a language model.
