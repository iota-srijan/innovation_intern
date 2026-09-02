# IdeaLab Portal — Feature & Fix Implementation Plan

## Context

The app at `innovation_intern/inventory-dashboard` is a Vite + React 19 + TypeScript SPA on Vercel with Supabase (Postgres, Google OAuth, Storage, Edge Functions) as the backend. There is **no Node server**, so nodemailer is not applicable; the senior's real requirement ("record of the request shown in Gmail") is met with **Gmail compose deep links** where the email body carries the full request record and the user presses Send themselves. This matches the described flow exactly (redirect to Gmail, fields prefilled, manual send).

Current state relevant to the requested features:
- **RBAC already exists**: roles `student | faculty | mentor | admin | super_admin` (+ blocked/banned) in `src/context/AuthContext.tsx`, guards in `src/components/ProtectedRoute.tsx`, DB checks in `supabase/rls_policies.sql`. Requirement 1 needs tightening, not building.
- **Mentor assignment exists only for equipment requests** (`issue_requests.assigned_mentor_email`, set in `SuperAdminDashboard.tsx` approve flow). Service requests have no mentor field; no reassignment anywhere.
- **No analytics** of any kind.
- **No team/tagging support** on requests.
- Verified defects: `supabase/functions/return-reminder/index.ts:36` has a **live Resend API key hardcoded in source** and line 41 sends every reminder to `mishrasrijan2305@gmail.com` instead of the student. Plus orphaned plaintext `admin_credentials` + `admin-auth` edge function, legacy StockPilot pages still routed, mockData fallbacks in prod pages, duplicated hardcoded role emails, missing base migrations, and no RLS block for `service_requests`.

User decisions already made:
- Gmail compose redirect (no nodemailer, no new server).
- Analytics tracks **logged-in users only**, no cookies.
- Team tagging: record on the request, visible to approvers, and tagged students see the request in their own list (read-only).
- One design note: to autofill the professor in CC at approval time, the app must know the professor's email, so the student enters it in the request form at submit time (they still manually CC in their own Gmail draft if they want).

---

## Phase 0 — Security & hygiene fixes (do first)

### 0.1 Leaked Resend key + wrong recipient (top priority)
File: `supabase/functions/return-reminder/index.ts`
1. **Rotate the key** in the Resend dashboard (old one is in git history, treat as compromised).
2. Store new key via `supabase secrets set RESEND_API_KEY=...`; read with `Deno.env.get("RESEND_API_KEY")` (same pattern `low-stock-alert/index.ts` already uses).
3. Change recipient to `req.student_email`; optionally CC `req.assigned_mentor_email`.

### 0.2 Remove orphaned plaintext-credential auth
- Delete `supabase/functions/admin-auth/`; new migration drops `admin_credentials`; remove its RLS-disabled block from `rls_policies.sql`.
- Replace `localStorage.getItem('sp-admin-email')` reads in `src/hooks/useAdminServiceRequests.ts` (and `useItems.ts`) with the authenticated email from `useAuth()` so audit logs stop recording `unknown-admin`.

### 0.3 Remove legacy StockPilot surface
- Delete pages `Dashboard.tsx`, `ProDashboard.tsx`, `Suppliers.tsx`, `PurchaseOrders.tsx`, `PendingPOs.tsx`, `LowStockAlerts.tsx`, `Landing.tsx` (keep routed `LandingPage.tsx`), and `UserTypeContext.tsx`; remove their routes from `src/App.tsx`.
- `ProtectedRoute.tsx` currently redirects non-admins to the soon-deleted `/dashboard`; add `homePathForRole(role)` helper (see 0.4) and use it in every guard and in `Sidebar.tsx`.
- Remove `mockData` fallback branches from prod hooks/pages; remove the `@stockpilot.inc → admin` bypass in `AuthContext.tsx`.

### 0.4 Centralize role config
- New `src/lib/roleConfig.ts`: `SUPER_ADMIN_EMAILS`, `DEFAULT_APPROVER_EMAIL = 'deepayan.priyadarshini@opju.ac.in'`, test overrides, `inferOpjuRole`, `getDefaultRole`, `homePathForRole`. Consume from `AuthContext.tsx` and `AuthCallback.tsx` (currently duplicated, can drift).

### 0.5 Baseline migrations + missing RLS
- `supabase/migrations/08_baseline.sql`: idempotent `create table if not exists` DDL for tables that exist in prod but not in repo (`inventory_items`, `user_roles`, `issue_requests`, `service_requests`, `service_machines`, `notifications`, `audit_log`, `faculty_emails`, `consumables`).
- **Add an RLS block for `service_requests`** (currently none): insert own, select own-or-staff, update staff-only.

Verify Phase 0: `npm run build` clean; click through each role's sidebar; approve a service request and see the real admin email in `audit_log`; `grep -r "re_" supabase/` finds no key.

---

## Phase 1 — Schema migrations for new features

`supabase/migrations/09_team_mentor_professor.sql`:
```sql
alter table issue_requests   add column if not exists team_members jsonb not null default '[]'::jsonb;
alter table service_requests add column if not exists team_members jsonb not null default '[]'::jsonb;
alter table issue_requests   add column if not exists professor_email text;
alter table service_requests add column if not exists professor_email text;
alter table service_requests add column if not exists assigned_mentor_email text;
create index if not exists idx_service_requests_assigned_mentor on service_requests(assigned_mentor_email);
create index if not exists idx_issue_requests_team_members   on issue_requests   using gin (team_members jsonb_path_ops);
create index if not exists idx_service_requests_team_members on service_requests using gin (team_members jsonb_path_ops);
```
`team_members` shape: `[{"name": "...", "email": "..."}]`, emails lowercased client-side.

`supabase/migrations/10_analytics_sessions.sql`:
```sql
create table if not exists analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  user_role text,
  started_at timestamptz not null default now()
);
-- RLS: insert with check (auth.uid() = user_id); select only role in ('admin','super_admin'); no update/delete (append-only)
```
Plus a `get_analytics_summary(from_date, to_date)` SQL function (security invoker) returning per-day `sessions` and `unique_users`, so the client never downloads raw rows.

Team-visibility RLS: replace the select policies on both request tables with own-row OR `exists (select 1 from jsonb_array_elements(team_members) m where lower(m->>'email') = lower(auth.jwt()->>'email'))` OR staff role.

---

## Phase 2 — Gmail compose email flow (requirement 4)

### 2.1 Shared util `src/lib/gmail.ts`
- `buildGmailComposeUrl({to, cc?, subject, body})` → `https://mail.google.com/mail/?view=cm&fs=1&to=...&cc=...&su=...&body=...`, everything `encodeURIComponent`ed.
- Cap final URL ~1900 chars: body built from item lines; drop trailing lines while over budget and append "…and N more items (see dashboard)". Never truncate to/cc/subject.
- `openGmailCompose()` via `window.open(..., '_blank', 'noopener')`, returns false when popup-blocked.

### 2.2 Popup-safe UX
Never `window.open` after an awaited insert (gesture consumed → blocked). After successful insert, show a `RequestSubmittedModal` (new `src/components/requests/RequestSubmittedModal.tsx`) with an explicit **"Open Gmail draft"** button (fresh gesture). Fallback inside the modal: plain `<a target="_blank">` link + "Copy link".

### 2.3 Student submit
- **Equipment** (`src/pages/CartPage.tsx`): add required "Professor email" input + team-member input to the submit step; include both in the inserted rows. On success, modal composes To = `DEFAULT_APPROVER_EMAIL` (Deepayan sir), subject `IdeaLab Equipment Request — {student}`, body = student details, per-item `name x qty — purpose`, team members, and a note reminding the student to CC their professor before sending.
- **Service** (`src/pages/StudentDashboard.tsx` + `src/hooks/useServiceRequests.ts`): same fields on the service form and insert; modal body = machine, material, dimensions, copies, purpose, STL filename.

### 2.4 Approval side
- `SuperAdminDashboard.tsx` `handleApprove`: on success show the same modal with To = student email, **CC = `professor_email` autofilled**, body = item, qty, return deadline, assigned mentor, note.
- `useAdminServiceRequests.ts` / `ServiceRequestsPanel.tsx`: after service approval, same modal with slot/duration/mentor details.

Verify: 30-item cart stays under the URL cap with truncation note; works with popups blocked via the button path; To/CC/subject/body render correctly in Gmail including `&`, `+`, newlines.

---

## Phase 3 — Mentor assignment for service requests + reassignment (requirement 2)

- New `src/hooks/useMentors.ts` extracting the mentor fetch inlined in `SuperAdminDashboard.tsx` (`user_roles` where `role='mentor'`).
- `useAdminServiceRequests.ts`: add `assignedMentorEmail` to the approve params; new `reassignMentor(request, newEmail)` that updates **only** `assigned_mentor_email` (+ audit log) — never touches `status`/`physical_status`, so reassignment after issue is safe.
- `ServiceRequestsPanel.tsx`: mentor dropdown in the approve modal, editable for super_admin, read-only column for admins.
- Reassign action ("Reassign" button + mentor dropdown modal) on `SuperAdminDashboard.tsx` approved tables for **both** equipment and service requests; audit-log old → new; invalidate the relevant queries.
- `MentorDashboard.tsx`: add a service-requests section (`assigned_mentor_email = me`) showing machine, slot, student, STL link; refetch on window focus so reassigned requests move between mentors' lists.

Verify: approve service request assigning mentor A → visible on A's dashboard; reassign to B → moves to B; audit log records both events.

---

## Phase 4 — Team requests (requirement 5)

- New `src/components/requests/TeamMembersInput.tsx`: dynamic name+email rows (max 5), lowercase/trim, email regex, dedupe, reject the requester's own email. Wired into `CartPage.tsx` (same array applied to every inserted row of the batch) and the service form.
- New shared `TeamMembersBadgeList` chips shown in `AdminPendingPage.tsx`, `ServiceRequestsPanel.tsx`, `SuperAdminDashboard.tsx` tables, `MentorDashboard.tsx`.
- `StudentRequestsPage.tsx` / `FacultyRequestsPage.tsx`: change queries from `.eq('student_email', me)` to
  `.or(`student_email.eq.${email},team_members.cs.${JSON.stringify([{email}])}`)` (jsonb containment). Rows where `student_email !== me` get a "Tagged" badge and no mutation actions.
- Realtime: postgres_changes filters can't express OR, so switch the filtered subscriptions to unfiltered table subscriptions that just invalidate the query (volume is low).
- Team members are included in the Gmail bodies (Phase 2).
- Edge case: tagging an email that hasn't registered yet is fine — matching is by email text, so it works the moment that person first signs in.

Verify: A submits tagging B → B sees it read-only; untagged C cannot select the row even via direct supabase-js query (RLS-level check).

---

## Phase 5 — Analytics without cookies (requirement 3)

- New `src/hooks/useSessionTracking.ts`, mounted via a tiny `<SessionTracker />` inside the auth provider tree:
  - Once user + role resolve (and role isn't blocked/banned): if `sessionStorage['il-session-recorded']` absent, set it **before** the awaited insert (guards React StrictMode double-run), then insert `{user_id, user_email, user_role}` into `analytics_sessions`. On insert error, remove the key so it retries next load.
  - Definition: 1 session = 1 authenticated app load per tab. `sessionStorage` is per-tab and is not a cookie. Clear the key in `signOut` so re-login in the same tab counts as a new session. Token refreshes never double-count.
- New `src/pages/AdminAnalyticsPage.tsx` at `/admin/analytics` behind `AdminRoute`, sidebar entry for admin + super_admin:
  - Stat cards (reuse `src/components/dashboard/StatCard.tsx`): total unique users, total sessions, avg sessions/user, sessions today.
  - Daily sessions + unique-users chart (recharts, already a dependency) over 30/90 days via the `get_analytics_summary` RPC; sessions-per-user table.

Verify: sign in → exactly one row; hard refresh same tab → no new row; new tab → new row; student hitting `/admin/analytics` redirected; student `select` on the table returns zero rows.

---

## Phase 6 — Suggested future features (requirement 6, prioritized)

1. **Return-deadline lifecycle**: student-visible due-soon/overdue badges + the fixed reminder function on a `pg_cron` schedule.
2. **Slot calendar per service machine**: overlap check on `assigned_slot` at approval to prevent double-booking.
3. **In-app notifications on approve/reject** reusing the existing `notifications` table, complementing the Gmail flow.
4. **Inventory utilization analytics**: most-requested items, approval rate, avg turnaround (data already in `issue_requests`).
5. **XLSX export of requests** (dependency `xlsx` already installed; SuperAdminDashboard already builds export rows).
6. **Semester archive/rollover** of closed requests.

---

## Requirement 7 — what's broken / to improve (addressed in Phase 0)
Leaked Resend key + wrong reminder recipient (0.1); plaintext orphaned admin credentials (0.2); `unknown-admin` audit entries (0.2); legacy StockPilot pages and mock-data fallbacks in prod (0.3); duplicated hardcoded role emails (0.4); missing base migrations and missing `service_requests` RLS (0.5); disabled Microsoft SSO stub can simply be removed from `SignIn.tsx`.

## Execution order
Phase 0 → 1 → 2 → 3 → 4 → 5 (Phases 2–5 are independent after 1, can be reordered). Phase 6 is backlog only.

## Overall verification
After each phase: `npm run build`, then walk the full flow with two test accounts (student `srijanmishra1669@gmail.com`, faculty/admin `mishrasrijan2305@gmail.com`) plus a super admin: submit equipment + service request with team tags and professor email → Gmail draft opens with record → super admin approves, assigns mentor, Gmail draft opens with student To + professor CC → mentor sees and works the request → reassign mentor → analytics page shows the sessions generated during testing.
