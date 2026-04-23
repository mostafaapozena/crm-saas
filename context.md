# Project Context — CAI2RUS Business OS

---

## 🗓 Navigation Log — Latest Update: 2026-04-21 (Session L — i18n Completion)

### What Changed (2026-04-21 — Session L — Translation ~100% Completed)

**Translation status: COMPLETE across all pages**

#### Pages fully translated this session:

**`frontend/app/products/page.js`** — Was partially translated (Navbar only). Now fully translated:
- StatCard labels, search placeholder, filter dropdowns (All Categories, All Status, Active/Inactive)
- Table headers (Name, SKU, Barcode, Category, Price, Cost, Stock, Status, Actions)
- `StatusBadge` component now uses `t('common.active')` / `t('common.inactive')`
- Action buttons (Edit, Delete), modal titles, all form labels/placeholders/buttons
- Error messages, delete confirm dialog — all use `t()` keys

**`frontend/app/inventory/page.js`** — Was partially translated (Navbar only). Now fully translated:
- `StockStatusBadge` component uses `t('pos.stock_status_low')` / `t('pos.stock_status_ok')`
- All StatCard labels, tab labels (Inventory / Warehouses / Alerts)
- Filter dropdowns, "Low Stock Only" button
- All table headers across 3 tabs (inventory, warehouses, alerts)
- Empty states, Adjust button, warehouse products count, deficit display
- All modal titles, form labels, placeholders, buttons, error messages

**`frontend/app/pos-reports/page.js`** — Was 0% translated. Now fully translated:
- Added `useLocale` import; header uses `t()` keys
- TAB_KEYS kept as internal values; TAB_LABELS map provides translated display
- All StatCard labels, SectionTitle text, DataTable column headers
- Date picker labels, empty state messages
- All 4 tabs: Sales, Inventory, Profit, Delivery

**`frontend/app/activity/page.js`** — Was partially translated (structure only). Now fully translated:
- Module filter buttons show translated names: `t('activity.module_${m}')`
- Log entry module labels also translated
- Arabic translations: leads→العملاء المحتملين, deals→الصفقات, clients→العميل, projects→المشروع, tasks→المهام, finance→المالية

#### Translation files updated:
- **`frontend/lib/translations/en.json`** — Added 20 new keys:
  - `pos`: stock_status_low/ok, product/category required error messages, adjust/transfer/warehouse error messages, units_suffix
  - `activity`: module_leads, module_deals, module_clients, module_projects, module_tasks, module_finance
- **`frontend/lib/translations/ar.json`** — Same 20 keys added in Arabic

#### Current Translation Status:
| Page | Status |
|---|---|
| Products | ✅ 100% translated |
| Inventory | ✅ 100% translated |
| POS Reports | ✅ 100% translated |
| Activity Log | ✅ 100% translated (module names now in Arabic) |
| All other pages (Dashboard, CRM, Finance, etc.) | ✅ Previously completed |

#### Next Milestone
- Fix `runAllocation` idempotency (Bug #3 from Session D)
- Wire POS sales → Finance (`CashFlowEntry` on sale completion)
- Seed POS data (warehouses + products)

---

## 🗓 Navigation Log — Latest Update: 2026-04-20 (Sessions I–K — Light Mode Hardening + P&L Fix)

### What Changed (2026-04-20 — Session I — Light Mode CSS Improvements)

- **`frontend/app/globals.css`** — Light theme CSS variable block improved:
  - `--text-secondary: #374151` (was `#64748b` — too low contrast)
  - `--text-muted: #6B7280` (was `#334155` — wrong value for light)
  - Added `--brand-blue: #2563EB` in light theme (softer primary for light backgrounds)
  - Structural rules added:
    - `[data-theme="light"] aside` → `background: #ffffff; box-shadow: 1px 0 0 #E5E7EB` — sidebar differentiates from `#F8FAFC` page background
    - `[data-theme="light"] nav a.transition-all:hover` → subtle blue tint hover
    - `[data-theme="light"] .hover\:bg-slate-700:hover` → `#E5E7EB` ghost button hover
  - Missing Tailwind class overrides added: `bg-slate-500/600`, `bg-slate-800/20/30`, `border-slate-600`, `border-slate-800/60`

### What Changed (2026-04-20 — Session J — Mass Inline Style Consistency Fix)

**Root cause identified:** Inline `style` props with hardcoded dark hex values cannot be overridden by CSS class rules (CSS specificity). 372 lines across 29 page files were affected.

**Fix applied via Node.js script across 29 files:**
- `background: '#0D0E1A'` → `'var(--bg)'`
- `background: '#111827'` → `'var(--surface-2)'`
- `background: '#1A2035'` → `'var(--surface)'`
- `background: '#0f172a'` / `'#1e2640'` / `'#1e293b'` → appropriate CSS vars
- `border: '1px solid #334155'` and `borderColor: '#334155'` → `'var(--border)'`
- `color: '#64748b'` → `'var(--text-secondary)'`
- `color: '#94a3b8'` → `'var(--muted)'`
- `color: '#fff'` / `'#ffffff'` on non-brand-background elements → `'var(--text)'`
- **Protected:** All accent/brand backgrounds (`#004AFF`, `#10b981`, `#ef4444`, `#C9FC0D`) and `color: '#fff'` on those backgrounds — intentional and correct

**Files changed (29):** activity, dashboard/ceo, dashboard, dashboard/projects, deliveries, finance/allocation, finance/business-units, finance/cash-flow, finance/cogs, finance/expenses, finance/fixed-costs, finance/invoices, finance/page, finance/payments, finance/payroll, finance/pnl, finance/reports, inventory, login, marketing/analytics, marketing/page, marketing/[id], notifications, pos, pos-reports, procurement, products, projects/milestones, purchases

### What Changed (2026-04-20 — Session K — P&L Page Title Visibility Fix)

**Issue:** Section title labels (Total Revenue, Gross Profit, Total Expenses, Net Profit) were invisible in Light Mode — the `Row` component used hardcoded `color: '#ffffff'` on bold labels.

**Fix applied in `frontend/app/finance/pnl/page.js`:**
- `Row` component label: `color: bold ? '#ffffff' : '#94a3b8'` → `color: bold ? 'var(--text)' : 'var(--muted)'`
- `Row` component value fallback: `bold ? '#ffffff' : '#64748b'` → `bold ? 'var(--text)' : 'var(--text-secondary)'`
- `<h2>P&L Statement</h2>`: `text-white` class → `style={{ color: 'var(--text)' }}`
- `<h2>6-Month P&L Trend</h2>`: `text-white` class → `style={{ color: 'var(--text)' }}`
- Accent colors on values (`#004AFF`, `#10b981`, `#ef4444`, `#C9FC0D`) left untouched — correct on both themes

#### Current Running State (2026-04-20 — after Sessions I–K)
- **Backend**: http://localhost:5000 ✅
- **Frontend**: http://localhost:3003 ✅
- **Light Mode**: ✅ Fully consistent — sidebar, cards, modals, all 29 page files, P&L statement

#### Light Mode Status
| Area | Status |
|---|---|
| CSS variable tokens | ✅ Correct contrast for both themes |
| Sidebar structural differentiation | ✅ White sidebar on `#F8FAFC` background |
| Tailwind class overrides (globals.css) | ✅ Comprehensive — text, bg, border, dividers, named-hex cards |
| Inline `style` prop overrides (29 pages) | ✅ All hardcoded dark hex values replaced with CSS vars |
| P&L page titles | ✅ Fixed — `var(--text)` on all section labels |
| Brand/accent colors | ✅ Protected — unchanged on both themes |

#### Next Milestone
- Fix `runAllocation` idempotency (Bug #3 from Session D — duplicate entries on repeat run)
- Wire POS sales → Finance (`CashFlowEntry` on sale completion)
- Seed POS data (warehouses + products)

---

## 🗓 Navigation Log — Latest Update: 2026-04-20 (Session H — WhatsApp Field + Sidebar Active State Root Fix)

### What Changed (2026-04-20 — Session H)

#### Part 1 — WhatsApp Phone Field on Clients

- **`backend/prisma/schema.prisma`** — Added `whatsapp_phone String?` to `Client` model.
- **`npx prisma db push`** — Column added to `clients` table in `dev.db`; Prisma Client regenerated.
- **`backend/src/controllers/clients.js`** — `createClient` and `updateClient` both now accept `whatsapp_phone`; spread into `data` objects alongside `phone`.
- **`frontend/app/clients/page.js`** — `EMPTY_FORM` includes `whatsapp_phone: ''`; `openEdit` populates it; form has a new **WhatsApp Phone** `Input` field (optional, below phone/email row); card display shows WhatsApp number with a green `MessageCircle` icon when present.

#### Part 2 — Sidebar Active State Root Fix

**Root cause:** `/projects/milestones` starts with `/projects/`, so the old `pathname.startsWith(item.href + '/')` logic activated both **Projects** and **Milestones** simultaneously.

**Fix applied in `frontend/components/Sidebar.js`:**
- Removed the inline, hard-to-maintain active condition from the render loop.
- Added module-level `ALL_HREFS` (flat array of every nav href) and `EXACT_ONLY` set for items whose children all have their own nav entries.
- Introduced `isActive(pathname, href)` helper:
  1. Exact match → always active.
  2. `EXACT_ONLY` items → never prefix-match.
  3. Prefix match (`href + '/'`) → only if **no** more-specific nav item's href also matches the current pathname.
- This correctly handles: `/projects/milestones` → only Milestones active; `/projects/123` → only Projects active; `/marketing/analytics` → only Analytics active.
- Render loop simplified to `const active = isActive(pathname, item.href)`.

#### Current Running State (2026-04-20 — after Session H)
- **Backend**: http://localhost:5000 ✅
- **Frontend**: http://localhost:3003 ✅
- **Clients module**: ✅ WhatsApp field supported end-to-end
- **Sidebar**: ✅ Single-item activation guaranteed — no double-active bug

#### Next Milestone
- Client communication integration (WhatsApp API — send messages directly from client card)
- Fix `runAllocation` idempotency (duplicate cost allocation entries — see Session D bugs)
- Wire POS sales → Finance (`CashFlowEntry` on sale completion)

---

## 🗓 Navigation Log — Latest Update: 2026-04-20 (Session G — White Screen Fix + Theme System Hardening)

### What Changed (2026-04-20 — Session G)

#### Root Cause Identified
- **White screen** appeared after theme system was introduced because the app was defaulting to `light` mode (from a prior `localStorage.theme = 'light'` value), and hardcoded Tailwind dark-mode classes (`text-white`, `text-slate-3xx`, `bg-slate-8xx`) became invisible on the light background.
- Secondary cause: the broad `*, *::before, *::after { transition }` rule animated the background from browser-default white to dark on every cold load, producing a visible flash.

#### Fixes Applied

**`frontend/app/globals.css`**
- Added `html, body { background: var(--bg, #0D0E1A) !important; color: var(--text, #ffffff) !important; }` — forces base styles with `!important` so no Tailwind utility or inline style overrides them.
- Added comprehensive `[data-theme="light"]` override block for all hardcoded dark Tailwind classes used in page content:
  - `.text-white`, `.text-slate-300/400/500/600` → mapped to dark-on-light equivalents
  - `.bg-slate-700`, `.bg-slate-800`, `.bg-slate-800/40`, `.bg-slate-800/50` → light surface colors
  - `.border-slate-700`, `.border-slate-800` → light border colors
  - `.bg-[#1a2035]`, `.bg-[#111827]`, `.bg-[#0a0e1a]`, `.bg-[#0d1424]` → `#ffffff`
  - `.divide-slate-800/50` dividers → light-mode equivalent
- Gated the transition rule with `html:not(.no-transition)` so transitions only run after the anti-flicker script removes the class — eliminates the background flash on cold load.

**`frontend/app/layout.js`** (already in place, verified)
- Inline blocking script defaults to `'dark'` (not `prefers-color-scheme`); adds `.no-transition` class → removed after 1 ms via `setTimeout`.

**`frontend/hooks/useTheme.js`** (already in place, verified)
- `useState('dark')` default; reads `localStorage` in `useEffect` — SSR-safe, no hydration mismatch.

**`frontend/components/ClientLayoutWrapper.js`** (already in place, verified)
- Both spinner and layout shell use `style={{ background: 'var(--bg, #0D0E1A)' }}` with explicit fallback — no Tailwind arbitrary class.

#### Current Running State (2026-04-20 — after Session G)
- **Backend**: http://localhost:5000 ✅
- **Frontend**: http://localhost:3003 ✅ (ports 3000–3002 occupied by stale processes; fresh server started on 3003)
- **Theme system**: ✅ Hardened — dark default, no flash, light mode fully readable

#### Theme System Status
| Feature | Status |
|---|---|
| Dark mode (default) | ✅ |
| Light mode toggle | ✅ Sun/Moon button in every Navbar |
| No flicker on cold load | ✅ `no-transition` class + blocking inline script |
| Persists after refresh | ✅ localStorage |
| Light mode text visibility | ✅ `[data-theme="light"]` overrides for all dark Tailwind classes |
| Base styles enforced | ✅ `!important` on `html, body` |
| Smooth transitions (after load) | ✅ 0.25s ease on bg/color/border |

---

## 🗓 Navigation Log — Latest Update: 2026-04-20 (Session F — Light/Dark Theme System + Sidebar/Nav Fixes)

### What Changed (2026-04-20 — Session F)

#### Session F — Part 1: Sidebar Active-State Bug Fix + Navigation Performance
- **`frontend/components/Sidebar.js`** — Fixed: `pathname.startsWith(item.href)` → `pathname.startsWith(item.href + '/')` prevents `/pos` from falsely activating `/pos-reports` (and any similar prefix collision).
- **`frontend/components/Sidebar.js`** — Fixed: Profile link changed from `<a href="/profile">` (full page reload) to `<Link href="/profile">` (client-side navigation, instant).
- **`frontend/components/ClientLayoutWrapper.js`** — Fixed: `setReady(true)` now guarded with `if (!ready)` to prevent no-op state calls on every navigation; `useEffect` deps simplified to `[pathname]` only (removes unstable `router` and derived `isAuthPage` refs).

#### Session F — Part 2: Full Light/Dark Theme System
- **`frontend/app/globals.css`** — Rebuilt: CSS variables split into `[data-theme="dark"]` (default) and `[data-theme="light"]`; new tokens added: `--surface-2`, `--sidebar-border`, `--text`, `--text-secondary`, `--text-muted`; `body` now uses `var(--bg)` + `var(--text)`; global `transition` on `background-color`, `color`, `border-color` (0.25s ease).
- **`frontend/hooks/useTheme.js`** (NEW) — `useTheme()` hook: reads saved preference from `localStorage`, falls back to `prefers-color-scheme`, exposes `{ theme, toggleTheme }`.
- **`frontend/app/layout.js`** — Added: inline blocking `<script>` that sets `data-theme` on `<html>` before React hydrates (prevents light-flash on dark-preference users); `<html suppressHydrationWarning>` added.
- **`frontend/components/Navbar.js`** — Added: `ThemeToggle` component (Sun/Moon Lucide icons) rendered in top-right of every page header; title/subtitle now use `var(--text)` / `var(--text-secondary)`.
- **`frontend/components/Sidebar.js`** — All inline `style` hex values replaced with CSS variables: `--bg`, `--sidebar-border`, `--brand-blue`, `--text-muted`, `--text`, `--text-secondary`.
- **`frontend/components/ClientLayoutWrapper.js`** — `bg-[#0D0E1A]` → `bg-[var(--bg)]` (spinner and layout wrapper both).
- **`frontend/components/ui.js`** — `Modal`, `Input`, `Select`, `StatCard` updated: hardcoded `bg-[#111827]`, `bg-[#1a2035]`, `border-slate-700`, `text-white`, `text-slate-300` replaced with CSS variable inline styles (`var(--surface-2)`, `var(--surface)`, `var(--border)`, `var(--text)`, `var(--text-secondary)`).

#### Current Running State (2026-04-20 — after Session F)
- **Backend**: http://localhost:5000 ✅
- **Frontend**: http://localhost:3000 ✅
- **Theme system**: ✅ Fully operational — `data-theme` attribute on `<html>`, persisted in `localStorage`
- **Build**: ✅ Clean — zero errors (`next build` verified)

#### Theme System Status
| Feature | Status |
|---|---|
| Dark mode (default) | ✅ |
| Light mode toggle | ✅ Sun/Moon button in every page Navbar |
| No flicker on load | ✅ Blocking inline script in layout.js |
| Persists after refresh | ✅ localStorage |
| System preference fallback | ✅ `prefers-color-scheme` |
| Sidebar themed | ✅ All inline styles use CSS vars |
| Modal / Input / Select themed | ✅ CSS vars |
| Smooth transitions | ✅ 0.25s ease on bg/color/border |

#### Known Limitation
- Individual page files still use Tailwind semantic classes (`text-slate-400`, `text-white`, etc.). These read correctly in dark mode (by design) but do not invert in light mode. Structural shell (sidebar, navbar, modals, inputs) is fully themed. Page-level content theming is a future pass.

---

## 🗓 Navigation Log — Latest Update: 2026-04-20 (Session E — RBAC Hardening + Dynamic Roles + Ad Accounts Removal)

### What Changed (2026-04-20)

#### Session E — Part 1: Full Enterprise RBAC Enforcement
- **`backend/src/config/rbac.js`** — Rebuilt: added `PROCUREMENT` and `USERS` modules; all 15 roles fully specified with scope + actions per module; `PROCUREMENT` role entry added (was missing).
- **`backend/src/middleware/rbac.js`** — Enhanced: added module-aware `buildScopeFilter(module, req)` (replaces generic `getScopeFilter`); handles `ASSIGNED` scope for Projects via Prisma nested filter `tasks.some(assigned_to=userId)`; `req.rbacModule` set for downstream use. `getScopeFilter` kept as alias for backward compat.
- **`backend/src/middleware/auth.js`** — Now includes `organization_id` in `req.user` (needed for TEAM scope filtering).
- **Routes wired** — `authorizeRbac(MODULE, action)` added to every verb on: `leads.js`, `clients.js`, `deals.js`, `projects.js`, `tasks.js`, `campaigns.js` (including sync + creatives sub-routes).
- **Controllers updated** — Replaced ad-hoc `role === 'SALES'` checks with `buildScopeFilter`:
  - `leads.js`: scope filter applied to list query
  - `deals.js`: OWN scope joins through `lead.created_by` (Deal has no `created_by`)
  - `projects.js`: scope filter as base WHERE clause
  - `tasks.js`: scope filter as base WHERE clause
- **`frontend/components/Sidebar.js`** — Each nav item now has an explicit `roles` allowlist; SUPER_ADMIN bypasses all; role arrays defined as named constants for maintainability.

#### Session E — Part 2: Dynamic DB-Driven Role System
- **`backend/prisma/schema.prisma`** — Added `Role` model (additive, no breaking changes):
  ```prisma
  model Role { id Int @id @default(autoincrement()); key String @unique; label String; createdAt DateTime @default(now()) }
  ```
  `User.role String` kept unchanged — stores the RBAC key; no FK added (SQLite safe).
- **`npx prisma db push`** — `roles` table created in `dev.db`.
- **`backend/src/lib/seedRoles.js`** (NEW) — Standalone idempotent seeder; inserts all 15 RBAC roles (key + label). Already executed — all 15 rows confirmed in DB.
- **`backend/src/lib/seed.js`** — Now calls `seedRoles(prisma)` at the start of `main()` so every fresh seed auto-populates the role catalogue.
- **`backend/src/controllers/users.js`** — Rewritten: `getRoles` (new, returns DB roles), `createUser`/`updateUser` validate `role` against DB (no hardcoded list), `getUsers` enriches response with `roleLabel`.
- **`backend/src/routes/users.js`** — Added `GET /users/roles` (SUPER_ADMIN only).
- **`frontend/app/users/page.js`** — Rewritten: fetches roles from `GET /users/roles` dynamically; no hardcoded `ROLES` array; hash-based badge colors (15 colors, no mapping); loading state; inline error display; department field added.

#### Session E — Part 3: Ad Accounts Page Safe Removal
- **`frontend/app/marketing/accounts/page.js`** — **DELETED** (and empty `accounts/` directory removed).
- **`frontend/components/Sidebar.js`** — Removed: `Ad Accounts` nav entry, `AD_ACCOUNT_ROLES` constant, `Link2` import (unused after removal).
- **Backend untouched** — `marketing_accounts` table, `/marketing-oauth/*` routes, `/marketing-accounts/*` routes, sync engine, all OAuth logic — **all preserved and functional**. Campaigns continue to auto-sync internally.

#### Current Running State (2026-04-20)
- **Backend**: http://localhost:5000 ✅
- **Frontend**: http://localhost:3001 ✅
- **Schema**: 35 Prisma models (34 previous + `Role`) — `prisma db push` confirmed
- **Roles table**: 15 rows seeded and verified

#### Security State After Session E
| Layer | Status |
|---|---|
| Route-level RBAC (`authorizeRbac`) | ✅ Applied to all CRM, Operations, Marketing routes |
| Data-level scope filter (`buildScopeFilter`) | ✅ Applied in leads, deals, projects, tasks controllers |
| Sidebar visibility (frontend UX) | ✅ Per-role allowlists on every nav item |
| Role catalogue | ✅ DB-driven — `GET /users/roles` returns from `roles` table |
| User creation validation | ✅ Validates against DB, not hardcoded list |

---

## 🗓 Navigation Log — Latest Update: 2026-04-19 (Session D — Full System Audit)

### Full System Audit Report (2026-04-19)

#### ✅ WORKING SYSTEMS (All APIs verified 200 OK)

| Module | Endpoints | Status |
|---|---|---|
| Auth | `/auth/login`, `/auth/me` | ✅ Working |
| CRM — Leads | `/leads` CRUD | ✅ Working — 16 leads in DB |
| CRM — Clients | `/clients` CRUD | ✅ Working — 7 clients in DB |
| CRM — Deals | `/deals` CRUD | ✅ Working — 9 deals, 3 WON |
| Projects | `/projects` CRUD | ✅ Working — 6 projects |
| Tasks | `/tasks` CRUD | ✅ Working — 21 tasks |
| Team | `/team` | ✅ Working |
| Users | `/users` | ✅ Working |
| Invoices | `/invoices` | ✅ Working — 1 PAID invoice |
| Payments | `/payments` | ✅ Working |
| Expenses | `/expenses` | ✅ Working — 5 entries |
| Payroll | `/payroll` | ✅ Working (empty — no entries) |
| Campaigns | `/campaigns`, `/campaigns/summary` | ✅ Working (empty — no campaigns) |
| Notifications | `/notifications` | ✅ Working |
| Activity Log | `/notifications/activity` | ✅ Working — 3 log entries |
| Products | `/products` | ✅ Working — 1 product |
| Inventory | `/inventory`, `/inventory/warehouses`, `/inventory/alerts` | ✅ Working — 2 warehouses |
| POS Reports | `/pos-reports/sales`, `/inventory`, `/profit`, `/delivery` | ✅ Working (no sales yet) |
| Finance Summary | `/finance/summary` | ✅ **Fixed** (was 500 — see below) |
| Finance Reports | `/finance/reports/revenue`, `/expenses`, `/profit` | ✅ Working |
| Finance Project Profit | `/finance/project-profit/:id` | ✅ Working |
| P&L Engine | `/pnl?period=YYYY-MM` | ✅ Working |
| Cash Flow Engine | `/cash-flow?period=YYYY-MM` | ✅ Working |
| Business Units | `/business-units` | ✅ Working |
| Fixed Costs | `/fixed-costs` | ✅ Working |
| COGS | `/cogs` | ✅ Working |
| Cost Allocation | `/cost-allocation/rules`, `/entries` | ✅ Working |
| Marketing OAuth Status | `/marketing-oauth/status` | ✅ Working |
| Marketing Accounts | `/marketing-accounts`, `/roi-summary` | ✅ Working (empty — no OAuth connected) |
| Dashboard Summary | `/dashboard/summary` | ✅ Working |
| Dashboard Projects | `/dashboard/projects-summary` | ✅ Working |
| CEO Dashboard | `/dashboard/ceo` | ✅ Working |
| Procurement | `/procurement/vendors`, `/rfqs`, `/orders` | ✅ Working (empty — no seed data) |
| POS Purchases | `/pos-purchases` | ✅ Working (empty) |
| Deliveries | `/deliveries` | ✅ Working (empty) |
| Milestones | `/milestones` | ✅ Working (empty) |
| Profile Page | `/app/profile/page.js` | ✅ Exists — calls `PUT /users/:id` |

#### ❌ BUG FIXED THIS SESSION

**Bug #1 — `/finance/summary` returned 500 (CRITICAL)**
- **Module:** Finance Overview page (`/finance/page.js` → `GET /finance/summary`)
- **Root cause:** `finance.js` controller used MySQL-only `DATE_FORMAT()` and `DATE_SUB()` in a raw SQL query — incompatible with SQLite
- **Fix applied:** Replaced with SQLite-compatible `strftime('%Y-%m', payment_date)` and `date('now', '-6 months')`
- **File changed:** `backend/src/controllers/finance.js:51-60`
- **Status:** ✅ Now returns 200 with full summary data

#### ❌ BUGS FOUND — NOT YET FIXED

**Bug #2 — `/dashboard` (root) returns 404**
- **Module:** Main Dashboard
- **Problem:** Frontend calls `api.get('/dashboard/summary')` (correct). But the route is mounted at `/dashboard/summary` — the root `/dashboard` is a 404 (no issue for frontend).
- **Impact:** Low — frontend uses `/dashboard/summary` correctly. Not a real bug.

**Bug #3 — Cost Allocation "Run" is NOT idempotent (MEDIUM)**
- **Module:** Finance → Allocation (`/cost-allocation/run`)
- **Problem:** Every time "Run Allocation" is clicked for the same period, new `CostAllocationEntry` rows are created (no deduplication). DB already has 6 duplicate entries for `2026-04` all created within 2 minutes.
- **Root cause:** `runAllocation` controller calls `prisma.costAllocationEntry.create()` without checking if an entry for `[rule_id, period]` already exists.
- **Impact:** Allocation totals multiply with each run — P&L Fixed Costs becomes astronomically wrong.
- **Suggested fix:** Add `deleteMany({ where: { period, rule_id: rule.id } })` before `create()` inside `runAllocation`, or use an upsert with `@@unique([rule_id, business_unit_id, period])`.

**Bug #4 — Fixed Costs amount corrupts P&L and Cash Flow (HIGH)**
- **Module:** Finance → P&L, Cash Flow
- **Problem:** A test Fixed Cost entry has `amount = 2300000000000` (2.3 trillion). This makes P&L `netProfit = -2,300,000,230,495` and Cash Flow `netCashFlow = -2,300,000,000,495`.
- **Root cause:** No validation on Fixed Cost `amount` field — user entered 2300000000000 as test data.
- **Impact:** P&L and Cash Flow pages show astronomical negative numbers — the Finance engine itself is correct, the data is corrupt test data.
- **Suggested fix:** Add server-side max-value validation on `amount` in `fixedCostsController.js`. Clean the test row.

**Bug #5 — Inventory quantity anomaly: 7,999,921 units in warehouse "aa" (HIGH)**
- **Module:** POS → Inventory
- **Problem:** Warehouse "aa" shows `quantity = 7,999,921` for product "test". Inventory valuation shows `total_value = 2,399,976,300` — clearly a data corruption from a stock transfer or adjust operation gone wrong.
- **Root cause:** Likely a stock transfer bug — a large negative delta was applied to warehouse "bb" and a correspondingly wrong positive added to "aa", or an unsigned integer wrap-around occurred.
- **Impact:** Inventory reports show false totals. POS stock checks would use wrong quantities.
- **Suggested fix:** Add `max: 1000000` validation on `quantity_change` in `adjustStock` and `quantity` in `transferStock` controllers. Clean the corrupt row.

**Bug #6 — `GET /dashboard` (root path) returns 404 (LOW)**
- Frontend correctly calls `/dashboard/summary`. The `/dashboard` root returns 404 — but no frontend page calls it directly, so no user impact.

**Bug #7 — `GET /cost-allocation/history` returns 404 (LOW)**
- The route does not exist. No frontend page calls it. Low impact.

**Bug #8 — `GET /procurement/purchase-orders` returns 404 (LOW)**
- Route is `/procurement/orders` (not `/purchase-orders`). No frontend page calls the wrong path — frontend uses `/procurement/orders` correctly. No user impact.

#### ⚠️ DATA FLOW ISSUES

| Issue | Impact |
|---|---|
| No campaigns in DB — `/campaigns/summary` returns all zeros | Marketing analytics and dashboard marketing KPIs show 0s |
| No POS sales — all POS reports show zeros | Expected — no sales data seeded |
| No payroll entries | Payroll page empty |
| No procurement vendors/RFQs/orders | Procurement pages empty |
| P&L fixed costs corrupted by test data (2.3 trillion) | Finance pages show astronomical negative numbers |
| 6 duplicate cost allocation entries for 2026-04 | Allocation history shows repeated runs |
| Inventory qty 7,999,921 in warehouse "aa" | Inventory valuation totals are wrong |

#### 🧠 INTEGRATION HEALTH

| Integration | Status |
|---|---|
| CRM → Projects (deal WON auto-creates project) | ✅ Automation engine wired |
| CRM → Leads → Campaigns | ✅ campaign_id FK exists on leads |
| Finance → Invoices → Payments | ✅ Linked correctly |
| Finance Engine (P&L + Cash Flow) | ✅ Aggregation logic correct — data quality issues only |
| POS → Inventory (stock reduction on sale) | ✅ Transactional via prisma.$transaction |
| POS → Finance (CashFlowEntry on sale) | ❌ NOT wired — POS sales do not create Finance entries |
| Marketing OAuth → Campaigns auto-import | ✅ Wired — no OAuth credentials to test live |
| RBAC → All modules | ✅ middleware applied on all routes |
| Socket.io → Notifications | ✅ Events fire on key actions |

#### 🔧 FIX RECOMMENDATIONS (Priority Order)

1. **[DONE ✅]** Fix `finance.js` SQLite SQL syntax — `/finance/summary` now works
2. **[OPEN — HIGH]** Fix `runAllocation` idempotency — delete existing entries for period before creating new ones
3. **[OPEN — HIGH]** Clean corrupt inventory data: set warehouse "aa" qty to a sane value via seed or admin UI
4. **[OPEN — HIGH]** Clean corrupt Fixed Cost test data (2.3 trillion entry) — delete or update via UI
5. **[OPEN — MEDIUM]** Add server-side validation: max amount on Fixed Costs, max quantity on inventory adjust/transfer
6. **[OPEN — MEDIUM]** Wire POS sales → Finance: `createSale` should insert `CashFlowEntry(INFLOW)` after each completed sale
7. **[OPEN — MEDIUM]** Seed campaigns, procurement vendors, payroll data for meaningful dashboards
8. **[OPEN — LOW]** Add `@@unique([rule_id, business_unit_id, period])` to `CostAllocationEntry` schema to enforce idempotency at DB level

---

## 🗓 Navigation Log — Latest Update: 2026-04-19

### What Changed (2026-04-19 — Activity Logging, Marketing OAuth, Google OAuth Hardening)

#### Session A — Activity Log & Notifications Fix
- **`backend/src/lib/activityLogger.js`** (NEW) — shared non-blocking `log()` + `notify()` helpers; both use `.catch(() => null)` so they never break API responses.
- **9 controllers patched** — `leads.js`, `deals.js`, `tasks.js`, `projects.js`, `clients.js`, `invoices.js`, `payments.js`, `expenses.js`, `pos.js` — each now calls `log()` after create/update/delete and `notify()` for key business events (lead won, deal won, task assigned, payment received, sale completed).
- **Activity Log page** and **Notifications page** now receive data. Root cause was that the old `logger.js` middleware wrote activity logs but many controllers never reached it (errors, middleware short-circuits). The new direct-write pattern guarantees logging.

#### Session B — Marketing OAuth System (Meta + Google Ads)
- **`backend/prisma/schema.prisma`** extended — `MarketingAccount` model added (34 total models); `Campaign` extended with optional `marketing_account_id` + `link_status String @default("UNLINKED")`.
- **`npx prisma db push`** run — `marketing_accounts` table created in `dev.db`; all Phase 6 tables also confirmed present.
- **`backend/src/lib/integrations/meta.js`** extended — added `fetchMetaAdAccounts`, `fetchAccountCampaigns`, `fetchCampaignMetricsWithToken`, `exchangeForLongLivedToken`.
- **`backend/src/lib/integrations/google.js`** extended — added `exchangeGoogleCode`, `refreshGoogleToken`, `fetchGoogleCustomerIds`, `fetchAccountCampaigns`, `fetchCampaignMetricsWithToken`.
- **`backend/src/lib/sync.js`** extended — added `syncAccountCampaigns(account, io)`, `syncAllAccounts(io)`, `_getValidGoogleToken(account)`; `startSyncScheduler` now also calls `syncAllAccounts` on each tick.
- **`backend/src/controllers/marketingOAuth.js`** (NEW) — OAuth flows for Meta and Google: `getOAuthStatus`, `initiateMetaOAuth`, `handleMetaCallback`, `initiateGoogleOAuth`, `handleGoogleCallback`.
- **`backend/src/routes/marketingOAuth.js`** (NEW) — `GET /marketing-oauth/status`, `/meta`, `/meta/callback`, `/google`, `/google/callback`.
- **`backend/src/controllers/marketingAccounts.js`** (NEW) — `listAccounts`, `disconnectAccount`, `reconnectAccount`, `syncAccount`, `syncAllAccounts`, `listAccountCampaigns`, `linkCampaign`, `getAccountsROISummary`.
- **`backend/src/routes/marketingAccounts.js`** (NEW) — full CRUD + sync + ROI summary routes.
- **`backend/src/index.js`** — mounted `/marketing-oauth` and `/marketing-accounts` routes.
- **`frontend/app/marketing/accounts/page.js`** (NEW) — Ad Accounts management page: connect Meta/Google via OAuth, view accounts, expand → campaign table, link campaigns to client/project for ROI, sync controls.
- **`frontend/components/Sidebar.js`** — Added "Ad Accounts" nav item (`Link2` icon) to Marketing group; visible to `SUPER_ADMIN`, `MARKETING_MANAGER`, `MEDIA_BUYER`.

#### Session C — Google OAuth Hardening & Bug Fixes
- **Raw JSON in browser fixed** — `initiateMetaOAuth` and `initiateGoogleOAuth` now redirect to `${FRONTEND_URL}/marketing/accounts?error=xxx_not_configured` instead of returning `res.status(400).json(...)`. Since OAuth connect uses `window.location.href`, the browser navigates directly; non-redirect responses render raw JSON in the tab.
- **User-friendly errors** — frontend `ERROR_MESSAGES` map translates all error codes (`meta_not_configured`, `google_denied`, `google_failed`, etc.) to readable sentences; never exposes raw codes in toasts.
- **Setup Guide admin-only** — guide section in Ad Accounts page only renders when `user?.role === 'SUPER_ADMIN'`; other roles never see it.
- **FRONTEND_URL port fixed** — `.env` `FRONTEND_URL` updated from `http://localhost:3000` to `http://localhost:3001`; OAuth callbacks now land on the correct port.
- **`backend/.env.example`** (NEW) — complete example with all OAuth variable names and comments pointing to where credentials are created.
- **Platform status endpoint** — `GET /marketing-oauth/status` (authenticated) returns `{meta: {configured: bool}, google: {configured: bool}}`; frontend disables connect buttons proactively for unconfigured platforms.

#### Current Running State (2026-04-19)
- **Backend**: http://localhost:5000 ✅
- **Frontend**: http://localhost:3001 ✅ (port 3001 — `FRONTEND_URL` updated to match)
- **Schema**: 34 Prisma models — all synced to `dev.db` (`prisma db push` confirmed)

---

## 🗓 Navigation Log — Latest Update: 2026-04-18

### What Changed (Phase 6 — Financial Decision Engine)

#### Added
- **6 new Prisma models**: `BusinessUnit`, `FixedCost`, `CostAllocationRule`, `CostAllocationEntry`, `CogsEntry`, `CashFlowEntry`
- **`backend/src/lib/finance-engine.js`** (NEW) — Static `FinanceEngine` class with `calcPnL(period)` and `calcCashFlow(period)` methods; aggregates from existing transactional models (no data duplication)
- **6 new backend controller files**: `businessUnitsController.js`, `fixedCostsController.js`, `costAllocationController.js`, `cogsController.js`, `pnlController.js`, `cashFlowController.js`
- **6 new backend route files**: `businessUnits.js`, `fixedCosts.js`, `costAllocation.js`, `cogs.js`, `pnl.js`, `cashFlow.js`
- **6 new frontend pages**: `/finance/pnl`, `/finance/cash-flow`, `/finance/business-units`, `/finance/fixed-costs`, `/finance/cogs`, `/finance/allocation`
- **Sidebar updated** — 6 new Finance sub-items with Lucide icons: P&L (`LineChart`), Cash Flow (`ArrowDownUp`), COGS (`Database`), Fixed Costs (`Lock`), Business Units (`Layers`), Allocation (`Percent`)

#### Modified
- `backend/prisma/schema.prisma` — `cogsEntries` back-relation added to `Product`; 6 new models appended
- `backend/src/index.js` — 6 new route mounts (`/business-units`, `/fixed-costs`, `/cost-allocation`, `/cogs`, `/pnl`, `/cash-flow`); module count updated to **22**; phase updated to **6**
- `frontend/components/Sidebar.js` — Lucide imports expanded; Finance group now has 12 nav items (was 6)

#### Also Completed (same session — UI Emoji Audit)
- **Full emoji-to-icon migration** across all frontend pages — removed all emoji/symbol UI elements, replaced with Lucide React components
- Key files changed: `activity/page.js` (MODULE_CFG icon→Icon refactor), `dashboard/ceo/page.js`, `procurement/page.js` (StarRating component), `Pagination.js`, `clients/page.js`, `finance/expenses/page.js`, `pos/page.js`, `dashboard/projects/page.js`, `dashboard/page.js`, `finance/page.js`, `marketing/analytics/page.js`

#### Database
- `npx prisma db push` required — 6 new tables need to be created in `dev.db`
- `npx prisma generate` required — Prisma Client must be regenerated with new models

---

### What Changed (Phase 5 — POS & Inventory)

#### Added
- **9 new Prisma models**: `ProductCategory`, `Warehouse`, `Product`, `Inventory`, `PosSale`, `PosSaleItem`, `StockPurchase`, `StockPurchaseItem`, `Delivery`
- **6 new backend route files**: `products.js`, `inventory.js`, `pos.js`, `posPurchases.js`, `deliveries.js`, `posReports.js`
- **6 new backend controller files** (matching routes above) with full business logic
- **6 new frontend pages**: `/pos`, `/products`, `/inventory`, `/purchases`, `/deliveries`, `/pos-reports`
- **3 new RBAC roles**: `CASHIER`, `WAREHOUSE_STAFF`, `DELIVERY_DRIVER` with scoped POS module permissions
- **POS module** added to `RBAC_MATRIX` with full permissions for SUPER_ADMIN/FOUNDER_CEO and read for FINANCE_MANAGER
- **Sidebar** updated with new "POS & Inventory" section (6 items, role-gated)

#### Modified
- `backend/prisma/schema.prisma` — back-relations added to `User`, `Client`, `Vendor`; 9 new models appended
- `backend/src/index.js` — 6 new route mounts added; module count updated to 16; phase updated to '5'; **CORS logic replaced** with dynamic multi-origin allowlist
- `backend/src/config/rbac.js` — `POS` module added; 3 new roles appended; existing roles updated

#### Bug Fixed
- **CORS "Login failed" bug** — Root cause: `Access-Control-Allow-Origin` was hardcoded to `http://localhost:3000`; when Next.js auto-switched to port 3001, browser blocked all responses, causing the axios catch fallback `'Login failed'`. Fixed by replacing the single-string CORS origin with a dynamic array allowlist covering both ports.

#### Database
- `npx prisma db push` executed — all 9 new tables created in `dev.db`
- `npx prisma generate` re-run — Prisma Client regenerated with new models

---

## Project Overview

**CAI2RUS Business OS** is a full-featured enterprise CRM & Business Operations SaaS platform built for a single organization. It combines CRM, project/task management, finance, marketing intelligence, and procurement into one unified system.

**Main Goal:** Replace multiple disconnected tools (CRM, project tracker, invoicing, ad management) with a single, role-aware internal platform.

**Target Users:** Internal company teams — sales executives, project managers, finance staff, marketing managers, media buyers, procurement officers, and C-level executives.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 14.1 (App Router) |
| Frontend UI | React 18, Tailwind CSS 3.3 |
| Charts | Recharts 2.12 |
| Icons | Lucide React |
| HTTP client | Axios 1.6.7 |
| Real-time (client) | Socket.io-client 4.7.4 |
| Date utilities | date-fns 3.3.1 |
| Backend framework | Express.js 4.18 |
| ORM | Prisma 5.10 |
| Database (dev) | SQLite (`backend/prisma/dev.db`) |
| Database (prod-ready) | MySQL (same schema, change provider) |
| Auth | JWT (jsonwebtoken 9.0.2), bcryptjs 2.4.3 |
| Real-time (server) | Socket.io 4.7.4 |
| File uploads | Multer 2.1.1 |
| Dev server | Nodemon 3.1.0 |

---

## Folder Structure

```
crm-saas/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # 34 Prisma models (33 Phase 6 + 1 MarketingAccount) ★
│   │   └── dev.db                 # SQLite database file — all 34 tables present (prisma db push confirmed)
│   ├── src/
│   │   ├── index.js               # Express entry point — 22 modules, phase 6; dynamic CORS allowlist ★
│   │   ├── routes/                # 34 route files (+4 new: marketingOAuth, marketingAccounts) ★
│   │   ├── controllers/           # 39 controller files (+4 new: marketingOAuth, marketingAccounts + activityLogger patched into 9) ★
│   │   ├── lib/
│   │   │   ├── prisma.js          # Prisma client singleton
│   │   │   ├── finance-engine.js  # FinanceEngine static class: calcPnL(), calcCashFlow()
│   │   │   ├── activityLogger.js  # ★ NEW — shared log() + notify() helpers (non-blocking)
│   │   │   ├── automation.js      # Event-driven automation engine
│   │   │   ├── roi.js             # ROI/CPA/CTR computation engine
│   │   │   ├── sync.js            # ★ Extended — syncAccountCampaigns, syncAllAccounts added
│   │   │   ├── seed.js            # Database seeder
│   │   │   └── integrations/
│   │   │       ├── meta.js        # ★ Extended — fetchMetaAdAccounts, exchangeForLongLivedToken, etc.
│   │   │       └── google.js      # ★ Extended — exchangeGoogleCode, refreshGoogleToken, etc.
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verification middleware
│   │   │   ├── rbac.js            # Role-based access control middleware
│   │   │   ├── finance.js         # Finance-specific role guard
│   │   │   └── logger.js          # Activity log writer
│   │   └── config/
│   │       └── rbac.js            # Role → permission mapping
│   ├── uploads/
│   │   └── creatives/             # Uploaded campaign creative files (served as static)
│   └── .env                       # Environment variables (JWT, DB, Ad platform keys)
│
└── frontend/
    ├── app/
    │   ├── layout.js              # Root layout with Toaster + ClientLayoutWrapper
    │   ├── page.js                # Root redirect (→ /dashboard or /login)
    │   ├── login/page.js          # Login form
    │   ├── dashboard/page.js      # Main dashboard (CRM + ops + marketing KPIs)
    │   ├── dashboard/ceo/page.js  # Executive view (SUPER_ADMIN only)
    │   ├── leads/page.js          # Lead pipeline management
    │   ├── clients/page.js        # Client records
    │   ├── deals/page.js          # Deal pipeline
    │   ├── projects/
    │   │   ├── page.js            # Project list
    │   │   ├── [id]/page.js       # Project detail (tasks, milestones)
    │   │   └── milestones/page.js # All milestones view
    │   ├── tasks/page.js          # Task board
    │   ├── team/page.js           # Team management
    │   ├── users/page.js          # User + role management (SUPER_ADMIN)
    │   ├── marketing/
    │   │   ├── page.js            # Campaign list + create/edit modal
    │   │   ├── [id]/page.js       # Campaign detail: analytics, creatives, leads
    │   │   ├── analytics/page.js  # Platform-wide marketing intelligence
    │   │   └── accounts/page.js   # ★ NEW — Ad Accounts: OAuth connect, campaign table, ROI link
    │   ├── finance/
    │   │   ├── page.js            # Finance overview (needs Phase 6 KPI update)
    │   │   ├── invoices/page.js
    │   │   ├── payments/page.js
    │   │   ├── expenses/page.js
    │   │   ├── payroll/page.js
    │   │   ├── reports/page.js
    │   │   ├── pnl/page.js              # ★ P&L statement + KPI cards + 6-month bar chart
    │   │   ├── cash-flow/page.js        # ★ Cash flow breakdowns, area chart, manual entries CRUD
    │   │   ├── business-units/page.js   # ★ Business unit CRUD (name, code, status, counts)
    │   │   ├── fixed-costs/page.js      # ★ Fixed costs by period + category badges
    │   │   ├── cogs/page.js             # ★ COGS entries, sync from purchases, manual entry
    │   │   └── allocation/page.js       # ★ Two-tab: allocation rules + run + history
    │   ├── procurement/page.js    # Vendors + RFQs + Purchase Orders (3 tabs)
    │   ├── pos/page.js            # ★ POS Terminal — barcode/search, cart, checkout, receipt
    │   ├── products/page.js       # ★ Product catalog CRUD + category management
    │   ├── inventory/page.js      # ★ Multi-warehouse stock — 3 tabs: inventory/warehouses/alerts
    │   ├── purchases/page.js      # ★ Stock purchase orders — create → receive flow
    │   ├── deliveries/page.js     # ★ Delivery tracking — assign driver, status updates
    │   ├── pos-reports/page.js    # ★ POS analytics — 4 tabs: sales/inventory/profit/delivery
    │   ├── notifications/page.js
    │   └── activity/page.js       # Audit log
    ├── components/
    │   ├── Sidebar.js             # Nav sidebar with role-based visibility
    │   ├── Navbar.js              # Top bar with page title + action button
    │   ├── ui.js                  # Shared UI primitives (Badge, Modal, Btn, StatCard, etc.)
    │   ├── ClientLayoutWrapper.js # Auth gate + layout shell
    │   └── Toaster.js             # Toast notification system
    ├── lib/
    │   ├── api.js                 # Axios instance (Bearer token, 401 redirect)
    │   ├── auth.js                # Token/user storage helpers + logout
    │   └── utils.js               # fmtCurrency, fmtDate, truncate, initials
    └── hooks/
        ├── useData.js             # Generic data-fetching hook
        └── useSocket.js           # Socket.io event subscription hook
```

---

## Key Features Implemented

### 1. Authentication & RBAC
- JWT login (7-day expiry), bcrypt password hashing.
- Roles: `SUPER_ADMIN`, `SALES_EXECUTIVE`, `SALES_MANAGER`, `MARKETING_MANAGER`, `MEDIA_BUYER`, `FINANCE_MANAGER`, `ACCOUNTANT`, `PROJECT_MANAGER`, `PROCUREMENT`, `FOUNDER_CEO`, `CASHIER` ★, `WAREHOUSE_STAFF` ★, `DELIVERY_DRIVER` ★.
- Sidebar items, routes, and API endpoints all gated by role.
- CORS now allows both `localhost:3000` and `localhost:3001` via dynamic origin allowlist. ★

### 2. CRM — Leads, Clients, Deals
- Lead lifecycle: `LEAD → QUALIFIED → PROPOSAL_SENT → NEGOTIATION → WON / LOST`.
- Clients linked to deals; deals optionally linked to leads.
- Full CRUD with search and stage filtering on every list page.

### 3. Operations — Projects, Tasks, Milestones, Team
- Projects have type (`ICT`, `MARKETING_CAMPAIGN`, `HYBRID`), budget, progress %, status.
- Tasks assigned to team members with priority (`LOW/MEDIUM/HIGH/URGENT`) and due dates.
- Milestones tracked per project with completion dates.
- Team page lists all users and their roles.

### 4. Finance — Invoices, Payments, Expenses, Payroll, Reports
- Invoices linked to clients, projects, and deals. Status: `DRAFT → SENT → PAID / OVERDUE`.
- Payments recorded against invoices; multiple partial payments supported.
- Expenses categorized (`ADS`, `VENDOR`, `SALARY`, `TOOLS`, `TRAVEL`, `UTILITIES`, `OTHER`).
- Payroll entries per employee per period with bonuses, deductions, net salary.
- Finance pages restricted to `FINANCE_ROLES` only.

### 5. Marketing Intelligence
- Campaigns with platform (`META`, `GOOGLE`, `ALL`), budget, daily budget, date range, external platform ID.
- Manual metric entry: impressions, clicks, conversions, spend, revenue.
- External sync: pulls live data from Meta Ads and Google Ads APIs (falls back to mock data if credentials absent).
- ROI engine (`lib/roi.js`): ROI %, CPA, CTR computed from cumulative metrics.
- Creatives: image/video upload via Multer, served from `/uploads/creatives/`, displayed in gallery.
- Lead attribution: campaigns linked to leads that converted.
- Analytics page: platform comparison bar chart, campaign status pie chart, top-ROI campaign table.
- Auto-sync scheduler runs at interval set by `SYNC_INTERVAL_MINUTES` (default 30 min).

### 6. Procurement
- Vendors with category, rating, status.
- RFQs (Request for Quotation) assigned to vendors and projects.
- Quotations submitted against RFQs.
- Purchase Orders created from accepted quotations; PO number auto-generated.

### 7. Automation Engine (`lib/automation.js`)
Event-driven automations triggered on backend actions:
- Deal `WON` → auto-creates Client + Project → notifies project managers.
- Payment recorded → logs revenue → notifies finance team.
- Task assigned → push notification to assignee.
- Expense added → updates profit snapshot.
- Invoice overdue → finance notification.
- Milestone missed → project manager notification.

### 8. Real-time Notifications
- Socket.io integrated on both server and client.
- Events: `campaign:created`, `project:auto_created`, `payment:recorded`, `task:assigned`, `lead:updated`, budget alert on overspend.
- Notifications stored in DB and shown on `/notifications` page.

### 9. Activity Log
- All create/update/delete actions logged via `logger.js` middleware.
- Stored in `ActivityLog` with user, module, action, entity, description, and metadata.
- Visible at `/activity` (admin audit trail).

### 10. CEO Dashboard
- Restricted to `SUPER_ADMIN` / `FOUNDER_CEO`.
- Aggregated KPIs: revenue, deals, projects, marketing ROI, team activity.

### 11. POS System ★ (Phase 5 — NEW)
- Fast POS terminal: real-time product search/barcode lookup, cart management, VAT + discount calculation, multi-payment methods (CASH/CARD/BANK_TRANSFER/WALLET), receipt modal with print support.
- Sale creation is fully transactional: stock is validated and reduced atomically via `prisma.$transaction`. Refunds restore stock atomically.
- Products: full CRUD with SKU, barcode, cost, price, category, soft delete.
- Inventory: multi-warehouse stock tracking, min-quantity alerts, stock adjust & transfer (both transactional).
- Stock Purchases: create → receive flow with automatic inventory increment on receive.
- Deliveries: create from sale → assign driver → status progression (PENDING → ASSIGNED → IN_TRANSIT → DELIVERED / FAILED).
- POS Reports (4 tabs): sales summary by payment method / product / day; inventory valuation by warehouse; profit & gross margin by product; delivery performance with avg delivery time.

### 12. Warehouses ★ (Phase 5 — NEW)
- Multi-warehouse model: each product has a separate `Inventory` record per warehouse (unique constraint `[product_id, warehouse_id]`).
- CRUD: create/update warehouses; inventory is scoped per warehouse in all POS and stock operations.

---

## Current Progress

### Latest Milestone: Marketing OAuth + Activity Logging Complete (2026-04-19)
Both servers confirmed running:
- **Frontend**: http://localhost:3001 ✅ (auto-switched from 3000; FRONTEND_URL env updated to match)
- **Backend**: http://localhost:5000 ✅

**Completed (production-ready):**
- All 18 modules fully implemented end-to-end (routes → controllers → frontend pages).
- Database schema: **34 models** (33 Phase 6 + MarketingAccount) — `prisma db push` confirmed, all tables in `dev.db`.
- **Finance Engine**: pure aggregation, no data duplication — P&L and Cash Flow computed live from operations.
- **P&L page**: period selector, statement breakdown (Revenue / COGS / Gross Profit / Expenses / Net Profit), KPI cards, 6-month bar chart.
- **Cash Flow page**: inflow/outflow summary cards, breakdown panels, 6-month area chart, manual entries CRUD.
- **Business Units page**: CRUD with status toggle, shows related fixed cost and rule counts.
- **Fixed Costs page**: period-filtered, category badges, business unit linking, create/edit/delete.
- **COGS page**: source-tagged entries, "Sync from Purchases" auto-sync, manual entry form.
- **Allocation page**: two-tab layout (Rules + History), "Run Allocation" trigger with period selector.
- **Emoji audit**: all frontend pages migrated from emoji/symbol UI elements to Lucide React icons.
- Role-based access control applied to all Phase 6 routes (`requireFinance` middleware: SUPER_ADMIN, FINANCE_MANAGER, ACCOUNTANT).
- Sidebar now has 12 Finance items (6 original + 6 Phase 6).

**Demo login credentials (all verified working):**
| User | Email | Password | Role |
|---|---|---|---|
| Super Admin | admin@crm.com | Admin@123 | SUPER_ADMIN |
| Sales Rep | sales@crm.com | Sales@123 | SALES |
| Project Manager | pm@crm.com | PM@123 | PROJECT_MANAGER |
| Engineer | eng@crm.com | Eng@123 | ENGINEER |
| Finance Manager | finance@crm.com | Finance@123 | FINANCE_MANAGER |

**Partially done / rough edges:**
- Meta Ads and Google Ads OAuth flows built and hardened — real API connections untested without valid credentials (placeholder values in `.env`). See `.env.example` for where to create app credentials.
- Finance Reports page exists but report generation depth is unknown (may be basic summaries).
- CEO dashboard data completeness depends on backend `dashboard/ceo` controller scope.
- POS pages built and wired; not yet tested end-to-end in browser (no warehouse/product seed data exists yet).
- Phase 6 DB tables confirmed present (`prisma db push` run 2026-04-19). Pages functional but browser testing not yet completed.
- Activity Log and Notifications now receive data (direct controller writes); not yet confirmed working end-to-end in browser (verify by creating a lead or deal).

---

## Pending Tasks

### CRITICAL
~~1. **Run `prisma db push`**~~ ✅ Done 2026-04-19 — all 34 tables present in `dev.db`.

###  High Priority
2. **Seed POS data** — no warehouses or products exist yet; POS terminal and inventory pages will be empty. Add at least 1 warehouse + sample products via UI or a seed script.
3. **Wire POS sales → Finance** — `controllers/pos.js::createSale` should create a `CashFlowEntry` (INFLOW) after each completed sale so POS revenue flows into the Finance Engine. Also update `calcPnL` to pick up POS sales via this entry.
4. **Update Finance Overview page** (`/finance/page.js`) — currently shows basic Finance v1 data; should surface Phase 6 P&L and Cash Flow KPIs.
5. **Profile page** (`/profile`) — linked from sidebar user avatar; verify it exists and renders correctly.

###  Medium Priority
6. **Export functionality** — PDF/Excel export for invoices and POS reports. Install `pdfkit` or `puppeteer` on backend.
7. **Notifications badge** — real-time unread count on the Sidebar bell icon (Socket.io hook exists, just wire up the counter).
8. **CEO dashboard Phase 6 data** — update `controllers/ceoDashboard.js` to include P&L summary, net profit, and cash position.
9. **Email notifications** — no SMTP/nodemailer integration; automation engine fires events but never reaches email.
10. **Pagination UI** — backend supports `limit/page`; frontend list pages don't expose paginator controls.

###  Low Priority (polish / production readiness)
11. **Real ad platform credentials** — OAuth app credentials needed (Meta App ID/Secret, Google OAuth Client ID/Secret, Google Ads Developer Token). See `.env.example`. Without real creds, connect buttons are disabled and sync uses mock data.
12. **Multi-organization support** — `organization_id` on all models but no controller filters on it.
13. **TypeScript migration** — codebase is plain JS throughout.
14. **Production deployment config** — no CI/CD, `Dockerfile` exists but untested; no `.env.example`.
15. **MySQL migration** — change `provider = "sqlite"` → `"mysql"` in `schema.prisma` for production.

---

## Known Issues / Bugs

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | **`organization_id` unused** — all models have it but no controller filters on it; all users see all records | Low | Open (multi-tenancy stub) |
| 2 | **Mock ad data indistinguishable from real** — no UI indicator when credentials absent | Low | Open |
| 3 | **SQLite Decimal precision** — stored as text; raw arithmetic can misbehave | Low | Open (mitigated by Prisma abstraction) |
| 4 | **No refresh token** — JWT expires after 7 days, user is hard-logged-out | Medium | Open |
| 5 | **File storage is local disk** — creatives in `backend/uploads/`; not cloud-ready | Medium | Open |
| 6 | **No input sanitization** — free-text fields stored as-is; XSS risk if ever rendered as raw HTML | Low | Open (currently rendered as text, safe for now) |
| 7 | **POS sale does not integrate with Finance module** — revenue from sales is not logged as a Finance entry | Medium | Open (needs automation hook) |
| 8 | **CORS fix** — "Login failed" for all users when frontend auto-switched to port 3001 | **Critical** | ✅ **Fixed 2026-04-18** |
| 9 | **Phase 6 DB tables not yet created** | **Critical** | ✅ **Fixed 2026-04-19** — `prisma db push` run; all 34 tables confirmed |
| 10 | **Activity Log / Notifications empty** — events were never written to DB from most controllers | High | ✅ **Fixed 2026-04-19** — `activityLogger.js` wired into 9 controllers |
| 11 | **OAuth raw JSON in browser** — `initiateGoogleOAuth` returned JSON 400; browser rendered it as raw text since `window.location.href` navigated directly | High | ✅ **Fixed 2026-04-19** — both initiate handlers now redirect to frontend with `?error=code` |
| 12 | **FRONTEND_URL port mismatch** — OAuth callbacks redirected to port 3000 while Next.js ran on 3001 | High | ✅ **Fixed 2026-04-19** — `.env` updated to `http://localhost:3001` |
| 13 | **No real OAuth credentials configured** — Meta App ID / Google OAuth Client ID are placeholders; connect buttons disabled until real credentials added | Medium | Open — see `.env.example` |

---

## Code Conventions & Patterns

### Backend
- **Controller pattern:** Each module has its own controller file; route files are thin (just `router.verb(path, middleware, controller)`).
- **Middleware chain:** `auth` → `rbac/finance` → controller. Auth always runs first.
- **Prisma queries:** Use `include` for joins; no raw SQL except where Prisma limitations require it.
- **Error handling:** `try/catch` in every controller; errors returned as `{ error: message }` with appropriate HTTP status.
- **Logging:** `logger.js` middleware writes `ActivityLog` entries after successful mutations.
- **Socket.io:** `io` instance passed to controllers that need to emit events; imported from `index.js` via a getter.

### Frontend
- **App Router:** All pages use Next.js 13+ App Router (`app/` directory). No `pages/` directory.
- **`'use client'` directive:** All pages and interactive components are client components (data fetching via `useEffect` + Axios, not server components).
- **Shared API layer:** All HTTP calls go through `lib/api.js` (Axios instance with auto-token injection). Never call `fetch` directly.
- **UI primitives:** Use components from `components/ui.js` (Modal, Btn, Badge, StatCard, Input, Select, Spinner, Empty) — don't inline equivalent markup.
- **Dark theme only:** All styling uses inline `style` props for colors from the design system palette; Tailwind for layout and spacing only.
- **No TypeScript:** Plain JavaScript throughout. Props are not typed.
- **State management:** Local `useState` only — no Redux, Zustand, or Context API for global state. Auth state lives in `localStorage` via `lib/auth.js`.

### Design System Colors
| Token | Value | Usage |
|---|---|---|
| Primary | `#004AFF` | Buttons, active links |
| Accent | `#C9FC0D` | CTAs, positive metrics |
| Background | `#0D0E1A` | Page background |
| Surface | `#1A2035` | Cards, modals |
| Border | `#334155` | Dividers |
| Text primary | `#ffffff` | Headings |
| Text secondary | `#64748b` | Labels, subtitles |

---

## Important Notes

1. **Run backend before frontend.** Frontend expects `http://localhost:5000` (or `NEXT_PUBLIC_API_URL`).
2. **Database setup:** Run `cd backend && npx prisma db push` on first run to create the SQLite schema.
3. **Seeding:** Run `node src/lib/seed.js` from `backend/` to populate demo data.
4. **Static file serving:** The Express server serves `backend/uploads/` at `/uploads`. Creative image URLs reference this path — don't change the mount point.
5. **Socket.io CORS:** Configured to allow `FRONTEND_URL` (set in `.env`). The Express CORS layer now uses a dynamic allowlist (`localhost:3000` + `localhost:3001` + `FRONTEND_URL`) so port auto-switching no longer breaks auth.
6. **Ad platform keys in `.env`:** If `META_ADS_ACCESS_TOKEN` / `GOOGLE_ADS_*` are set to placeholder values (`your_*`), the integration silently uses mock data. This is intentional.
7. **JWT secret:** `JWT_SECRET` in `.env` is a placeholder. **Must be changed before production.**
8. **`/profile` route:** Linked from the Sidebar user avatar but the page implementation status is uncertain — verify it exists before pointing users to it.
9. **Pagination:** Backend list endpoints accept `?limit=N&page=N` but most frontend pages fetch with a high limit (e.g., `?limit=50`) and do not render pagination UI.

---

## Next Recommended Steps

### Immediate
1. **Add real OAuth credentials** — fill in `META_APP_ID`, `META_APP_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN_OAUTH` in `backend/.env` (see `.env.example` for where to create each). Without these, Ad Accounts connect buttons remain disabled.
2. **Wire POS sales → Finance** — in `controllers/pos.js::createSale`, after transaction completes, insert a `CashFlowEntry` (type: INFLOW) so POS revenue appears in Cash Flow and P&L.
3. **Update Finance Overview page** — add P&L KPI cards and net cash flow to `/finance/page.js` using the new `/pnl` and `/cash-flow` endpoints.

### Near-term
4. **Seed POS data** — add `seedPOS()` to `backend/src/lib/seed.js`; at minimum 1 warehouse + 10 products.
5. **Add unread notification badge** — use existing `useSocket` hook to increment counter on Sidebar bell icon.
6. **Invoice PDF export** — add `GET /invoices/:id/pdf` (use `pdfkit`), add download button on invoice page.
7. **Add SMTP email notifications** — integrate `nodemailer`; automation engine already fires the right events.

### Production Readiness
8. **Add input validation** — use `zod` or `express-validator` on backend endpoints.
9. **Switch to MySQL** — change `provider = "sqlite"` → `"mysql"` in `schema.prisma`; update `DATABASE_URL`; run `npx prisma db push`.
10. **Change `JWT_SECRET`** — current value is a placeholder; must be a random 64-char secret before production.
11. **Write `CLAUDE.md`** — place project conventions at repo root so future AI sessions load full context automatically.
