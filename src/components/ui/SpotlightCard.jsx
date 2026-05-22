import { useRef } from 'react'
import './SpotlightCard.css'

export default function SpotlightCard({ children, className = '' }) {
  const ref = useRef(null)

  const handleMouseMove = (e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    ref.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
  }

  return (
    <div ref={ref} className={`spotlight-card ${className}`} onMouseMove={handleMouseMove}>
      <div className="spotlight-card__glow" />
      <div className="spotlight-card__content">{children}</div>
    </div>
  )
}
