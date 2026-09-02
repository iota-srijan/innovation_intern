// sessionStorage (not a cookie) key guarding cookieless session tracking —
// scopes "1 session = 1 authenticated app load" to a single tab's lifetime.
// Shared between useSessionTracking.ts (sets/checks it) and
// AuthContext.tsx's signOut (clears it, so re-login in the same tab counts
// as a new session) without the two modules importing each other.
export const SESSION_TRACKING_KEY = 'il-session-recorded'
