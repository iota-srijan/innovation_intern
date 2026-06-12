# StockPilot — Full `src/` Audit Report

Read-only audit. No code was changed. Every file under `src/` was read. Findings are grouped first by **systemic/cross-cutting issue** (the same bug pattern repeated across many files), then **critical security issues**, then **auth/role bugs**, then **per-file findings**.

---

## 0. TL;DR — Highest-priority items

1. **CRITICAL SECURITY (2 places)** — plaintext admin password stored/compared via direct client-side Supabase queries to `admin_credentials`. `AuthContext.signInAsAdmin` and `AdminPasswordPage.handleUpdatePassword`. If RLS allows these queries to work at all, the whole `admin_credentials` table (emails+passwords) is readable/writable via the public REST API.
2. **AUTH BYPASS** — `AuthCallback.tsx` ignores `user_roles.role` values of `'admin'`, `'banned'`, `'blocked'`; a banned/blocked user can sign in via Google and is routed to `/student-dashboard` as if nothing happened.
3. **Sidebar nav exposure** — `Sidebar.tsx`'s role-filter has no branch for `banned`/`blocked`, so most of the student/faculty nav (Inventory, Suppliers, IdeaBoard, Notifications, Profile, etc.) stays visible/clickable for banned users.
4. **Fake mutations that don't persist** — `InventoryTable.tsx`'s "Delete Selected" and inline quantity edit only mutate the React Query cache, never call Supabase. Both show success toasts; both silently revert on next refetch. Inline qty-edit isn't even admin-gated.
5. **Systemic null-coercion "low stock" bug** — `reorder_threshold` is nullable in the DB but typed as non-null `number` in `types/index.ts`. At least **12 different, mutually-inconsistent** "is this item low stock" implementations exist across the codebase, several of which produce `Infinity`/`NaN` or simply never trigger for null-threshold rows.
6. **`['issue_requests']` queryKey collision** — up to 4 different pages use the literal key `['issue_requests']` for 4 differently-filtered datasets (own-student, own-faculty, all-pending, all-requests). React Query cannot distinguish them; cached data from one role can flash on another's screen.
7. **`localStorage['sp-user-type']` collision** — both `AuthContext`'s `UserRole` (`student/faculty/admin/blocked/banned`) and `UserTypeContext`'s `UserType` (`free/pro`) read/write the same key.
8. Two entire feature areas (**Procurement Dashboard / Purchase Orders / Suppliers / Pending POs / ProDashboard's charts / LowStockAlerts' forecast**) are mock/non-functional, with hardcoded data and no Supabase wiring, presented in the UI as if real/live.

---

## 1. Systemic / Cross-Cutting Issues

### 1.1 Null-coercion "low stock" bug — `reorder_threshold` (root cause + 12 occurrences)

**Root cause**: `src/types/index.ts` declares `InventoryItem.reorder_threshold: number` (non-nullable), but the actual Postgres column **is nullable** (proven by `AdminInventoryPage.tsx`'s local type `reorder_threshold: number | null` and its payload logic that writes `null`). Every comparison `quantity <= reorder_threshold` therefore type-checks as safe but can misbehave at runtime because `null` coerces to `0` in JS arithmetic/relational ops.

Confirmed occurrences (all different, all inconsistent):

| # | File:Line | Expression | Effect when `reorder_threshold === null` |
|---|---|---|---|
| 1 | `hooks/useItems.ts:39` (`useCreateItem`) | `newItem.quantity <= newItem.reorder_threshold` | `null→0`; alert only fires for qty=0 items |
| 2 | `hooks/useItems.ts:69` (`useUpdateItem`) | `updatedItem.quantity <= updatedItem.reorder_threshold` | same as above |
| 3 | `pages/Dashboard.tsx:74` | `i.quantity <= i.reorder_threshold` | same; "Low Stock" stat undercounts |
| 4 | `pages/AdminLogisticsPage.tsx:46-48` | `(i.quantity \|\| 0) <= (i.reorder_threshold \|\| 0)` | same `\|\| 0` pattern, same effect |
| 5 | `pages/LowStockAlerts.tsx:36` | `items.filter(i => i.quantity <= i.reorder_threshold)` | **no guard at all** — worst case |
| 5b | `pages/LowStockAlerts.tsx:45-48` | `urgency`/`suggestedOrder` use `reorder_threshold * 0.3` / `* 3` | `null*X=0` → `suggestedOrder` always `Math.max(-qty,50)=50` |
| 5c | `pages/LowStockAlerts.tsx:164` | `pct = (quantity / reorder_threshold) * 100` | `/0` → `Infinity`/`NaN` → renders a full-width **green** ("healthy") bar inside the Low Stock table, or invalid `"NaN%"` CSS |
| 6 | `pages/ProDashboard.tsx:204` | `items.filter(i => i.quantity <= i.reorder_threshold)` | same as #5 |
| 6b | `pages/ProDashboard.tsx:222` | `.sort((a,b) => a.quantity/a.reorder_threshold - b.quantity/b.reorder_threshold)` | `/0` → `Infinity`/`NaN` → unstable sort order for "Priority Restock Queue" |
| 6c | `pages/ProDashboard.tsx:228` | same `*0.3`/`*0.6` urgency issue | as #5b |
| 7 | `components/dashboard/InventoryHealth.tsx:13` | `items.filter(i => i.quantity < i.reorder_threshold).length` | uses `<` (not `<=`) — `quantity < 0` always false → null-threshold items **never** counted as low stock (opposite skew from the `<=` cases) |
| 8 | `components/inventory/LowStockBadge.tsx:10` | `quantity >= threshold` → "In Stock" | `>=0` always true → always "In Stock" (component is **dead/unused**, so moot) |
| — | `pages/AdminPendingPage.tsx` / `AdminAllRequestsPage.tsx` | `newQty <= (reorder_threshold ?? 0)` style checks for `newStatus` | `?? 0` variant, same root issue |
| **9 (best)** | `components/inventory/InventoryTable.tsx:51-55` | `threshold != null && threshold > 0 && qty <= threshold` | **correctly guards null/0** — the only correct implementation found |

`InventoryTable.tsx` itself additionally has an **11th**, *different and buggy* check for its "Status" badge (`item.quantity <= item.reorder_threshold`, line 377/380) — i.e. one file contains both the best and a bad implementation.

**Fix**: (1) make `InventoryItem.reorder_threshold: number | null` in `types/index.ts` to surface the nullability to TypeScript; (2) extract a single shared `isLowStock(item): boolean` (and `lowStockSeverity(item)`) helper modeled on `InventoryTable.tsx`'s guard, and use it in all ~12 locations above.

### 1.2 React Query `['issue_requests']` key collisions / fragmentation

- `StudentDashboard.tsx:69` and `FacultyDashboard.tsx:78` both use queryKey **`['issue_requests']`** with `staleTime:0, refetchOnMount:'always', refetchInterval:30000` — but each queryFn filters by the *current user's own* `student_email`.
- `AdminPendingPage.tsx:68-80` ALSO uses **`['issue_requests']`**, but its queryFn fetches all-pending requests, with `refetchInterval:10000, refetchOnWindowFocus:true`.
- `AdminAllRequestsPage.tsx:67-78` ALSO uses **`['issue_requests']`**, fetching ALL requests, with only `refetchOnWindowFocus:true` (no interval).
- **Result**: 4 files, 4 different result shapes, identical cache key. React Query renders whatever's cached for `['issue_requests']` on first paint regardless of which of these 4 queryFns populated it, then refetches in the background — so e.g. an admin's full request list can flash on a student's dashboard stat cards before the student-scoped refetch lands.
- `FacultyRequestsPage.tsx:62` uses a *different* key, `['issue_requests','faculty-mine',facultyEmail]`, for the **same logical data** as `FacultyDashboard`'s `['issue_requests']` — two cache entries for one dataset, with no `staleTime`/`refetchOnMount`/`refetchInterval` set (3rd different freshness config for "my requests").
- `StudentRequestsPage.tsx` uses **no React Query at all** (manual `useState`/`useEffect`+`fetchRequests()`) — a 4th data-fetching strategy for the same conceptual data.
- `CartPage.tsx:144-146` invalidates THREE keys after submitting a request: `['issue_requests']` (works for Student/FacultyDashboard), `['issue_requests','mine',studentEmail]` (**dead — no subscriber anywhere**), `['issue_requests','faculty-mine',studentEmail]` (live, matches `FacultyRequestsPage`, but does **not** invalidate `FacultyDashboard`'s `['issue_requests']`).

**Fix**: adopt one parameterized key scheme everywhere, e.g. `['issue_requests','mine',email]`, `['issue_requests','faculty-mine',email]`, `['issue_requests','pending']`, `['issue_requests','all']`, and migrate `StudentRequestsPage`/`AdminPendingPage`/`AdminAllRequestsPage` to React Query with these keys. Standardize `staleTime`/`refetchOnMount`/`refetchInterval` in one shared hook.

### 1.3 `localStorage['sp-user-type']` — shared by two unrelated contexts

- `AuthContext`/`AuthCallback.tsx:100` writes `localStorage.setItem('sp-user-type', role)` where `role ∈ {'student','faculty'}` (also `'admin'`/`'banned'`/`'blocked'` conceptually, per `UserRole`).
- `UserTypeContext.tsx` declares `UserType = 'free' | 'pro' | null` and reads/writes the **same key** `'sp-user-type'`, with `(localStorage.getItem('sp-user-type') as UserType) || null` — an unchecked cast.
- `SignIn.tsx`'s `handleAdminSignIn` does `setUserType('admin' as any)` — writes the literal string `'admin'` into this shared key via an `as any` cast, which is invalid for `UserType`.
- `ProDashboard.tsx`'s entire `isPro` gate reduces in practice to `userType === 'pro'`, read from this collided key (see §3.4).

**Fix**: use two distinct localStorage keys (e.g. `sp-user-role` vs `sp-user-type`), and remove the `as any`/`as UserType` casts.

### 1.4 Duplicate / divergent type definitions

- `InventoryItem` is defined **independently** in: `types/index.ts`, `AdminInventoryPage.tsx` (`sku`/`category_id`/`supplier`/`unit_price`/`status` all nullable, vs non-null in the shared type), and `ProDashboard.tsx`'s `ExtendedItem`. Field nullability and even the relation field name (`category` vs `categories`) differ between the shared type and `useItems()`'s actual query (`category:categories(*)`) vs `AdminInventoryPage`'s query (`categories(id,name)`).
- `IssueRequest` is redefined locally and divergently in: `types/index.ts` (missing `physical_status`/`issued_at`/`returned_at`), `AdminPendingPage.tsx`, `AdminAllRequestsPage.tsx`, `StudentDashboard.tsx`, `FacultyDashboard.tsx` (has `physical_status`+`effectivePhysicalStatus()` helper, not shared), `FacultyRequestsPage.tsx`. `StudentRequestsPage.tsx` is the **only** page that imports the shared type from `types/index.ts`.
- `reviewed_by`/`review_note` typed `string | undefined` in `types/index.ts` but actually written as `null` by `AdminPendingPage`.

**Fix**: consolidate to one accurate `InventoryItem`/`IssueRequest`/`PhysicalStatus` in `types/index.ts` (matching real Postgres nullability), move `effectivePhysicalStatus()` to a shared util, and have every page import from there.

### 1.5 Silent Supabase failures (error never surfaced to user)

Each of these destructures `data` but drops/ignores `error`, degrading indistinguishably to "empty" on failure:

- `CartPage.tsx:84-93` — duplicate-pending-request guard query (on error, duplicate check silently passes through).
- `AdminDashboard.tsx:140-160` `fetchStats` — all stat cards silently show 0.
- `AdminAuditLogPage.tsx:63-76` — only `42P01` handled; any other error → "No audit entries yet."
- `AdminDemandsPage.tsx:341-368` `votesRes.error` never checked → every demand shows 0 votes; `handleViewVotes` (446-485) — neither `votesData` nor `usersData` errors checked.
- `DemandsPage.tsx:472` `votesRes.error` never checked (same as above); `handleViewVotes` (727-769) same gap; line 545 `void fetchDemands()` after vote, no `.catch`.
- `AdminLogisticsPage.tsx:29-40` `fetchData` — both queries fall back to `[]` with no error UI.
- `AdminNotificationsPage.tsx:41-53` `fetchSentNotifications` — silent failure → "No active notifications."
- `NotificationsPage.tsx:35-59` `fetchData` — neither `notifRes.error` nor `readsRes.error` checked; `markAsRead` (65-73) no-ops silently on error (no toast), inconsistent with `markAllAsRead` (75-93) in the same file which DOES toast.
- `StudentRequestsPage.tsx:50` — `error` destructured, never used.
- `TopBar.tsx:35-51` — unread-count queries unchecked (low risk: just hides the badge).
- `AdminPendingPage.tsx:117-121` `handleApprove` — `inventory_items` lookup unchecked; if it fails, stock isn't decremented but **"Request approved" success toast still shows**.
- `AdminAllRequestsPage.tsx:132-136` `handleMarkReturned` — same pattern, **"Item returned, inventory updated" toast shows even if the inventory update was skipped**.
- `sendLowStockAlert.ts:12-14` — `faculty_emails` query error unchecked; AND `useItems.ts`'s `toast.warning('Low stock alert sent...')` fires unconditionally even when `sendLowStockAlert` internally caught an error and returned `{success:false}`.

**Fix**: check `error` on every Supabase call; show a toast/error state distinct from "empty"; don't show a success toast for an operation whose sub-step failed.

### 1.6 Mock / non-functional features presented as real

- `pages/PurchaseOrders.tsx` — entirely local-state mock; hardcoded summary numbers (₹88,250, etc.) shown regardless of actual state.
- `pages/Suppliers.tsx` — hardcoded supplier list + fake "Recent PO History"; no Supabase.
- `pages/PendingPOs.tsx` — fully static "No pending purchase orders." stub, zero Supabase.
- `pages/Dashboard.tsx` — `invoiceChartData`/`spendData` are empty objects; an entire row is `display:none` because of this; cards 2-5 hardcoded "No data".
- `pages/LowStockAlerts.tsx` — "Run Forecast" modal shows hardcoded fake products ("MacBook Pro M3 Max", "Dell UltraSharp 32"", "Logitech MX Master 3S") with fabricated "stockout in N days", while the chart's real `forecastData` is a hardcoded empty array; "Draft PO" button does `toast.success()` with **no Supabase call**.
- `pages/ProDashboard.tsx` — `areaChartData`/`invoiceChartData`/`spendData` (lines 32-144) are 100% hardcoded, displayed beside REAL `useItems()`-derived stat cards labeled **"Live"** with no visual distinction.
- `components/dashboard/NeedsAttention.tsx` / `RecentActivity.tsx` / `StockChart.tsx` / `PriorityRestockQueue.tsx` — all static placeholders (hardcoded "PO-2024-089 Delayed" alerts with a badge count that doesn't match the array length, "No recent activity", "No movement data", "No items require restocking").
- `components/dashboard/QuickActions.tsx` — "Scan Item"/"Inventory Transfer"/"Audit" buttons just `toast.success("...initiated successfully.")` with no real action.
- `components/landing/HeroSection.tsx` — the source of the "MacBook Pro/Dell UltraSharp/Sony/Logitech" demo product names that leaked into `LowStockAlerts.tsx`'s forecast.
- `components/inventory/InventoryTable.tsx` — "Reorder History" drawer shows identical hardcoded fake history for every item; "Export Selected" button has no handler; "Delete Selected" and inline-quantity-edit only touch the React Query cache (see §0.4 / per-file below).

These collectively suggest an entire "Procurement/Pro" feature area was scaffolded from a SaaS template and never wired to real data, sitting alongside the genuinely-functional OPJU IdeaLab inventory/request system.

### 1.7 Inconsistent admin actor-attribution

- `AdminNotificationsPage.tsx`'s `handleSendNotification` (line 82) sets `created_by_email: adminEmail ?? 'admin'` — a Google-OAuth `@stockpilot.inc` admin (where `adminEmail` is `null`) gets the literal `'admin'`.
- The same file's `logAudit` (61-71) uses `user?.email ?? session?.user?.email ?? localStorage.getItem('sp-admin-email') ?? 'unknown-admin'` — a fuller chain.
- `AdminDashboard.tsx`'s `logAudit` (173-183) checks `user?.email`/`session?.user?.email` BEFORE `localStorage.getItem('sp-admin-email')`.
- `AdminSettingsPage.tsx:11` and `AdminPasswordPage.tsx:11` both do `contextAdminEmail ?? localStorage.getItem('sp-admin-email') ?? 'admin'/null` — for Google-OAuth admins this surfaces the literal string `"admin"` as their email, or an "could not determine admin email" message.

**Fix**: one shared `getAdminEmail()` util with one canonical fallback chain, used everywhere `created_by_email`/`reviewed_by`/audit actor is recorded.

### 1.8 Leftover debug code

- `hooks/useItems.ts` `useUpdateItem` — 5 `console.log` statements (lines 53, 54, 61, 66, 74) including full update payloads.
- `pages/AdminInventoryPage.tsx:405` — `console.log('Updating item:', JSON.stringify(payload))`.

### 1.9 `item.sku.toLowerCase()` null-crash risk (search filters)

`sku` is nullable per `AdminInventoryPage`'s type but typed non-null in `types/index.ts`. Bare `.toLowerCase()` calls on `item.sku` (and sometimes `item.name`) appear in: `StudentDashboard.tsx:99-100`, `FacultyDashboard.tsx:109-110`, `LowStockAlerts.tsx:52`, `InventoryTable.tsx:46`. Any item with `sku: null` throws a `TypeError` and crashes the search/filter on these pages. **Fix**: `(item.sku ?? "").toLowerCase()`.

---

## 2. Critical Security Issues

### 2.1 `src/context/AuthContext.tsx` — `signInAsAdmin` (lines 232-256)

```ts
supabase.from('admin_credentials').select('*').eq('email', trimmedEmail).eq('password', password).single()
```

- Plaintext password comparison performed via a **direct PostgREST query from the browser** — no hashing, no server-side validation.
- `select('*')` returns the password column to the client.
- For this to ever succeed, RLS on `admin_credentials` must permit `SELECT` with client-controlled `email`/`password` filters — which means the table is realistically queryable/brute-forceable directly via `/rest/v1/admin_credentials?select=*` using the public anon key, **bypassing the `.eq('password',...)` filter** entirely.
- Catch block swallows network errors and returns `false` — indistinguishable from "wrong password".

**Fix**: replace with Supabase Auth (email/password) or a server-side Edge Function that hashes (bcrypt/argon2) and never exposes `admin_credentials` to PostgREST; lock the table down with `RLS: deny all` for client roles.

### 2.2 `src/pages/AdminPasswordPage.tsx` — `handleUpdatePassword` (lines 35-58)

Same class of bug, twice in one function:

1. **Verify current password** (35-46): `.from('admin_credentials').select('email').eq('email',adminEmail).eq('password',currentPassword).maybeSingle()` — plaintext comparison via client-side query.
2. **Write new password** (49-58): `.update({ password: newPassword })` — plaintext **write** to `admin_credentials` from the browser.
3. No password strength/length validation (only non-empty + matches confirm).

If RLS permits both of these (required for the feature to work at all), **any client can read or overwrite any admin's password directly via the REST API**, fully bypassing this UI.

**Fix**: same as §2.1 — move to Supabase Auth or a server-side Edge Function with hashing; deny direct client access to `admin_credentials`.

---

## 3. Auth / Role Bugs

### 3.1 `src/pages/AuthCallback.tsx` — `'admin'`/`'banned'`/`'blocked'` not handled (lines 50-71)

The role-resolution `if/else` only checks `data?.role === 'faculty'` / `'student'`. Any other DB value (`'admin'`, `'banned'`, `'blocked'`) falls into `else` → `getDefaultRole(email)`, and line 65 explicitly does:

```ts
role = defaultRole === 'blocked' ? 'student' : defaultRole
```

**Concretely**: an admin sets a user's `user_roles.role = 'banned'`. That user signs in via Google → `AuthCallback` computes `role = 'student'`, sets `localStorage['sp-user-type']='student'`, and navigates to `/student-dashboard` — **the ban is bypassed at the primary post-login gate**. Similarly, a DB row with `role='admin'` is not routed to `/admin` here; correction depends entirely on `AuthContext`/route guards re-checking the DB later.

The `upsert(...,{onConflict:'user_id', ignoreDuplicates:true})` (82-87) does NOT overwrite the existing `'banned'`/`'admin'` DB row — the bug is purely in the **in-memory `role` variable** used for this navigation/localStorage write.

**Fix**: explicitly branch on `data?.role === 'admin' | 'banned' | 'blocked'` and route accordingly (admin → `/admin`; banned/blocked → sign out + `/signin?error=blocked`) instead of falling through to `getDefaultRole`.

### 3.2 `src/components/layout/Sidebar.tsx` — banned/blocked nav exposure (lines 111-135)

The role-filter chain has explicit branches for admin, student, and faculty, plus one denylist line (133) for non-student/faculty hiding only `/student/requests`, `/cart`, `/faculty-requests`. **Nothing hides `/inventory`, `/suppliers`, `/purchase-orders`, `/alerts/low-stock`, `/demands`, `/notifications`, `/profile`, or Dashboard for `userRole === 'banned'/'blocked'`** — these all render normally. Combined with §3.1 and §3.3, a banned/blocked user can retain a near-full student/faculty navigation experience.

**Fix**: add an explicit early return / denylist for `banned`/`blocked` (e.g., render only a "Sign Out" link, or redirect to a "your account is suspended" page).

### 3.3 `src/App.tsx` + `src/components/ProtectedRoute.tsx`

- `App.tsx:39-41` — `if (isRoleLoading) return <div className="min-h-screen bg-[#0d0a08]" />` sits ABOVE `<BrowserRouter>`, so even anonymous visitors to public routes (`/`, `/signin`, `/auth/callback`) see a blank screen until role-resolution finishes.
- `ProtectedRoute` (10-16) is **role-agnostic** — only checks `isAuthenticated`/`isLoading`. Routes using plain `ProtectedRoute` (`/dashboard`, `/pro-dashboard`, `/inventory`, `/suppliers`, `/purchase-orders`, `/purchase-orders/pending`, `/alerts/low-stock`, `/profile`, `/settings`, `/demands`) are reachable by **any authenticated user regardless of role**, including `banned`/`blocked` (whose `userRole` may still be a valid string depending on §3.1's bug).
- `FacultyRoute` (38-46) and `StudentOrFacultyRoute` (48-55) do **not** explicitly redirect `userRole === 'banned'` (unlike `StudentRoute`, which does). Currently likely masked by `!userRole` catching banned users in the normal flow, but it's an inconsistency that becomes a real gap if §3.1 is exploited (banned user ends up with `userRole==='student'`, which DOES pass `StudentOrFacultyRoute`).
- `isLoading` and `isRoleLoading` are always set together in `AuthContext` — one of the two flags is redundant/dead.

### 3.4 `src/pages/ProDashboard.tsx` — dead access-control condition + Rules-of-Hooks violation

- Line 186/192: `const isPro = user?.role === 'pro' || user?.role === 'admin' || userType === 'pro'`. `user` is the raw Supabase Auth `User`; its `.role` is the Postgres role (`'authenticated'`), **never** `'pro'`/`'admin'` — these two conditions are dead. `isPro` reduces in practice to `userType === 'pro'` (from the collided `sp-user-type` key, §1.3). This whole route appears to be unintegrated leftover template code.
- Lines 195-198 (`useState`×4) and 207-211 (`useCallback`) are declared **after** the early return `if (!isPro) return null` (line 193) — a Rules-of-Hooks violation. Should be hoisted above the `useEffect`/early-return.

---

## 4. Per-File Findings

### `src/context/AuthContext.tsx`
- `getDefaultRole()` (26-32) hardcodes personal emails as role fallbacks: `srijanmishra1669@gmail.com`→student, `mishrasrijan2305@gmail.com`→faculty (the latter is the current session user's own address — looks like dev/test hardcoding left in).
- `inferOpjuRole(email)` — fragile regex (`/^[a-zA-Z]{2}\d{2}/`) heuristic to guess student-vs-faculty for `@opju.ac.in` emails; can misclassify.
- `isAdminEmail(email)` — hardcoded `@stockpilot.inc` domain check.
- §2.1 `signInAsAdmin` — critical plaintext-password issue (see above).
- `signOut()` (261) removes localStorage key `'sp-auth-user'`, which nothing ever sets (dead cleanup code).
- `resolveSession` is invoked from both `getSession().then()` and `onAuthStateChange` — `cancelled` only guards unmount, not concurrent overlap; can cause a brief "role resolved" flash before the second call lands.

### `src/context/CartContext.tsx` — clean
- localStorage persistence wrapped in try/catch; `clearCartRef` avoids circular import with AuthContext. `cartCount = cart.length` (distinct line items, not total units) — note only if a "total units" badge is expected elsewhere.

### `src/context/UserTypeContext.tsx`
- See §1.3 — shares `localStorage['sp-user-type']` with `AuthContext`'s `UserRole`, with incompatible value sets (`'free'|'pro'|null` vs `'student'|'faculty'|'admin'|'blocked'|'banned'|null`).

### `src/hooks/useItems.ts`
- §1.8 — 5 leftover `console.log`s in `useUpdateItem`.
- §1.1 — null-coercion bugs #1/#2 in `useCreateItem`/`useUpdateItem`'s low-stock-alert trigger.
- §1.5 — `sendLowStockAlert` return value never checked before the "alert sent" toast.
- `useCreateItem`/`useUpdateItem`/`useDeleteItem` all correctly `invalidateQueries(['items'])` — GOOD, but `AdminInventoryPage.tsx` bypasses these hooks entirely (raw Supabase calls), so admin mutations there don't invalidate `['items']`.

### `src/hooks/useCategories.ts` — clean

### `src/lib/supabaseClient.ts`, `queryClient.ts`, `utils.ts` — clean
- `queryClient.ts` global defaults: `staleTime: 2*60*1000, retry: 1`; `useItems.ts` overrides with `staleTime:0, refetchOnMount:'always'`.

### `src/lib/sendLowStockAlert.ts`
- Hardcoded fallback email `lab.incharge@opju.ac.in` (line 16) — should be config/env.
- `??` fallback only triggers on `null`/`undefined`; if `faculty_emails` table exists but is **empty**, `toEmails=[]` and the alert is sent to nobody — the fallback never helps in this realistic case.
- `supabase.from('faculty_emails').select('email')` (12-14) — `error` not checked.
- `catch (error) {...}` — caught error not logged (only a static string).

### `src/types/index.ts` — central types, out of sync with real schema
- See §1.4 for the full breakdown (`InventoryItem.sku/category_id/supplier/unit_price/status/reorder_threshold` nullability mismatches vs `AdminInventoryPage`'s local type; `category` vs `categories` field-name drift; `IssueRequest` missing `physical_status`/`issued_at`/`returned_at`; `reviewed_by`/`review_note` should be `string | null` not `string | undefined`).

### `src/main.tsx` — clean
- Provider order: `QueryClientProvider > AuthProvider > CartProvider > UserTypeProvider > App`.

### `src/App.tsx` — see §3.3
- `/profile` and `/settings` both render `<Profile />` (duplicate route mapping, likely intentional alias).

### `src/components/ProtectedRoute.tsx` — see §3.3

---

### `src/pages/AdminDashboard.tsx` (`/admin`)
- `RoleType = 'student'|'faculty'|'admin'|'banned'` (15) is **missing `'blocked'`** vs `AuthContext`'s `UserRole`:
  - Line 515: `(row.role as RoleType) ?? 'student'` — unsound cast if `row.role==='blocked'`.
  - `RoleBadge`'s `cls`/`label` records (51-62) have no `'blocked'` key → renders `undefined` className/text for blocked users.
  - Actions column (540-588): `'blocked'` falls to the final `else` → offers "Revoke Faculty" — wrong action for a blocked user.
- `fetchStats` (140-160) — errors caught and swallowed ("keep zero defaults"); admin sees all-zero stats with no error indicator (§1.5).
- `logAudit` (173-183) — actor-fallback ordering inconsistent with `AdminNotificationsPage`'s (§1.7), though functionally OK.
- `handleAddFaculty` (289-340) — checks for `PGRST116` after `.maybeSingle()`, which never returns that code (that's a `.single()` error) — likely dead/vestigial code.
- No pagination on the user list (scalability only).
- Page itself doesn't re-check `userRole==='admin'`/`isRoleLoading` — relies entirely on the route guard.

### `src/pages/AdminInventoryPage.tsx` (`/admin/inventory`)
- Defines its own local `InventoryItem`/`ItemFormData`, diverging from `types/index.ts` (§1.4).
- Uses raw `supabase.from('inventory_items')` + local `useState`, **not** `useItems()`/React Query:
  - `handleSubmitItem`/`handleDelete`/`handleCsvFile` never call `invalidateQueries(['items'])` — other pages using `useItems()` show stale data after admin edits here until remount.
  - Bypasses `sendLowStockAlert` entirely — inconsistent vs. `useItems.ts` mutations.
- Line 405 — leftover `console.log('Updating item:', ...)` (§1.8).
- `handleCsvFile` (473-543) — naive `line.split(',')` CSV parsing breaks on quoted fields containing commas (e.g. `"Acme, Inc."`); sequential `await` inserts in a for-loop; failed rows only counted in `skipped++` with no detail.
- `getCatName` (55-59) — if Supabase ever returns an array of >1 related category, silently picks `raw[0]`.
- No `userRole==='admin'` self-check — relies on route guard.

### `src/pages/AdminPendingPage.tsx` (`/admin/pending`)
- `['issue_requests']` queryKey + `refetchInterval:10000, refetchOnWindowFocus:true` — see §1.2 for the cross-file collision/inconsistency.
- `handleApprove` (99-150):
  - `inventory_items.quantity/reorder_threshold` lookup (117-121) has no error check; on failure the quantity-decrement is silently skipped but **"Request approved" toast still fires** (§1.5).
  - Read-modify-write on `inventory_items.quantity` (124-132) — race condition under concurrent approvals (lost update); should use an atomic SQL expression/RPC.
  - Doesn't call `sendLowStockAlert` despite computing `newStatus` (low_stock/out_of_stock) — inconsistent with `useItems.ts`.
  - Doesn't invalidate `['items']` after changing `inventory_items` — other pages stay stale.
  - `reviewed_by: user?.id ?? null` (110) — `null` for local-admin-credential sessions (loses attribution in `issue_requests`, though `audit_log` separately captures `actorEmail`).
- `handleReject` (154-183) — correctly invalidates `['issue_requests']`; try/catch+toast present. OK.

### `src/pages/AdminAllRequestsPage.tsx` (`/admin/requests`)
- `['issue_requests']` + `refetchOnWindowFocus:true`, no `refetchInterval` — 3rd distinct config for the same key (§1.2).
- `select('*')` with no `.limit()` (70-76) — fetches the whole table.
- `handleMarkReturned` (121-160) — same anti-patterns as `AdminPendingPage.handleApprove`: unchecked `inventory_items` lookup (132-136) → **misleading "Item returned, inventory updated" toast even on silent failure**; read-modify-write race (138-147); no `['items']` invalidation; no `sendLowStockAlert`.
- Yet another local `IssueRequest` redefinition (16-32) (§1.4).

### `src/pages/AdminAuditLogPage.tsx` (`/admin/audit-log`)
- `select('*').order(...).limit(20)` (57-61) — has a limit; could narrow columns (low priority).
- Error handling (63-76) only handles `42P01`; any other error silently leaves `auditLog=[]` → "No audit entries yet." indistinguishable from a real-empty table (§1.5).

### `src/pages/AdminDemandsPage.tsx` (`/admin/demands`, "IdeaBoard" admin)
- Local `Demand` type (13-28) mixes real DB columns with client-computed fields (`vote_count` etc.) without distinguishing them.
- `fetchDemands` (341-368) — `votesRes.error` never checked (§1.5) → every demand silently shows 0 votes.
- Vote tallying (357-359) — O(demands×votes) client-side filtering; should be a SQL view/RPC.
- Realtime subscription (373-380) — full `fetchDemands()` refetch on any `demands`/`demand_votes` change, no debounce.
- `handleDelete` (428-444) — deletes `demand_votes` then `demands` as two separate non-transactional calls; partial failure leaves an orphaned `demands` row.
- `handleViewVotes` (446-485) — neither `demand_votes` nor `user_roles` query errors checked (§1.5); on `user_roles` failure, faculty voter emails fall back to raw UUIDs.
- Plain `useState`/`useEffect` (not React Query) — inconsistent with `AdminPendingPage`/`AdminAllRequestsPage`.
- `voter_role !== "faculty"` (358) treats `null` `voter_role` as "student".

### `src/pages/AdminLogisticsPage.tsx` (`/admin/logistics`)
- `useState<any[]>([])` for `items`/`requests` (22-23) — `any`, should reuse shared types.
- `_loading` state (24) is set but **never rendered** — stat cards/charts show `0`/`₹0.00`/`0%`/empty before fetch resolves (§ "loading state missing").
- `fetchData` (29-40) — no error handling, falls back to `[]` silently (§1.5).
- `stats.lowStock` (46-48) — `(i.quantity||0) <= (i.reorder_threshold||0)` — null-coercion bug #4 (§1.1).
- **`movementData` bucketing bug (70-92)**: the LAST bucket's `start = now`, `end = now + interval` (i.e., in the future); the filter `d >= start && d < end` is essentially never true for real (past) data, so the rightmost "Inventory Movement" bar is always 0 and today's activity is mis-attributed to the previous bucket's date label.
- Manual `useEffect`+`useState`, no `initRef` guard — yet another (4th) data-fetching pattern among admin pages; double-fires under React 18 StrictMode dev (harmless but inconsistent).
- GOOD: `select("quantity, reorder_threshold, unit_price")` / `select("status, created_at, quantity_requested")` — column-scoped, unlike many `select('*')`s elsewhere.

### `src/pages/AdminNotificationsPage.tsx` (`/admin/notifications`)
- `fetchSentNotifications` (41-53) — error not checked (§1.5) → "No active notifications." on failure.
- §1.7 — actor-attribution inconsistency (`created_by_email: adminEmail ?? 'admin'` vs `logAudit`'s fuller chain, in the same file).
- No `.limit()` on the sent-notifications list (41-53) — unbounded growth.
- Confirm dialogs for send/delete (245-298) — GOOD, prevent accidental double-actions.
- Client-side `maxLength`/`.slice` caps on title/body (162, 175) — no indication of server-side enforcement.

### `src/pages/AdminPasswordPage.tsx` (`/admin/settings/password`) — see §2.2
- `adminEmail = contextAdminEmail ?? localStorage.getItem('sp-admin-email')` (11) — for Google-OAuth `@stockpilot.inc` admins (both null), shows "Could not determine logged-in admin email" with no explanation that this page is local-credential-admin-only.

### `src/pages/AdminSettingsPage.tsx` (`/admin/settings`)
- `adminEmail = contextAdminEmail ?? localStorage.getItem('sp-admin-email') ?? 'admin'` (11) — Google-OAuth admins see the literal string `"admin"` as their "Email Address" (87-99).
- Hardcoded "AD" avatar initials (45-47) — cosmetic.

---

### `src/pages/StudentDashboard.tsx`
- Local `IssueRequest` redefinition (17-28), no `physical_status`/`issued_at`/`returned_at` (§1.4).
- Line 61: `useState<any>(null)` for `modalItem` — should be `InventoryItem | null`.
- Lines 93/97/107/270: unnecessary `(items as any[])` casts over an already-typed `InventoryItem[]`.
- Lines 99-100: `item.sku.toLowerCase()` null-crash risk (§1.9).
- **"Items to Return" stat mismatch vs FacultyDashboard**: here, `status==="approved" && return_deadline` truthy; in `FacultyDashboard`, `effectivePhysicalStatus(r)==="issued"` — two different definitions of the same metric, likely producing different counts for conceptually-equivalent data.
- Missing loading state: `useItems()`/`myRequests` both default to `[]`, so stat cards show `0` and "Browse Inventory" shows "No items found." before data arrives.
- Missing error state for both queries.
- Line 272: `item.reorder_threshold ?? 0` — correctly uses `??` (the one place that does), but inconsistent with the rest of the codebase's `||`/bare patterns.
- §1.2 — `['issue_requests']` key collision (line 69).

### `src/pages/FacultyDashboard.tsx`
- §1.2 — same `['issue_requests']` collision (line 78).
- Local `IssueRequest` redefinition (19-31) WITH `physical_status`; `effectivePhysicalStatus()` helper (35-37) not shared anywhere else.
- Line 70: `useState<any>(null)` for `modalItem`.
- Lines 103/107/277: `(items as any[])` casts.
- Lines 109-110: `item.sku.toLowerCase()` null-crash risk (§1.9).
- Line 94: `totalItemsCount = (items as any[]).length` shows "Total Items in Lab: 0" while loading.
- No error state for either query.

### `src/pages/FacultyRequestsPage.tsx` (`/faculty-requests`)
- §1.2 — `['issue_requests','faculty-mine',facultyEmail]` is a separate cache entry from `FacultyDashboard`'s `['issue_requests']` for the same data; no `staleTime`/`refetchOnMount`/`refetchInterval` set (3rd config).
- Lines 100, 137: `items as any[]` casts.
- Line 236: `extendedItems.find(...)?.quantity ?? 999` — magic-number fallback masking a "item not found" bug if it ever triggers.
- **Line 97**: `qty = Math.min(Math.max(1, Number(reqQty) || 1), 100)` — caps at 1-100 but **never validates against `selectedItem.quantity`** (actual stock). A faculty member can request more than is in stock; if approved via `AdminPendingPage`'s read-modify-write, this can drive `inventory_items.quantity` negative.
- No `error` from `useQuery` shown — falls back to "No requests yet." on failure (§1.5).
- GOOD: `handleSubmit` (95-129) catches+toasts errors, has `submitCooldown`(3s)+`submitting` double-submit protection — one of the best-handled mutations in the app.

### `src/pages/StudentRequestsPage.tsx` (`/student/requests`)
- §1.2 — 3rd/4th distinct data-fetching strategy (manual `useState`/`useEffect`, no React Query).
- Line 50: `if (!error && data) setRequests(...)` — `error` destructured, never used (§1.5).
- GOOD: imports the **shared** `IssueRequest` from `'../types'` — only page that does.
- `CartPage`'s `['issue_requests','mine',studentEmail]` invalidation has no subscriber here — confirmed dead (§1.2).
- Line 181: `{req.purpose}` has no `|| "—"` fallback (FacultyRequestsPage does).
- No `.limit()` on the query.

### `src/pages/AuthCallback.tsx` — see §3.1
- Lines 6-18: `getDefaultRole()` is a near-verbatim copy of `AuthContext`'s (including the same hardcoded personal emails) — must be hand-kept-in-sync or will diverge.
- Lines 38-47: `isAllowed` allowlist hardcodes `@opju.ac.in` + 2 personal Gmail addresses, shipped in the client bundle.
- Lines 110-115: 500ms-interval session poll, max 10 attempts (5s) — reasonable.

### `src/pages/DemandsPage.tsx` (`/demands`, "IdeaBoard")
- GOOD: `loading` (419) and `dbReady` (420, handles `42P01`) both implemented and rendered — a model for loading/empty-table UX.
- Line 472: `votesRes.error` never checked (§1.5) — every demand shows 0 votes silently.
- Lines 475-478: O(demands×votes) client tallying.
- Lines 498-505: realtime subscription does a full refetch on any `demands`/`demand_votes` change, no debounce.
- `submitVote` (509-567): optimistic update + rollback is GOOD, but the `setTimeout(...,2000)` (560-566) unconditionally clears the voting lock regardless of whether `fetchDemands()` (545, no `.catch`) has completed — risk of a duplicate vote on slow connections if not protected by a DB unique constraint.
- `handleDelete` (698-723) — non-transactional 2-step delete (`demand_votes` then `demands`), same orphan risk as `AdminDemandsPage`.
- `handleViewVotes` (727-769) — neither `votesData` nor `usersData` errors checked (§1.5).
- Line 602: `created_by_email: user?.email ?? ""` — empty-string fallback.
- Lines 609-615/641-647/676-685/709-715: all `audit_log` inserts wrapped in silent try/catch.
- Lines 736/750/754: multiple unchecked `as` type assertions on raw Supabase results.
- Lines 414-415: `isFaculty`/`isAdmin` derived from `userRole` without checking `isRoleLoading` — brief under-privileged UI flash (not a security hole, but matches the audit's "rendering before isRoleLoading is false" criterion).

### `src/pages/NotificationsPage.tsx` (`/notifications`)
- §1.5 — `fetchData` (35-59) doesn't check `notifRes.error`/`readsRes.error`; `markAsRead` (65-73) silently no-ops on error while `markAllAsRead` (75-93) toasts on both outcomes — inconsistent within one file.
- No realtime subscription — new admin notifications require a navigate-away-and-back to appear.
- No `.limit()` on the notifications query.

### `src/pages/Profile.tsx` (`/profile`, `/settings`)
- **Line 44**: `useState({ master:true, lowStock:true, poDelays:true, weeklyReports:false })` — the entire "Notification Preferences" tab (218-243) is local-only state, never read from or written to Supabase. Toggling does nothing persistent; resets on refresh.
- `handleSave` (53-81) — correctly scoped `update({display_name}).eq('user_id', user.id)`, errors handled with toast. GOOD.
- "OPJU IdeaLab" hardcoded as org name (116/124) — cosmetic.

### `src/pages/Inventory.tsx` (`/inventory`) — clean
- `isLoading`/`error` from `useItems()` properly handled with skeleton + error UI — model for other pages.
- `userRole === 'admin'` gate for "Add Item" — correct pattern.

### `src/pages/Landing.tsx` — trivial composition only, no logic.

### `src/pages/Login.tsx` — DEAD/ORPHANED
- Email/password inputs (37-49) have no `value`/`onChange`/state.
- "Sign In" (52-57) is a plain `<Link to="/dashboard">` — no auth call at all.
- Duplicate (3rd) re-implementation of `stockpilot-theme` toggle logic.
- Grep-confirmed: not referenced by `App.tsx` routes. **Recommend deletion.**

### `src/pages/PurchaseOrders.tsx`, `Suppliers.tsx`, `Dashboard.tsx`, `PendingPOs.tsx`, `LowStockAlerts.tsx`, `ProDashboard.tsx` — see §1.6 / §1.1 / §3.4 above for the substantive findings. Additionally:
- `PurchaseOrders.tsx:39-41` / `Suppliers.tsx:75-77` — `if (userRole === "faculty") return <Navigate to="/faculty-dashboard" replace />` with **no `isRoleLoading` guard** — could redirect incorrectly during initial auth load (and doesn't block `student` at all, despite `ProtectedRoute` allowing students through, §3.3).
- `SignIn.tsx`:
  - `handleAdminSignIn` (35-47): `setUserType('admin' as any)` (§1.3) and `window.location.href = '/admin'` (43) — full page reload instead of `navigate()`.
  - `errorParam === 'blocked'` URL-param handling (22-27) present.
- `LandingPage.tsx`: hardcoded "Live · 1,240 components tracked" badge (83) presented as live data; "Student Login" and "Faculty Login" buttons (94-119, 122-147) both just `navigate("/signin")` despite different copy.

### `src/pages/CartPage.tsx` (`/cart`)
- §1.2 — invalidation-key analysis.
- Live stock check (55-81) and batch insert (108-123) both have proper error handling — GOOD.
- Duplicate-pending guard (84-93) — `error` not checked (§1.5); on transient DB error, duplicate-request prevention silently fails open.
- Audit log insert (126-135) — non-fatal try/catch, GOOD pattern.
- `submitCooldown` (3s, 152-153) + `disabled={submitting||submitCooldown||cart.length===0}` (338) — correct double-submit prevention. GOOD.

---

### `src/components/common/*` (PageHeader, Skeleton, EmptyState, SectionCard) — clean, pure presentational.

### `src/components/dashboard/*`
- See §1.1 (`InventoryHealth.tsx`), §1.6 (`NeedsAttention`/`RecentActivity`/`StockChart`/`PriorityRestockQueue`/`QuickActions`).
- `StatCard.tsx` — clean, reusable, handles `isLoading` via `Skeleton`. GOOD.

### `src/components/inventory/LowStockBadge.tsx` — DEAD/UNUSED
- Not imported anywhere (grep-confirmed). Its `quantity >= threshold` check would also be broken for `threshold===0/null` if it were ever wired up.

### `src/components/inventory/AddEditItemModal.tsx` — mostly GOOD
- zod + react-hook-form + `useCreateItem`/`useUpdateItem` (which invalidate `['items']`); proper try/catch+toast; `isPending` disables form and shows spinner. Model pattern.
- `reorder_threshold: z.number().int().nonnegative()` (17) is required/non-null — this form can't produce the `null` rows causing §1.1, but also can't fix existing null rows except by setting some number.
- No `unit_price` field — items created here always leave `unit_price` at its default (likely `null`), so `ProDashboard`'s "Total Inventory Value" undercounts new items.

### `src/components/inventory/InventoryTable.tsx` (used only by `Inventory.tsx`) — MAJOR ISSUES
- §1.1 — best (line 51-55) AND a buggy (line 377/380) low-stock check coexist in this one file.
- Line 53: `item.status === 'low_stock'` — `status` is only ever written by `AdminInventoryPage`'s separate update path; items edited via this page's `AddEditItemModal` never set it, so it's stale/null for them (two parallel, non-synced inventory-edit UIs).
- Line 46: `item.sku.toLowerCase()` null-crash risk (§1.9).
- Lines 59-68: sort comparator's `aVal===undefined` check (63) doesn't catch `null` for nullable string fields like `supplier` — minor sort-order quirk.
- **Lines 100-106 `handleBulkDelete`** (admin-only): `queryClient.setQueryData(['items'], old => old.filter(...))` — **only mutates the local cache, no Supabase `.delete()`**. "Deleted N items" toast shown; rows reappear on next refetch (`staleTime:0`/`refetchOnMount:'always'`). Fix: call `useDeleteItem()` per id or `.delete().in('id', selectedRows)`.
- Line 259-261: "Export Selected" — no `onClick` handler at all.
- **Lines 108-117 `saveQty`** (NOT admin-gated, line 360 has no `userRole==='admin'` check unlike the Actions column): same fake-cache-only-update pattern as bulk delete, but for inline quantity edits — reachable by students/faculty, shows fake "Quantity updated" toast, reverts on next refetch. Fix: gate to admin AND call `useUpdateItem()`.
- Lines 206-220: "Reorder History" drawer — identical hardcoded fake entries for every item.
- Lines 318-319: progress-bar `fillPct=(quantity/50)*100` (hardcoded denominator, ignores `reorder_threshold`) and `barColor` keyed off absolute quantity (`<10`/`<20`) — can visually contradict the adjacent "Status" badge (which correctly uses this item's `reorder_threshold`).
- `key={i}`/`key={idx}` on static arrays (pagination buttons line 424, reorder-history rows line 213) — low-risk index-as-key.
- GOOD: `userRole==='admin'` correctly gates bulk-action bar (254), Actions column (304/383).

### `src/components/layout/AppShell.tsx` — clean
- Theme persistence (`stockpilot-theme`) wrapped in try/catch for read+write.

### `src/components/layout/TopBar.tsx`
- Line 15: `isPro: _isPro` — destructured, unused, dead prop.
- §1.5 — unread-notification queries (35-51) don't check errors (low risk — just hides the badge). Correctly column- and user-scoped.
- 60s polling with proper `clearInterval` cleanup; badge independent of `NotificationsPage.markAsRead` (up to 60s lag).

### `src/components/layout/Sidebar.tsx` — see §3.2
- `navItems` (22-42) — single flat array with intentionally duplicate labels for admin/non-admin variants ("Inventory" ×2, "IdeaBoard" ×2, "Notifications" ×2, "Settings" ×2, "My Requests" ×2), entirely dependent on the per-item filter chain to avoid showing both/neither.
- GOOD: `if (isRoleLoading) return null; if (!userRole) return null;` (79-80); `key={path}` stable keys.

### `src/components/landing/*`
- `HeroSection.tsx` — source of the "MacBook Pro/Dell UltraSharp/Sony/Logitech" demo products (§1.6); `onClick={() => navigate('/signin?plan=free')}` — `?plan=free` is never read by `SignIn.tsx` (dead query param).
- `LandingNav.tsx` — "Docs" link `href="#docs"`; no element with `id="docs"` exists anywhere (grep-confirmed) — link is a no-op.
- `FeaturesSection.tsx`, `WorkflowSection.tsx`, `CTASection.tsx`, `LandingFooter.tsx` — pure static marketing content, `LandingFooter`'s link columns all `href="#"`. Clean, no logic issues.

---

## 5. Suggested Fix Priority (not yet implemented — report only)

1. **Security**: rework `admin_credentials` auth (§2.1, §2.2) — highest severity, exposes credentials via REST.
2. **Auth bypass**: fix `AuthCallback.tsx` role handling (§3.1) and `Sidebar.tsx`/`ProtectedRoute` gaps for banned/blocked (§3.2, §3.3).
3. **Data integrity**: fix `InventoryTable.tsx`'s fake bulk-delete and inline qty-edit (§0.4) — these can mislead admins/users about real inventory state.
4. **Shared `isLowStock()` helper** + fix `types/index.ts` nullability — resolves ~12 inconsistent/buggy implementations at once (§1.1).
5. **React Query key consolidation** for `issue_requests` (§1.2) and the `sp-user-type` localStorage collision (§1.3).
6. **Type consolidation** (`InventoryItem`/`IssueRequest`) and removal of duplicate local interfaces (§1.4).
7. Silent-failure cleanup (§1.5), debug-log removal (§1.8), dead-code removal (`Login.tsx`, `mockData.ts`, `LowStockBadge.tsx`, `'sp-auth-user'`).
8. Decide the fate of the mock "Procurement/Pro" feature area (§1.6) — either build it out or remove/clearly-label it as a demo.
