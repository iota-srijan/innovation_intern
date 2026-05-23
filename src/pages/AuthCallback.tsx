import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useUserType } from '../context/UserTypeContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setUserType } = useUserType()

  useEffect(() => {
    const handleCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const queryParams = new URLSearchParams(window.location.search)

      const accessToken = hashParams.get('access_token')
      const code = queryParams.get('code')

      if (accessToken) {
        const { data, error: _e1 } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') ?? ''
        })
        if (data.session) {
          redirectUser()
          return
        }
      }

      if (code) {
        const { data, error: _e2 } = await supabase.auth.exchangeCodeForSession(code)
        if (data.session) {
          redirectUser()
          return
        }
      }

      const { data } = await supabase.auth.getSession()
      if (data.session) {
        redirectUser()
        return
      }

      navigate('/signin', { replace: true })
    }

    const redirectUser = () => {
      const intendedPlan = localStorage.getItem('sp-intended-plan') ?? 'free'
      setUserType(intendedPlan as 'free' | 'pro')
      localStorage.removeItem('sp-intended-plan')
      navigate(intendedPlan === 'pro' ? '/pro-dashboard' : '/dashboard', { replace: true })
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-zinc-400 text-sm">Signing you in...</p>
      </div>
    </div>
  )
}
