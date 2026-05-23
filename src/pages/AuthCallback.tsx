import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useUserType } from '../context/UserTypeContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setUserType } = useUserType()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const intendedPlan = localStorage.getItem('sp-intended-plan') ?? 'free'
        setUserType(intendedPlan as 'free' | 'pro')
        localStorage.removeItem('sp-intended-plan')
        if (intendedPlan === 'pro') {
          navigate('/pro-dashboard', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      } else {
        navigate('/signin', { replace: true })
      }
    })
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
