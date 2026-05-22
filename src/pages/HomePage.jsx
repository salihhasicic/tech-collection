import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import NavCard from '../components/ui/NavCard'
import './HomePage.css'

const DEMOS = [
  {
    number: '01',
    title: 'Generative',
    subtitle: 'Visuals',
    description:
      'A particle field that reacts to your mouse in real time. Toggle between attract and repel modes using only the Canvas API — no library.',
    tech: ['Canvas API', 'Particle Physics', 'Mouse Interaction'],
    route: '/generative-visuals',
  },
  {
    number: '02',
    title: 'Spatial &',
    subtitle: 'Physical Systems',
    description:
      'Grab and throw a 3D object. Rapier physics handles gravity, collision, and realistic bouncing inside a bounded 3D space.',
    tech: ['React Three Fiber', 'Rapier / WASM', 'WebGL'],
    route: '/spatial-physics',
  },
  {
    number: '03',
    title: 'Multimodal',
    subtitle: 'Vision',
    description:
      'Your hand controls the UI — index fingertip drives a live cursor. Pinch thumb and index finger to trigger an interaction state.',
    tech: ['MediaPipe Hands', 'WebRTC / Webcam', '21-Point Landmarks'],
    route: '/multimodal-vision',
  },
]

export default function HomePage() {
  return (
    <Layout>
      <div className="home">
        <section className="home__hero">
          <p className="home__eyebrow">Advanced AI-UX // Salih Hasicic</p>
          <h1 className="home__title">
            Tech
            <span className="home__title-accent">Collection.</span>
          </h1>
          <p className="home__subtitle">
            A curated playground of experimental web interactions — generative
            visuals, spatial physics, and multimodal input. Built for the
            browser edge.
          </p>
          <div className="home__hero-rule" />
        </section>

        <section>
          <p className="home__section-label">// Select a module to explore</p>
          <div className="home__grid">
            {DEMOS.map((demo) => (
              <NavCard key={demo.number}>
                <Link to={demo.route} className="home__card-link">
                  <div className="home__card-num">MODULE {demo.number}</div>
                  <div className="home__card-body">
                    <h2 className="home__card-title">
                      {demo.title}
                      <br />
                      <em>{demo.subtitle}</em>
                    </h2>
                    <p className="home__card-desc">{demo.description}</p>
                    <div className="home__card-tags">
                      {demo.tech.map((t) => (
                        <span key={t} className="home__card-tag">{t}</span>
                      ))}
                    </div>
                    <div className="home__card-cta">
                      ENTER DEMO
                      <span className="home__card-arrow">→</span>
                    </div>
                  </div>
                </Link>
              </NavCard>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  )
}
