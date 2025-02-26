import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Hive from './pages/Hive'
import Requests from './pages/Requests'
import Chats from './pages/Chats'
import Profile from './pages/Profile'
import Auth from './pages/Auth'
import './index.css'

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-[#0A0A23]  text-gray-300">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/hive" element={<Hive />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/chats" element={<Chats />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/signup" element={<Auth mode="signup" />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  )
}