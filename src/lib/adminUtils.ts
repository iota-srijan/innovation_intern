export function getAdminEmail(contextEmail?: string | null): string {
  return contextEmail || 'unknown-admin'
}
