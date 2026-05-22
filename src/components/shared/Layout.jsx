import Navbar from './Navbar'
import './Layout.css'

export default function Layout({ children }) {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout__main page-enter">
        {children}
      </main>
    </div>
  )
}
