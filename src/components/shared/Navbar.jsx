import { NavLink } from 'react-router-dom'
import './Navbar.css'

const NAV_LINKS = [
  { to: '/',                    label: 'HOME',       end: true },
  { to: '/generative-visuals',  label: 'GENERATIVE', end: false },
  { to: '/spatial-physics',     label: 'SPATIAL',    end: false },
  { to: '/multimodal-vision',   label: 'VISION',     end: false },
]

export default function Navbar() {
  return (
    <header className="navbar">
      <NavLink to="/" className="navbar__brand">
        <span className="navbar__author">SALIH</span>
        <span className="navbar__sep">/</span>
        <span className="navbar__title">TECH LAB</span>
      </NavLink>

      <nav className="navbar__nav">
        {NAV_LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `navbar__link${isActive ? ' navbar__link--active' : ''}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
