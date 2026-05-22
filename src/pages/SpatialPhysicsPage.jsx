import Layout from '../components/shared/Layout'
import PhysicsScene from '../components/demos/PhysicsScene'
import './DemoPage.css'

export default function SpatialPhysicsPage() {
  return (
    <Layout>
      <div className="demo-page">
        <div className="demo-page__header">
          <div className="demo-page__meta">
            <span className="demo-page__num">MODULE 02</span>
            <h1 className="demo-page__title">Spatial & Physical Systems</h1>
          </div>
          <p className="demo-page__desc">
            Grab and throw the 3D object. Rapier physics handles gravity,
            collision, and bounce inside the bounded space.
          </p>
          <div className="demo-page__log">
            <span className="demo-page__log-label">TECH LOG</span>
            React Three Fiber + Rapier (WASM). Declarative 3D with
            real physics. Enables embodied AI interfaces and spatial UX.
          </div>
        </div>
        <div className="demo-page__canvas">
          <PhysicsScene />
        </div>
      </div>
    </Layout>
  )
}
