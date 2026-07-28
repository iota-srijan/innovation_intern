import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import type { ServiceMachine, TeamMember } from '../types'

export interface SubmitServiceRequestInput {
  student_id: string | null
  student_email: string
  student_name: string
  machine_id: string
  machine_name: string
  material_type: string | null
  dim_l: number | null
  dim_w: number | null
  dim_h: number | null
  infill_percent: number | null
  copies: number
  purpose: string
  stlFile: File | null
  professor_email: string
  team_members: TeamMember[]
}

export function useServiceRequests() {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: machines = [] } = useQuery({
    queryKey: ['service_machines'],
    queryFn: async (): Promise<ServiceMachine[]> => {
      const { data, error } = await supabase
        .from('service_machines')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as ServiceMachine[]
    },
  })

  async function submitServiceRequest(input: SubmitServiceRequestInput) {
    setIsSubmitting(true)
    try {
      let stl_file_url: string | null = null
      let stl_file_name: string | null = null

      if (input.stlFile) {
        const safePath = input.student_id ?? input.student_email.replace('@', '_at_').replace(/\./g, '_')
        const filePath = `${safePath}/${Date.now()}_${input.stlFile.name}`
        const { error: uploadError } = await supabase.storage
          .from('stl-files')
          .upload(filePath, input.stlFile)
        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('stl-files')
          .getPublicUrl(filePath)

        stl_file_url = publicUrlData.publicUrl
        stl_file_name = input.stlFile.name
      }

      const { error: insertError } = await supabase.from('service_requests').insert({
        student_id: input.student_id,
        student_email: input.student_email,
        student_name: input.student_name,
        machine_id: input.machine_id,
        machine_name: input.machine_name,
        material_type: input.material_type,
        dim_l: input.dim_l,
        dim_w: input.dim_w,
        dim_h: input.dim_h,
        infill_percent: input.infill_percent,
        copies: input.copies,
        purpose: input.purpose,
        stl_file_url,
        stl_file_name,
        status: 'pending',
        professor_email: input.professor_email,
        team_members: input.team_members,
      })
      if (insertError) throw insertError

      await queryClient.invalidateQueries({ queryKey: ['service_requests'] })
    } finally {
      setIsSubmitting(false)
    }
  }

  return { machines, submitServiceRequest, isSubmitting }
}
