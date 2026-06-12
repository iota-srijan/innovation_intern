import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Shield, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUserType } from '../context/UserTypeContext'

export default function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setUserType } = useUserType()
  const params = new URLSearchParams(location.search)
  const errorParam = params.get('error')

  const { signInWithGoogle, signInAsAdmin, authError, clearAuthError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showBlockedError, setShowBlockedError] = useState(false)

  useEffect(() => {
    if (errorParam === 'blocked') {
      setShowBlockedError(true)
      navigate('/signin', { replace: true })
    }
  }, [errorParam, navigate])

  const handleGoogleSignIn = async () => {
    clearAuthError()
    await signInWithGoogle()
    // Page will redirect to Google — no navigate() needed here
  }

  const handleAdminSignIn = async () => {
    clearAuthError()
    setError('')
    setIsLoading(true)
    const success = await signInAsAdmin(email, password)
    setIsLoading(false)
    if (success) {
      setUserType('admin' as any)
      window.location.href = '/admin'
    } else {
      setError('Invalid admin credentials')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-[14px] py-7 sm:px-6 sm:py-11"
      style={{
        backgroundColor: '#1a1a2e',
        backgroundImage:
          'radial-gradient(ellipse 90% 50% at 50% -5%, rgba(249,115,22,0.055) 0%, transparent 65%), radial-gradient(ellipse 70% 50% at 10% 90%, rgba(60,40,120,0.15) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 90% 80%, rgba(20,20,80,0.12) 0%, transparent 70%)',
        color: '#eeeef5',
      }}
    >
      <div
        className="w-full max-w-[420px] rounded-[18px] sm:rounded-[22px] p-[22px] pt-[26px] sm:p-9 sm:pb-7"
        style={{
          backgroundColor: '#22223a',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 80px rgba(249,115,22,0.04), 0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Logo bar */}
        <div
          className="flex items-center justify-center pb-5 mb-[18px]"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-center px-3 pl-0">
            <img
              src="/opju-logo.png"
              alt="OPJU"
              className="h-[26px] w-auto block"
              style={{ filter: 'saturate(0.55) opacity(0.76) brightness(1.1)' }}
            />
          </div>
          <span className="w-px h-[22px] flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div className="flex items-center justify-center px-3">
            <img
              src="/aicte.png"
              alt="AICTE"
              className="h-[26px] w-auto block"
              style={{ filter: 'saturate(0.55) opacity(0.76) brightness(1.1)' }}
            />
          </div>
          <span className="w-px h-[22px] flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div className="flex items-center justify-center px-3">
            <img
              src="/idealab.png"
              alt="IdeaLab"
              className="h-[26px] w-auto block"
              style={{ filter: 'saturate(0.55) opacity(0.76) brightness(1.1)' }}
            />
          </div>
          <span className="w-px h-[22px] flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div className="flex items-center justify-center px-3 pr-0">
            <img
              src="/jindal-steel.png"
              alt="Jindal Steel"
              className="h-5 w-auto block"
              style={{ filter: 'saturate(0.4) opacity(0.7) brightness(2.9)' }}
            />
          </div>
        </div>

        {/* Institution */}
        <div className="text-center mb-[26px]">
          <p
            className="text-[10.5px] font-semibold uppercase tracking-[0.11em] mb-1"
            style={{ color: 'rgba(255,255,255,0.38)' }}
          >
            OPJU &middot; AICTE &middot; IdeaLab
          </p>
          <p className="text-[12.5px] font-normal" style={{ color: 'rgba(238,238,245,0.48)' }}>
            Inventory Management System
          </p>
        </div>

        {/* Headings */}
        <h1
          className="text-[21px] font-bold text-center mb-2 tracking-[-0.025em]"
          style={{ color: '#eeeef5' }}
        >
          Sign in to IdeaLab
        </h1>
        <p
          className="text-[13.5px] text-center mb-[26px] leading-[1.55]"
          style={{ color: 'rgba(238,238,245,0.48)' }}
        >
          OPJU students and faculty only. Use your college Google account.
        </p>

        {/* Blocked error from redirect */}
        {showBlockedError && (
          <p className="text-xs text-red-400 text-center mb-4">
            Access restricted to OPJU college emails only.
          </p>
        )}

        {/* Suspended/banned error from auth context */}
        {authError && (
          <p className="text-xs text-red-400 text-center mb-4">
            {authError}
          </p>
        )}

        {/* Google Button */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-[10px] h-12 bg-[#ffffff] hover:bg-[#f5f5f5] text-[#1c1c1c] font-semibold text-[14.5px] rounded-[11px] transition-colors cursor-pointer mb-[10px]"
        >
          {/* Google colored SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Domain hint */}
        <p className="text-[11.5px] text-center mb-3" style={{ color: 'rgba(238,238,245,0.2)' }}>
          Only <span className="font-medium" style={{ color: 'rgba(249,115,22,0.65)' }}>@opju.ac.in</span> emails are permitted
        </p>

        {/* Microsoft Button — disabled (coming soon) */}
        <button
          disabled
          className="w-full flex items-center justify-center gap-[10px] h-11 rounded-[11px] text-[13.5px] font-medium cursor-not-allowed mb-[22px]"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          {/* Microsoft colored 4-square SVG */}
          <svg width="16" height="16" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="rgba(255,255,255,0.22)"/>
            <rect x="11" y="1" width="9" height="9" fill="rgba(255,255,255,0.18)"/>
            <rect x="1" y="11" width="9" height="9" fill="rgba(255,255,255,0.18)"/>
            <rect x="11" y="11" width="9" height="9" fill="rgba(255,255,255,0.14)"/>
          </svg>
          Continue with Microsoft (coming soon)
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-[18px]">
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <span className="text-[11.5px] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.28)' }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Admin Login Section */}
        <div
          className="rounded-[13px] p-[18px] mb-5"
          style={{ backgroundColor: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div
            className="flex items-center gap-[7px] text-[11px] font-semibold uppercase tracking-[0.06em] mb-[14px]"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            <Shield className="w-3 h-3" />
            Admin access
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }}
            placeholder="Admin email"
            autoComplete="off"
            className="block w-full h-11 rounded-[9px] px-[14px] text-sm text-[#eeeef5] placeholder:text-[rgba(255,255,255,0.28)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(249,115,22,0.45)] outline-none transition-colors mb-[10px]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            placeholder="Password"
            autoComplete="new-password"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdminSignIn() }}
            className="block w-full h-11 rounded-[9px] px-[14px] text-sm text-[#eeeef5] placeholder:text-[rgba(255,255,255,0.28)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(249,115,22,0.45)] outline-none transition-colors mb-[14px]"
          />

          <button
            onClick={handleAdminSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 h-[46px] bg-[#f97316] hover:bg-[#fb923c] disabled:opacity-60 disabled:cursor-not-allowed text-[#ffffff] text-[14.5px] font-bold tracking-[-0.01em] rounded-[10px] transition-colors cursor-pointer"
          >
            {isLoading ? 'Signing in…' : (
              <>
                Sign In
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {error && (
            <p className="text-xs text-red-400 mt-2 text-center">{error}</p>
          )}
        </div>

        {/* Footer */}
        <p className="text-[11.5px] text-center leading-[1.6]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          By signing in you agree to our{' '}
          <span className="underline" style={{ color: 'rgba(255,255,255,0.4)' }}>Terms</span> and{' '}
          <span className="underline" style={{ color: 'rgba(255,255,255,0.4)' }}>Privacy Policy</span>
        </p>
      </div>
    </div>
  )
}
