export function getAdminEmail(contextEmail?: string | null): string {
  return contextEmail
    || localStorage.getItem('sp-admin-email')
    || 'unknown-admin'
}
