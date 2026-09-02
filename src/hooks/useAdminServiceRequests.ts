import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import type { ServiceRequest } from '../types'

interface UseAdminServiceRequestsOptions {
  onlyPending?: boolean
  refetchInterval?: number
}

interface ApproveParams {
  assignedSlot: string
  durationMins: number
  reviewNote: string
  assignedMentorEmail?: string
}

export function useAdminServiceRequests(options: UseAdminServiceRequestsOptions = {}) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['service_requests'],
    queryFn: async (): Promise<ServiceRequest[]> => {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ServiceRequest[]
    },
    refetchInterval: options.refetchInterval,
    refetchOnWindowFocus: true,
  })

  const allRequests = data ?? []
  const requests = options.onlyPending ? allRequests.filter(r => r.status === 'pending') : allRequests

  const getActorEmail = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.email ?? 'unknown-admin'
  }

  const logAudit = async (action: string) => {
    try {
      const actorEmail = await getActorEmail()
      await supabase.from('audit_log').insert({ actor_email: actorEmail, action, action_type: 'UPDATE' })
    } catch {
      // audit failures are non-fatal
    }
  }

  const approveServiceRequest = async (target: ServiceRequest, params: ApproveParams) => {
    const adminEmail = await getActorEmail()

    const { error } = await supabase
      .from('service_requests')
      .update({
        status: 'approved',
        assigned_slot: params.assignedSlot,
        slot_duration_mins: params.durationMins,
        review_note: params.reviewNote.trim() || null,
        reviewed_by: adminEmail,
        assigned_mentor_email: params.assignedMentorEmail || null,
      })
      .eq('id', target.id)
    if (error) throw error

    const mentorNote = params.assignedMentorEmail ? `, assigned mentor ${params.assignedMentorEmail}` : ''
    await logAudit(`Service request approved: ${target.machine_name} for ${target.student_name}${mentorNote}`)
    await queryClient.invalidateQueries({ queryKey: ['service_requests'] })
  }

  const rejectServiceRequest = async (target: ServiceRequest, reviewNote: string) => {
    const adminEmail = await getActorEmail()

    const { error } = await supabase
      .from('service_requests')
      .update({
        status: 'rejected',
        review_note: reviewNote.trim(),
        reviewed_by: adminEmail,
      })
      .eq('id', target.id)
    if (error) throw error

    await logAudit(`Service request rejected: ${target.machine_name} for ${target.student_name}`)
    await queryClient.invalidateQueries({ queryKey: ['service_requests'] })
  }

  // Reassigns the mentor on an already-approved service request without
  // touching status, slot, or any other field — safe to call after the
  // original mentor has already started working the request.
  const reassignMentor = async (target: ServiceRequest, newMentorEmail: string) => {
    const { error } = await supabase
      .from('service_requests')
      .update({ assigned_mentor_email: newMentorEmail })
      .eq('id', target.id)
    if (error) throw error

    await logAudit(`Reassigned mentor for ${target.machine_name} (${target.student_name}) from ${target.assigned_mentor_email ?? 'none'} to ${newMentorEmail}`)
    await queryClient.invalidateQueries({ queryKey: ['service_requests'] })
  }

  return { requests, isLoading, approveServiceRequest, rejectServiceRequest, reassignMentor }
}
