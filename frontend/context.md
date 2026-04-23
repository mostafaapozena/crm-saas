# Frontend Context — CAI2RUS Business OS

> Navigation log for the Next.js 14 frontend layer.
> Updated incrementally — never fully rewritten unless required.

---

## 🗓 Navigation Log — Latest Update: 2026-04-21 (Session L — i18n Completion + RTL/Theme Fixes)

### What Changed (2026-04-21 — Session L)

#### Phase 1 — POS Page Full i18n
- **`frontend/app/pos/page.js`** — Fully rewritten with `useLocale` / `t()`:
  - All hardcoded English text replaced: Navbar title/subtitle, StockBadge messages, search placeholder, warehouse select, product count, cart header, clear-all, empty cart, labels (Discount Amount, Tax Rate, Subtotal, Discount, Total, Payment Method, Customer, Notes), warnings, checkout button, processing state, receipt modal (Sale Complete, Items, Total Paid, Payment Method, Date & Time), Print/New Sale buttons
  - All hardcoded dark-mode hex colors replaced with CSS vars: `#1A2035→var(--surface)`, `#334155→var(--border)`, `#0D0E1A→var(--bg)`, `text-white→var(--text)`
  - Product grid uses `var(--surface)` + `var(--border)` instead of hardcoded hex
  - RTL-aware: search icon position, product card text-align, client dropdown text-align, cart badge position toggle based on `dir`

#### Phase 2 — Translation File Finalization
- **`frontend/lib/translations/en.json`** — 734 keys (was 700):
  - Added 34 new `pos.*` keys: `subtitle`, `search_barcode`, `no_products_search`, `no_products_available`, `select_warehouse`, `products_count_one/other`, `products_for_query`, `clear_all`, `cart_empty`, `cart_empty_hint`, `discount_amount`, `tax_rate`, `subtotal`, `discount`, `total`, `payment_method`, `customer_optional`, `search_client`, `notes_optional`, `add_note`, `select_warehouse_warning`, `processing`, `complete_sale`, `print`, `new_sale`, `sale_complete`, `items`, `total_paid`, `date_time`, `out_of_stock`, `low_stock`, `in_stock`, `checkout_failed`, `sku_label`
  - Added 9 new `pos.*` keys for inventory/products pages: `inventory_subtitle`, `add_warehouse`, `adjust_stock`, `transfer_stock`, `products_subtitle`, `add_category`, `add_product`, `purchases_subtitle`, `deliveries_subtitle`, `pos_reports_subtitle`
  - Added `profile.*` section: 13 keys for profile page
- **`frontend/lib/translations/ar.json`** — 734 keys (mirrors EN exactly, zero missing)

#### Phase 3 — Profile Page i18n + Light Mode Fix
- **`frontend/app/profile/page.js`** — Rewired with `useLocale`:
  - Navbar title/subtitle translated
  - All labels, buttons, messages translated
  - Hardcoded `bg-[#111827]`, `border-slate-800`, `text-white`, `text-slate-400/500` replaced with CSS var inline styles

#### Phase 4 — Inventory & Products Page Navbar Translation
- **`frontend/app/inventory/page.js`** — Added `useLocale` import + hook; Navbar title/subtitle/action buttons now use `t()` keys
- **`frontend/app/products/page.js`** — Added `useLocale` import + hook; Navbar title/subtitle/action buttons now use `t()` keys

#### Phase 5 — RTL Sidebar Active Border Fix
- **`frontend/components/Sidebar.js`** — Active nav item border now toggles based on `dir`:
  - LTR: `borderLeft: '2px solid var(--brand-blue)'`
  - RTL: `borderRight: '2px solid var(--brand-blue)'` (border-left removed)

#### Phase 6 — globals.css Additions
- Added `[dir="rtl"] nav a[style*="borderLeft"]` override as CSS fallback for RTL border
- Added `[data-theme="light"] input/select/textarea { color-scheme: light }` for native control theming

#### i18n Coverage After Session L
| Page | Status |
|---|---|
| `/pos` | ✅ 100% translated + CSS vars |
| `/profile` | ✅ 100% translated + CSS vars |
| `/inventory` Navbar | ✅ Translated |
| `/products` Navbar | ✅ Translated |
| All other pages (31) | ✅ Already used `useLocale` from prior sessions |
| Translation files (en/ar) | ✅ 734 keys each, perfectly mirrored |

#### Remaining i18n Work (not done — lower priority)
- `deliveries/page.js` — StatCard labels, modal titles, table headers still hardcoded
- `pos-reports/page.js` — Tab names, section titles, table headers hardcoded
- `purchases/page.js` — StatCard labels, modal titles hardcoded
- `projects/[id]/page.js` — Task modal, milestone section hardcoded

---

## 🗓 Navigation Log — Latest Update: 2026-04-18

### What Changed (Phase 5 — POS & Inventory UI)

#### Added
- `app/pos/page.js` — Full POS terminal (1 014 lines): product search, barcode lookup, cart, VAT + discount, multi-payment, receipt modal with print
- `app/products/page.js` — Product catalog CRUD (440 lines): table, search/filter, add/edit modal, category management
- `app/inventory/page.js` — Inventory dashboard (666 lines): 3-tab layout (Inventory / Warehouses / Alerts), adjust + transfer modals
- `app/purchases/page.js` — Stock purchases (393 lines): create with dynamic item rows, receive flow
- `app/deliveries/page.js` — Delivery tracking (372 lines): assign driver, status updates
- `app/pos-reports/page.js` — POS analytics (344 lines): 4 tabs (Sales / Inventory / Profit / Delivery), date-range pickers
- `components/Pagination.js` — Reusable paginator component (new, not previously documented)

#### Modified
- `components/Sidebar.js` — New "POS & Inventory" section added between Procurement and System; 6 new icon imports from lucide-react (`ShoppingCart, Package, Boxes, ShoppingBag, Truck, BarChart3`)

#### Environment
- `.env.local` confirmed present with `NEXT_PUBLIC_API_URL=http://localhost:5000` and `NEXT_PUBLIC_SOCKET_URL=http://localhost:5000`

#### Verified Working
- Login: `admin@crm.com / Admin@123` → redirects to `/dashboard` ✅
- CORS fix applied to backend; no more "Login failed" fallback ✅
- Frontend runs on `http://localhost:3000` ✅

---

## Current System State

### Runtime
| | Value |
|---|---|
| **URL** | http://localhost:3000 |
| **Framework** | Next.js 14.1 (App Router) |
| **API target** | http://localhost:5000 (set in `.env.local`) |
| **Socket target** | http://localhost:5000 (set in `.env.local`) |

### Page Inventory (33 pages total)

#### Original Modules (pre-Phase 5)
| Route | File | Status |
|---|---|---|
| `/` | `app/page.js` | Root redirect → `/dashboard` or `/login` |
| `/login` | `app/login/page.js` | JWT login form, demo quick-fill buttons |
| `/dashboard` | `app/dashboard/page.js` | CRM + ops + marketing KPIs |
| `/dashboard/ceo` | `app/dashboard/ceo/page.js` | Executive view (SUPER_ADMIN only) |
| `/dashboard/projects` | `app/dashboard/projects/page.js` | Projects summary dashboard |
| `/leads` | `app/leads/page.js` | Lead pipeline, stage filter |
| `/clients` | `app/clients/page.js` | Client records CRUD |
| `/deals` | `app/deals/page.js` | Deal pipeline |
| `/projects` | `app/projects/page.js` | Project list |
| `/projects/[id]` | `app/projects/[id]/page.js` | Project detail — tasks + milestones |
| `/projects/milestones` | `app/projects/milestones/page.js` | All milestones view |
| `/tasks` | `app/tasks/page.js` | Task board |
| `/team` | `app/team/page.js` | Team members list |
| `/users` | `app/users/page.js` | User + role management (SUPER_ADMIN) |
| `/marketing` | `app/marketing/page.js` | Campaign list + create/edit |
| `/marketing/[id]` | `app/marketing/[id]/page.js` | Campaign detail — metrics, creatives, leads |
| `/marketing/analytics` | `app/marketing/analytics/page.js` | Platform-wide analytics |
| `/finance` | `app/finance/page.js` | Finance overview |
| `/finance/invoices` | `app/finance/invoices/page.js` | Invoice CRUD |
| `/finance/payments` | `app/finance/payments/page.js` | Payment recording |
| `/finance/expenses` | `app/finance/expenses/page.js` | Expense tracking |
| `/finance/payroll` | `app/finance/payroll/page.js` | Payroll entries |
| `/finance/reports` | `app/finance/reports/page.js` | Finance reports |
| `/procurement` | `app/procurement/page.js` | Vendors + RFQs + Purchase Orders (3 tabs) |
| `/profile` | `app/profile/page.js` | User profile + change-password form |
| `/notifications` | `app/notifications/page.js` | In-app notification feed |
| `/activity` | `app/activity/page.js` | Audit log (admin) |

#### Phase 5 — POS & Inventory (NEW ★)
| Route | File | Lines | Status |
|---|---|---|---|
| `/pos` | `app/pos/page.js` | 1 014 | ✅ Built — needs seed data |
| `/products` | `app/products/page.js` | 440 | ✅ Built — needs seed data |
| `/inventory` | `app/inventory/page.js` | 666 | ✅ Built — needs seed data |
| `/purchases` | `app/purchases/page.js` | 393 | ✅ Built — needs seed data |
| `/deliveries` | `app/deliveries/page.js` | 372 | ✅ Built — needs POS sales data |
| `/pos-reports` | `app/pos-reports/page.js` | 344 | ✅ Built — will show empty until data exists |

---

## Component Library

### `components/ui.js` — Shared Primitives
| Export | Description |
|---|---|
| `<Badge value />` | Status/stage colored pill. Color derived from `value` string |
| `<StatCard label value icon color sub />` | KPI card with gradient border. Colors: `sky`, `emerald`, `violet`, `amber`, `red` |
| `<Modal open onClose title>` | Dark overlay modal, scrollable, `max-w-lg` |
| `<Input label ...props>` | Styled text input |
| `<Select label>` | Styled select |
| `<Btn variant size ...props>` | Button. Variants: `primary` (default), `ghost`, `danger` |
| `<Empty message>` | Empty state placeholder |
| `<Spinner>` | Loading spinner |

### `components/Sidebar.js`
- Role-gated navigation using `getUser()` from `lib/auth`
- Groups: CRM / Operations / Marketing / Finance / Procurement / **POS & Inventory** ★ / System
- Visibility rules: `adminOnly`, `financeOnly`, `roles[]` per item
- Active state: `pathname.startsWith(item.href)` with blue left-border highlight

### `components/Navbar.js`
- Top bar: renders page `title` + optional `subtitle` + optional `action` slot
- Used in every page via `<Navbar title="..." subtitle="..." action={<Btn>...</Btn>} />`

### `components/ClientLayoutWrapper.js`
- Auth gate: reads token from localStorage; redirects to `/login` if absent
- Wraps all non-auth pages with `<Sidebar>` + main content area
- Preserves scroll position per route via `scrollPositions` ref map

### `components/Toaster.js`
- Global toast notification system; mounted in root `app/layout.js`

### `components/Pagination.js` ★ (new)
- Props: `pagination: { page, pages, total, limit }`, `onPage: (n) => void`
- Renders nothing if `pages <= 1`
- Shows "X–Y of Z" count + prev/next + page number buttons

---

## Library Layer (`lib/`)

| File | Purpose |
|---|---|
| `lib/api.js` | Axios instance. `baseURL` from `NEXT_PUBLIC_API_URL`. Auto-injects `Bearer` token. On 401 → `removeToken()` + redirect to `/login` |
| `lib/auth.js` | `setToken / getToken / removeToken / setUser / getUser / logout`. All backed by `localStorage` (key: `crm_token`, `crm_user`) |
| `lib/utils.js` | `fmtCurrency(n, compact?)` · `fmtDate(d, opts?)` · `truncate(s, n)` · `initials(name)` |

---

## Hooks (`hooks/`)

### `useData.js`
Four exported hooks — each wraps an API call with loading/error/pagination state:
- `useLeads(params)` → `{ leads, loading, pagination, error, refetch }`
- `useClients(params)` → `{ clients, loading, pagination, refetch }`
- `useDeals(params)` → `{ deals, loading, pagination, refetch }`
- `useDashboard()` → dashboard KPI data

### `useSocket.js`
- Manages a singleton `socket.io-client` connection to `NEXT_PUBLIC_SOCKET_URL`
- Usage: `useSocket({ 'event:name': handler })` — registers/unregisters on mount/unmount
- Socket persists across route changes (module-level singleton)

---

## Code Conventions

### Mandatory Patterns
- **`'use client'`** at top of every page and interactive component (no server components)
- **API calls** only via `import api from '../../lib/api'` — never use `fetch` directly
- **Colors** always via inline `style` prop — Tailwind for layout/spacing only
- **UI primitives** always from `components/ui.js` — never inline equivalent markup
- **Auth state** via `lib/auth.js` only — never read `localStorage` directly in pages
- **No TypeScript** — plain JavaScript throughout, no `.tsx` files

### Routing
- All routes live under `app/` (Next.js App Router)
- Dynamic routes: `app/projects/[id]/page.js`
- No `pages/` directory

### State Pattern
```js
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [modal, setModal] = useState(null)    // null | 'create' | 'edit' | 'view'
const [selected, setSelected] = useState(null)

useEffect(() => { loadData() }, [])

const loadData = async () => {
  const { data } = await api.get('/endpoint')
  setData(data)
  setLoading(false)
}
```

---

## Design System

| Token | Value | Usage |
|---|---|---|
| Background | `#0D0E1A` | Page background |
| Surface | `#1A2035` | Cards, modals, panels |
| Border | `#334155` | Dividers, input borders |
| Text primary | `#ffffff` | Headings, values |
| Text secondary | `#64748b` | Labels, subtitles, placeholders |
| Primary | `#004AFF` | Buttons, active nav links |
| Accent | `#C9FC0D` | CTAs, positive metrics, price highlights |

---

## Environment

| Variable | Value | Source |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` | `.env.local` |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:5000` | `.env.local` |

**`next.config.js`:**
- `reactStrictMode: true`
- `images.unoptimized: true` (local dev — no Next.js image optimization server needed)

---

## Blockers / Known Issues

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | **No POS seed data** — Warehouses and Products tables are empty; all 6 POS pages will render empty state on first load | High | Open — seed script needed |
| 2 | **POS pages not browser-tested** — Built and wired but not verified end-to-end in a real browser session | Medium | Open |
| 3 | **Notification badge** — Sidebar bell icon shows no unread count; `useSocket` hook exists but counter not wired up | Medium | Open |
| 4 | **Pagination UI** — `Pagination.js` component exists but is not used on most list pages (leads, clients, deals, projects, campaigns) | Low | Open |
| 5 | **POS Reports empty until data exists** — Date-range selectors and tabs render but charts/tables are empty without sales/inventory data | Low | Expected until POS is used |

---

## Next Milestone — Phase 6 (POS Completion)

### 🔴 Immediate
1. **POS seed data** — create at least 1 warehouse + 10 products via UI or seed script, then smoke-test the full POS terminal flow: search product → add to cart → checkout → receipt
2. **Smoke-test all 6 POS pages** in browser with real data

### 🟡 Near-term
3. **Wire notification badge** — in `Sidebar.js`, add a `useSocket` call on `notification:new` to increment an unread counter on the bell icon
4. **Apply `<Pagination />`** to leads, clients, deals, projects, campaigns list pages
5. **Profile page review** — confirm `app/profile/page.js` renders correctly and the change-password form calls the right endpoint

### 🟢 Later
6. **Invoice PDF download** — add a download button on the invoice detail page pointing to `GET /invoices/:id/pdf` (backend endpoint pending)
7. **SMTP email** — no frontend changes needed; backend automation engine handles dispatch
