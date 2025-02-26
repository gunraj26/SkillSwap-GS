import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path
  }

  const linkClass = (path) => {
    return `text-gray-300 hover:text-[#f2a93b] transition-colors ${
      isActive(path) ? 'text-[#f2a93b] font-medium' : ''
    }`
  }

  return (
    <nav className="bg-[#111122] shadow-lg border-b border-[#f2a93b]/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className={`text-2xl font-bold ${linkClass('/')}`}>
              SKILLSWAP
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/hive" className={linkClass('/hive')}>
                  Hive
                </Link>
                <Link to="/requests" className={linkClass('/requests')}>
                  Requests
                </Link>
                <Link to="/chats" className={linkClass('/chats')}>
                  Chats
                </Link>
                <Link to="/profile" className={linkClass('/profile')}>
                  Profile
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-gray-300 hover:text-[#f2a93b] transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={linkClass('/login')}>
                  Login
                </Link>
                <Link to="/signup" className={linkClass('/signup')}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}