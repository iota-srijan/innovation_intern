interface ReturnDeadlineBadgeProps {
  status: string
  physicalStatus?: string | null
  returnDeadline?: string | null
}

// Flags urgency only while an item is actually out with the student
// (approved + physically issued) — a deadline on a still-pending or
// already-returned request isn't something the student needs to act on.
export function ReturnDeadlineBadge({ status, physicalStatus, returnDeadline }: ReturnDeadlineBadgeProps) {
  if (!returnDeadline) return <span className="text-gray-400 dark:text-zinc-600">—</span>

  const dateStr = new Date(returnDeadline).toLocaleDateString()

  if (status !== 'approved' || physicalStatus !== 'issued') {
    return <span>{dateStr}</span>
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(returnDeadline)
  deadline.setHours(0, 0, 0, 0)
  const diffDays = Math.round((deadline.getTime() - today.getTime()) / 86_400_000)

  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-red-400">
        {dateStr}
        <span className="rounded-full border border-red-400/25 bg-red-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
          Overdue
        </span>
      </span>
    )
  }

  if (diffDays <= 3) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-amber-400">
        {dateStr}
        <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
          Due in {diffDays}d
        </span>
      </span>
    )
  }

  return <span>{dateStr}</span>
}
