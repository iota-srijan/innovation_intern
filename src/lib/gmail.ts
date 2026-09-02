// Gmail "compose" deep links — no server, no nodemailer. Opening one of
// these URLs takes the user straight to a prefilled Gmail draft; they still
// press Send themselves. Used for the request-submission and approval flows
// so a readable record of each request lands in an actual Gmail thread.

export interface GmailComposeParams {
  to: string
  cc?: string
  subject: string
  body: string
}

// Gmail silently truncates/misbehaves on very long compose URLs well before
// typical browser URL limits, so we cap conservatively.
const MAX_URL_LENGTH = 1900

export function buildGmailComposeUrl({ to, cc, subject, body }: GmailComposeParams): string {
  const params = new URLSearchParams()
  params.set('view', 'cm')
  params.set('fs', '1')
  params.set('to', to)
  if (cc) params.set('cc', cc)
  params.set('su', subject)
  params.set('body', body)
  return `https://mail.google.com/mail/?${params.toString()}`
}

// Opens the compose URL in a new tab. Must be called directly from a click
// handler (a fresh user gesture) — calling it after an awaited async
// operation lets popup blockers intercept it, which is why callers always
// pair this with a button rather than firing it automatically post-submit.
export function openGmailCompose(params: GmailComposeParams): boolean {
  const url = buildGmailComposeUrl(params)
  const win = window.open(url, '_blank', 'noopener')
  return win != null
}

// Assembles a body from a header, a list of line items, and a footer,
// dropping trailing item lines (never header/footer) until the resulting
// Gmail URL fits under MAX_URL_LENGTH. Returns full compose params ready
// for buildGmailComposeUrl/openGmailCompose.
export function composeWithTruncation(
  base: { to: string; cc?: string; subject: string },
  header: string,
  lines: string[],
  footer: string,
): GmailComposeParams {
  const render = (count: number): string => {
    const shown = lines.slice(0, count)
    const omitted = lines.length - count
    const parts = [header, ...shown]
    if (omitted > 0) parts.push(`…and ${omitted} more item(s) — see the dashboard for the full list.`)
    parts.push(footer)
    return parts.filter(Boolean).join('\n\n')
  }

  for (let visibleCount = lines.length; visibleCount >= 0; visibleCount--) {
    const body = render(visibleCount)
    const url = buildGmailComposeUrl({ ...base, body })
    if (url.length <= MAX_URL_LENGTH || visibleCount === 0) {
      return { ...base, body }
    }
  }
  return { ...base, body: render(0) }
}
