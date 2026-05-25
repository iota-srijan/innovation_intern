import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useUserType } from '../context/UserTypeContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setUserType } = useUserType()

  useEffect(() => {
    const redirectUser = (plan: string) => {
      setUserType(plan as 'free' | 'pro')
      localStorage.removeItem('sp-intended-plan')
      navigate(plan === 'pro' ? '/pro-dashboard' : '/dashboard', { replace: true })
    }

    const checkSession = async () => {
      const intendedPlan = localStorage.getItem('sp-intended-plan') ?? 'free'

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        redirectUser(intendedPlan)
        return
      }

      await new Promise(resolve => setTimeout(resolve, 2000))

      const { data: { session: session2 } } = await supabase.auth.getSession()
      if (session2) {
        redirectUser(intendedPlan)
        return
      }

      navigate('/signin', { replace: true })
    }

    checkSession()
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
