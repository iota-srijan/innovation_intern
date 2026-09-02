import { Plus, Trash2 } from 'lucide-react'
import type { TeamMember } from '../../types'

const MAX_MEMBERS = 5
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface TeamMembersInputProps {
  members: TeamMember[]
  onChange: (members: TeamMember[]) => void
  ownEmail: string
}

// Dynamic name+email rows for tagging teammates on a request. Validation
// (dedupe, own-email rejection, email format) happens per-row on blur/change
// so the caller always receives whatever is currently in the rows — callers
// that need a "is this valid to submit" check should re-validate with the
// same rules (see CartPage.tsx / StudentDashboard.tsx submit handlers).
export function TeamMembersInput({ members, onChange, ownEmail }: TeamMembersInputProps) {
  const addRow = () => {
    if (members.length >= MAX_MEMBERS) return
    onChange([...members, { name: '', email: '' }])
  }

  const removeRow = (index: number) => {
    onChange(members.filter((_, i) => i !== index))
  }

  const updateRow = (index: number, field: keyof TeamMember, value: string) => {
    onChange(members.map((m, i) => (i === index ? { ...m, [field]: value } : m)))
  }

  const rowError = (m: TeamMember, index: number): string | null => {
    if (!m.email.trim()) return null
    const email = m.email.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) return 'Invalid email'
    if (email === ownEmail.trim().toLowerCase()) return "That's your own email"
    const dupeIndex = members.findIndex((other, i) => i !== index && other.email.trim().toLowerCase() === email)
    if (dupeIndex !== -1) return 'Already added'
    return null
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="block text-[10px] text-gray-500 dark:text-zinc-400 uppercase tracking-widest">
          Team Members <span className="normal-case text-gray-400 dark:text-zinc-600">(optional, max {MAX_MEMBERS})</span>
        </label>
        {members.length < MAX_MEMBERS && (
          <button
            type="button"
            onClick={addRow}
            className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-orange-400 hover:text-orange-300"
          >
            <Plus className="h-3 w-3" />
            Add member
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <p className="text-[11px] text-gray-400 dark:text-zinc-600">
          Working with a team? Tag them here so they can see this request too.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m, i) => {
            const error = rowError(m, i)
            return (
              <div key={i} className="flex items-start gap-2">
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => updateRow(i, 'name', e.target.value)}
                  placeholder="Name"
                  className="w-1/3 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none focus:border-orange-400"
                />
                <div className="flex-1">
                  <input
                    type="email"
                    value={m.email}
                    onChange={(e) => updateRow(i, 'email', e.target.value)}
                    placeholder="teammate@opju.ac.in"
                    className={`w-full rounded-lg border bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none ${
                      error ? 'border-red-400 dark:border-red-500/60' : 'border-gray-300 dark:border-zinc-700 focus:border-orange-400'
                    }`}
                  />
                  {error && <p className="mt-0.5 text-[10px] text-red-400">{error}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="mt-1.5 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Returns only the rows that are complete and valid — used by submit
// handlers to build the team_members payload, silently dropping incomplete
// rows (a half-filled row shouldn't block or corrupt the submission).
export function getValidTeamMembers(members: TeamMember[], ownEmail: string): TeamMember[] {
  const seen = new Set<string>()
  const result: TeamMember[] = []
  const own = ownEmail.trim().toLowerCase()
  for (const m of members) {
    const name = m.name.trim()
    const email = m.email.trim().toLowerCase()
    if (!name || !email) continue
    if (!EMAIL_RE.test(email)) continue
    if (email === own) continue
    if (seen.has(email)) continue
    seen.add(email)
    result.push({ name, email })
  }
  return result
}
