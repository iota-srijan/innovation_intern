import { useSessionTracking } from '../hooks/useSessionTracking'

// Renders nothing — just runs the cookieless session-tracking side effect.
// Mounted once inside AuthProvider's tree (see App.tsx).
export function SessionTracker() {
  useSessionTracking()
  return null
}
