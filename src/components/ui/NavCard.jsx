import { useRef } from 'react'
import './NavCard.css'

export default function NavCard({ children, className = '' }) {
  const cardRef = useRef(null)

  const handleMouseMove = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    cardRef.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    cardRef.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
  }

  return (
    <div
      ref={cardRef}
      className={`nav-card ${className}`}
      onMouseMove={handleMouseMove}
    >
      <div className="nav-card__spinner" />
      <div className="nav-card__inner">
        <div className="nav-card__spotlight" />
        <div className="nav-card__content">{children}</div>
      </div>
    </div>
  )
}
