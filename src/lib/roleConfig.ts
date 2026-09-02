export type UserRole = 'student' | 'faculty' | 'mentor' | 'admin' | 'super_admin' | 'blocked' | 'banned' | null

export const SUPER_ADMIN_EMAILS = ['deepayan.priyadarshini@opju.ac.in', 'srijan.mishra2305@gmail.com']

// Approver Gmail compose flows default to this address when a request has no other reviewer context.
export const DEFAULT_APPROVER_EMAIL = 'deepayan.priyadarshini@opju.ac.in'

// Non-@opju.ac.in test accounts used during development, pinned to a fixed role
// since they don't follow the department-code email convention below.
const TEST_ROLE_OVERRIDES: Record<string, 'student' | 'faculty' | 'mentor'> = {
  'srijanmishra1669@gmail.com': 'student',
  'mishrasrijan2305@gmail.com': 'faculty',
  'pentagonstudio.dev@gmail.com': 'mentor',
}

// Every non-@opju.ac.in address allowed to sign in at all.
export const ALLOWED_EXTRA_EMAILS = [...SUPER_ADMIN_EMAILS, ...Object.keys(TEST_ROLE_OVERRIDES)]

// Detect student vs faculty for @opju.ac.in emails.
// Student local parts contain a department-code segment after the dot:
//   e.g. kesh.bt24me14 → second segment starts with 2 letters + 2 digits → student
// Faculty local parts are plain name.surname (no embedded code) → faculty
export function inferOpjuRole(email: string): 'student' | 'faculty' {
  const local = email.split('@')[0]
  const dotIndex = local.indexOf('.')
  if (dotIndex !== -1 && /^[a-zA-Z]{2}\d{2}/.test(local.slice(dotIndex + 1))) {
    return 'student'
  }
  return 'faculty'
}

// Fallback rules when user_roles table has no row for this email yet.
export function getDefaultRole(email: string): UserRole {
  if (SUPER_ADMIN_EMAILS.includes(email)) return 'super_admin'
  if (email in TEST_ROLE_OVERRIDES) return TEST_ROLE_OVERRIDES[email]
  if (email.endsWith('@opju.ac.in')) return inferOpjuRole(email)
  return 'blocked'
}

export function homePathForRole(role: UserRole): string {
  switch (role) {
    case 'super_admin': return '/super-admin'
    case 'admin': return '/admin'
    case 'mentor': return '/mentor-dashboard'
    case 'faculty': return '/faculty-dashboard'
    case 'student': return '/student-dashboard'
    default: return '/signin'
  }
}
