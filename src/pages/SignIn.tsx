import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layers, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUserType } from '../context/UserTypeContext'

export default function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setUserType } = useUserType()
  const params = new URLSearchParams(location.search)
  const intendedPlan = params.get('plan') // null if absent — no default

  const { signInWithGoogle, signInWithMicrosoft, signInAsAdmin } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleGoogleSignIn = () => {
    signInWithGoogle()
    if (intendedPlan === 'free') {
      setUserType('free')
      navigate('/dashboard')
    } else if (intendedPlan === 'pro') {
      setUserType('pro')
      navigate('/pro-dashboard')
    } else {
      // no plan param — Google defaults to free
      setUserType('free')
      navigate('/dashboard')
    }
  }

  const handleMicrosoftSignIn = () => {
    signInWithMicrosoft()
    if (intendedPlan === 'pro') {
      setUserType('pro')
      navigate('/pro-dashboard')
    } else {
      // free or no plan param — Microsoft defaults to free
      setUserType('free')
      navigate('/dashboard')
    }
  }

  const handleAdminSignIn = () => {
    if (email === 'admin@stockpilot.inc' && password === 'admin123') {
      signInAsAdmin()
      navigate('/admin')
    } else {
      setError('Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 w-full max-w-sm shadow-2xl shadow-black/40">

        {/* Logo */}
        <div className="w-10 h-10 bg-violet-700 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-700/30">
          <Layers className="w-5 h-5 text-white" />
        </div>

        {/* Headings */}
        <h1 className="text-xl font-semibold text-white text-center mb-1">
          Sign in to StockPilot
        </h1>
        <p className="text-sm text-zinc-400 text-center mb-8">
          Access your inventory dashboard
        </p>

        {/* Google Button */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 py-2.5 bg-white hover:bg-zinc-100 text-zinc-900 font-medium text-sm rounded-xl transition-colors cursor-pointer mb-3"
        >
          {/* Google colored SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Microsoft Button */}
        <button
          onClick={handleMicrosoftSignIn}
          className="w-full flex items-center justify-center gap-3 py-2.5 bg-[#2f2f2f] hover:bg-[#3a3a3a] text-white font-medium text-sm rounded-xl border border-zinc-700 transition-colors cursor-pointer"
        >
          {/* Microsoft colored 4-square SVG */}
          <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
            <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
          </svg>
          Continue with Microsoft
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 border-t border-zinc-800" />
          <span className="text-xs text-zinc-600">or</span>
          <div className="flex-1 border-t border-zinc-800" />
        </div>

        {/* Admin Login Section */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-3 flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            Admin access
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }}
            placeholder="Admin email"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 mb-2 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            placeholder="Password"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdminSignIn() }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
          />

          <button
            onClick={handleAdminSignIn}
            className="w-full py-2 bg-violet-700 hover:bg-violet-600 text-white text-sm font-medium rounded-lg mt-3 transition-colors cursor-pointer"
          >
            Sign in
          </button>

          {error && (
            <p className="text-xs text-red-400 mt-2 text-center">{error}</p>
          )}

          <p className="text-[10px] text-zinc-600 text-center mt-2">
            Demo: admin@stockpilot.inc / admin123
          </p>
        </div>

        {/* Footer */}
        <p className="text-xs text-zinc-600 text-center mt-6">
          By signing in you agree to our Terms and Privacy Policy
        </p>
      </div>
    </div>
  )
}
