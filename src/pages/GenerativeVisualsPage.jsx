import Layout from '../components/shared/Layout'
import ParticleField from '../components/demos/ParticleField'
import './DemoPage.css'

export default function GenerativeVisualsPage() {
  return (
    <Layout>
      <div className="demo-page">
        <div className="demo-page__header">
          <div className="demo-page__meta">
            <span className="demo-page__num">MODULE 01</span>
            <h1 className="demo-page__title">Generative Visuals</h1>
          </div>
          <p className="demo-page__desc">
            A particle field reacting to your cursor in real time.
            Toggle between attract and repel modes.
          </p>
          <div className="demo-page__log">
            <span className="demo-page__log-label">TECH LOG</span>
            Canvas API — zero-dependency 2D rendering. Ideal for generative
            art, AI state visualisation, and ambient data displays.
          </div>
        </div>
        <div className="demo-page__canvas">
          <ParticleField />
        </div>
      </div>
    </Layout>
  )
}
