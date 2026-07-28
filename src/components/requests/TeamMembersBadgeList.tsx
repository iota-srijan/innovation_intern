import type { TeamMember } from '../../types'

// Compact chip list for approver-facing tables (AdminPendingPage, AdminAllRequestsPage,
// ServiceRequestsPanel, SuperAdminDashboard, MentorDashboard). Renders nothing when
// there are no tagged members, so callers can drop it in unconditionally.
export function TeamMembersBadgeList({ members }: { members: TeamMember[] | null | undefined }) {
  if (!members || members.length === 0) return <span className="text-gray-400 dark:text-[#4b4b57]">—</span>

  return (
    <div className="flex flex-wrap gap-1">
      {members.map((m) => (
        <span
          key={m.email}
          title={m.email}
          className="inline-flex items-center rounded-full border border-violet-400/25 bg-violet-400/[0.08] px-2 py-0.5 text-[10px] font-medium text-violet-300"
        >
          {m.name || m.email}
        </span>
      ))}
    </div>
  )
}
