import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import GenerativeVisualsPage from './pages/GenerativeVisualsPage'
import SpatialPhysicsPage from './pages/SpatialPhysicsPage'
import MultimodalVisionPage from './pages/MultimodalVisionPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                   element={<HomePage />} />
        <Route path="/generative-visuals" element={<GenerativeVisualsPage />} />
        <Route path="/spatial-physics"    element={<SpatialPhysicsPage />} />
        <Route path="/multimodal-vision"  element={<MultimodalVisionPage />} />
      </Routes>
    </BrowserRouter>
  )
}
