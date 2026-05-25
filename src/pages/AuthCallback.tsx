import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useUserType } from '../context/UserTypeContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setUserType } = useUserType()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const redirectUser = () => {
      const intendedPlan = localStorage.getItem('sp-intended-plan') ?? 'free'
      setUserType(intendedPlan as 'free' | 'pro')
      localStorage.removeItem('sp-intended-plan')
      navigate(intendedPlan === 'pro' ? '/pro-dashboard' : '/dashboard', { replace: true })
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        redirectUser()
        return
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          redirectUser()
        } else if (event === 'SIGNED_OUT') {
          subscription.unsubscribe()
          navigate('/signin', { replace: true })
        }
      })

      setTimeout(() => {
        subscription.unsubscribe()
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            redirectUser()
          } else {
            navigate('/signin', { replace: true })
          }
        })
      }, 5000)
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
