'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { logout, getUser } from '../lib/auth'
import { useLocale } from '../hooks/useLocale'
import {
  LayoutDashboard, Crown, Users, Building2, Handshake, FolderArchive,
  CheckSquare, User, Target, Megaphone, PieChart, Receipt, CreditCard,
  Banknote, Coins, TrendingUp, Store, Bell, FileText, Settings, BarChart2,
  ShoppingCart, Package, Boxes, ShoppingBag, Truck, BarChart3, LineChart,
  ArrowDownUp, Database, Percent, Layers, Lock,
} from 'lucide-react'

const CRM_ROLES        = ['SUPER_ADMIN', 'FOUNDER_CEO', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'MARKETING_MANAGER', 'FINANCE_MANAGER']
const LEADS_ROLES      = ['SUPER_ADMIN', 'FOUNDER_CEO', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'MARKETING_MANAGER']
const DEALS_ROLES      = ['SUPER_ADMIN', 'FOUNDER_CEO', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'FINANCE_MANAGER']
const OPS_ROLES        = ['SUPER_ADMIN', 'FOUNDER_CEO', 'PROJECT_MANAGER', 'ENGINEER', 'DESIGNER', 'MARKETING_MANAGER', 'SALES_MANAGER', 'FINANCE_MANAGER']
const TASK_ROLES       = ['SUPER_ADMIN', 'FOUNDER_CEO', 'PROJECT_MANAGER', 'ENGINEER', 'DESIGNER', 'MARKETING_MANAGER', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'MEDIA_BUYER']
const TEAM_ROLES       = ['SUPER_ADMIN', 'FOUNDER_CEO', 'SALES_MANAGER', 'PROJECT_MANAGER', 'MARKETING_MANAGER']
const MILESTONE_ROLES  = ['SUPER_ADMIN', 'FOUNDER_CEO', 'PROJECT_MANAGER']
const MARKETING_ROLES  = ['SUPER_ADMIN', 'FOUNDER_CEO', 'MARKETING_MANAGER', 'MEDIA_BUYER', 'SALES_MANAGER']
const ANALYTICS_ROLES  = ['SUPER_ADMIN', 'FOUNDER_CEO', 'MARKETING_MANAGER']
const FINANCE_ROLES    = ['SUPER_ADMIN', 'FOUNDER_CEO', 'FINANCE_MANAGER', 'ACCOUNTANT']
const PROC_ROLES       = ['SUPER_ADMIN', 'FOUNDER_CEO', 'PROJECT_MANAGER', 'PROCUREMENT', 'FINANCE_MANAGER']
const POS_ROLES        = ['SUPER_ADMIN', 'FOUNDER_CEO', 'CASHIER', 'WAREHOUSE_STAFF', 'FINANCE_MANAGER']
const PROD_ROLES       = ['SUPER_ADMIN', 'CASHIER', 'WAREHOUSE_STAFF']
const INV_ROLES        = ['SUPER_ADMIN', 'WAREHOUSE_STAFF', 'FINANCE_MANAGER', 'FOUNDER_CEO']
const PURCH_ROLES      = ['SUPER_ADMIN', 'WAREHOUSE_STAFF']
const DELIV_ROLES      = ['SUPER_ADMIN', 'FOUNDER_CEO', 'DELIVERY_DRIVER', 'WAREHOUSE_STAFF']
const POSREP_ROLES     = ['SUPER_ADMIN', 'FOUNDER_CEO', 'FINANCE_MANAGER']
const ACTIVITY_ROLES   = ['SUPER_ADMIN', 'FOUNDER_CEO']

const NAV_CONFIG = [
  { groupKey: 'nav.crm', items: [
    { href: '/dashboard',     labelKey: 'nav.dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/dashboard/ceo', labelKey: 'nav.ceo_view',  icon: <Crown size={18} />,       roles: ['SUPER_ADMIN', 'FOUNDER_CEO'] },
    { href: '/leads',         labelKey: 'nav.leads',     icon: <Users size={18} />,        roles: LEADS_ROLES },
    { href: '/clients',       labelKey: 'nav.clients',   icon: <Building2 size={18} />,    roles: CRM_ROLES },
    { href: '/deals',         labelKey: 'nav.deals',     icon: <Handshake size={18} />,    roles: DEALS_ROLES },
  ]},
  { groupKey: 'nav.operations', items: [
    { href: '/projects',            labelKey: 'nav.projects',    icon: <FolderArchive size={18} />, roles: OPS_ROLES },
    { href: '/tasks',               labelKey: 'nav.tasks',       icon: <CheckSquare size={18} />,   roles: TASK_ROLES },
    { href: '/team',                labelKey: 'nav.team',        icon: <User size={18} />,          roles: TEAM_ROLES },
    { href: '/projects/milestones', labelKey: 'nav.milestones',  icon: <Target size={18} />,        roles: MILESTONE_ROLES },
  ]},
  { groupKey: 'nav.marketing_group', items: [
    { href: '/marketing',           labelKey: 'nav.campaigns', icon: <Megaphone size={18} />, roles: MARKETING_ROLES },
    { href: '/marketing/analytics', labelKey: 'nav.analytics', icon: <BarChart2 size={18} />, roles: ANALYTICS_ROLES },
  ]},
  { groupKey: 'nav.finance_group', items: [
    { href: '/finance',                labelKey: 'nav.finance_overview',        icon: <PieChart size={18} />,    roles: FINANCE_ROLES },
    { href: '/finance/invoices',       labelKey: 'nav.invoices',        icon: <Receipt size={18} />,     roles: FINANCE_ROLES },
    { href: '/finance/payments',       labelKey: 'nav.payments',        icon: <CreditCard size={18} />,  roles: FINANCE_ROLES },
    { href: '/finance/expenses',       labelKey: 'nav.expenses',        icon: <Banknote size={18} />,    roles: FINANCE_ROLES },
    { href: '/finance/payroll',        labelKey: 'nav.payroll',         icon: <Coins size={18} />,       roles: FINANCE_ROLES },
    { href: '/finance/reports',        labelKey: 'nav.reports',         icon: <TrendingUp size={18} />,  roles: FINANCE_ROLES },
    { href: '/finance/pnl',            labelKey: 'nav.pnl',             icon: <LineChart size={18} />,   roles: FINANCE_ROLES },
    { href: '/finance/cash-flow',      labelKey: 'nav.cash_flow',       icon: <ArrowDownUp size={18} />, roles: FINANCE_ROLES },
    { href: '/finance/cogs',           labelKey: 'nav.cogs',            icon: <Database size={18} />,    roles: FINANCE_ROLES },
    { href: '/finance/fixed-costs',    labelKey: 'nav.fixed_costs',     icon: <Lock size={18} />,        roles: FINANCE_ROLES },
    { href: '/finance/business-units', labelKey: 'nav.business_units',  icon: <Layers size={18} />,      roles: FINANCE_ROLES },
    { href: '/finance/allocation',     labelKey: 'nav.allocation',      icon: <Percent size={18} />,     roles: FINANCE_ROLES },
  ]},
  { groupKey: 'nav.procurement_group', items: [
    { href: '/procurement', labelKey: 'nav.procurement', icon: <Store size={18} />, roles: PROC_ROLES },
  ]},
  { groupKey: 'nav.pos_inventory', items: [
    { href: '/pos',          labelKey: 'nav.pos_terminal', icon: <ShoppingCart size={18} />, roles: POS_ROLES },
    { href: '/products',     labelKey: 'nav.products',     icon: <Package size={18} />,      roles: PROD_ROLES },
    { href: '/inventory',    labelKey: 'nav.inventory',    icon: <Boxes size={18} />,        roles: INV_ROLES },
    { href: '/purchases',    labelKey: 'nav.purchases',    icon: <ShoppingBag size={18} />,  roles: PURCH_ROLES },
    { href: '/deliveries',   labelKey: 'nav.deliveries',   icon: <Truck size={18} />,        roles: DELIV_ROLES },
    { href: '/pos-reports',  labelKey: 'nav.pos_reports',  icon: <BarChart3 size={18} />,    roles: POSREP_ROLES },
  ]},
  { groupKey: 'nav.system', items: [
    { href: '/notifications', labelKey: 'nav.notifications', icon: <Bell size={18} /> },
    { href: '/activity',      labelKey: 'nav.activity_log',  icon: <FileText size={18} />,  roles: ACTIVITY_ROLES },
    { href: '/users',         labelKey: 'nav.users',         icon: <Settings size={18} />,  roles: ['SUPER_ADMIN'] },
  ]},
]

const ALL_HREFS = NAV_CONFIG.flatMap(g => g.items.map(i => i.href))

const EXACT_ONLY = new Set(['/dashboard', '/finance', '/marketing', '/marketing/analytics', '/procurement'])

function isActive(pathname, href) {
  if (pathname === href) return true
  if (EXACT_ONLY.has(href)) return false
  if (!pathname.startsWith(href + '/')) return false
  return !ALL_HREFS.some(h => h !== href && h.startsWith(href + '/') && (pathname === h || pathname.startsWith(h + '/')))
}

export default function Sidebar() {
  const pathname = usePathname()
  const user = getUser()
  const role = user?.role
  const { t, dir } = useLocale()

  const isVisible = (item) => {
    if (!item.roles) return true
    if (role === 'SUPER_ADMIN') return true
    return item.roles.includes(role)
  }

  return (
    <aside className="w-56 flex flex-col h-screen sticky top-0 border-r" style={{ background: 'var(--bg)', borderColor: 'var(--sidebar-border)' }}>
      <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <Image src="/logo.png" alt="CAI2RUS" width={130} height={36} className="object-contain" priority />
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto scrollbar-thin">
        {NAV_CONFIG.map(({ groupKey, items }) => {
          const visible = items.filter(isVisible)
          if (visible.length === 0) return null
          return (
            <div key={groupKey} className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1" style={{ color: 'var(--text-muted)' }}>{t(groupKey)}</p>
              {visible.map(item => {
                const active = isActive(pathname, item.href)
                return (
                  <Link key={item.href} href={item.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all mb-0.5"
                    style={active
                      ? {
                          background: 'rgba(0,74,255,0.15)',
                          color: 'var(--text)',
                          [dir === 'rtl' ? 'borderRight' : 'borderLeft']: '2px solid var(--brand-blue)',
                        }
                      : { color: 'var(--text-secondary)' }}>
                    <span className="text-base leading-none">{item.icon}</span>
                    {t(item.labelKey)}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div className="px-2 py-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        <Link href="/profile" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/5 transition">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'var(--brand-blue)' }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text)' }}>{user?.name || t('common.user')}</p>
            <p className="text-[10px] text-slate-500 capitalize">{role?.toLowerCase().replace(/_/g, ' ')}</p>
          </div>
          <button onClick={(e) => { e.preventDefault(); logout() }} title={t('common.logout')}
            className="text-slate-600 hover:text-red-400 transition flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </Link>
      </div>
    </aside>
  )
}
