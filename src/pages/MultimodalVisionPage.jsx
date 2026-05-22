import Layout from '../components/shared/Layout'
import HandTracking from '../components/demos/HandTracking'
import './DemoPage.css'

export default function MultimodalVisionPage() {
  return (
    <Layout>
      <div className="demo-page">
        <div className="demo-page__header">
          <div className="demo-page__meta">
            <span className="demo-page__num">MODULE 03</span>
            <h1 className="demo-page__title">Multimodal Vision</h1>
          </div>
          <p className="demo-page__desc">
            Your hand controls the UI — index fingertip drives a cursor,
            pinch gesture triggers an interaction state.
          </p>
          <div className="demo-page__log">
            <span className="demo-page__log-label">TECH LOG</span>
            MediaPipe Tasks Vision — in-browser ML, 21-point hand tracking.
            Enables gestural AI prompting and touchless kiosk UX.
          </div>
        </div>
        <div className="demo-page__canvas">
          <HandTracking />
        </div>
      </div>
    </Layout>
  )
}
