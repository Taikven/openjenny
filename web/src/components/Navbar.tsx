import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Package, Upload, LogIn, LogOut, User, BarChart2, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../lib/store'

export default function Navbar() {
  const { user, logout, isLoggedIn } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navLinks = [
    { to: '/', label: 'Skills', icon: <Package size={16} /> },
    { to: '/stats', label: '统计', icon: <BarChart2 size={16} /> },
  ]

  const active = (path: string) =>
    location.pathname === path
      ? 'text-sky-400 bg-sky-400/10'
      : 'text-gray-400 hover:text-white hover:bg-white/5'

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-gray-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-white text-lg">
          <span className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white font-black text-sm">OJ</span>
          <span>OpenJenny</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${active(l.to)}`}>
              {l.icon}{l.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-2">
          {isLoggedIn() ? (
            <>
              <Link to="/upload"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-sky-500 hover:bg-sky-400 text-white transition-colors font-medium">
                <Upload size={16} /> 上传 Skill
              </Link>
              <Link to={`/profile/${user?.username}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                <User size={16} /> {user?.username}
              </Link>
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link to="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-sky-500 hover:bg-sky-400 text-white transition-colors font-medium">
              <LogIn size={16} /> 登录
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden text-gray-400" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-gray-900 border-t border-white/5 px-4 py-3 space-y-1">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${active(l.to)}`}>
              {l.icon}{l.label}
            </Link>
          ))}
          {isLoggedIn() ? (
            <>
              <Link to="/upload" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sky-400">
                <Upload size={16} /> 上传 Skill
              </Link>
              <Link to={`/profile/${user?.username}`} onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400">
                <User size={16} /> {user?.username}
              </Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false) }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 w-full">
                <LogOut size={16} /> 退出
              </button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sky-400">
              <LogIn size={16} /> 登录
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
