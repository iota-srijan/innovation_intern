import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface Mentor {
  user_id: string
  email: string
  display_name: string | null
}

export function useMentors() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refetchMentors = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id, email, display_name')
        .eq('role', 'mentor')
      setMentors((data ?? []) as Mentor[])
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetchMentors()
  }, [refetchMentors])

  return { mentors, isLoading, refetchMentors }
}
