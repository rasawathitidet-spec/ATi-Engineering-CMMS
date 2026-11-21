import { NavLink, Outlet } from 'react-router-dom'
import { useAuth, ROLE_TH, can } from './auth.jsx'
import { Icon } from './ui.jsx'

export function navFor(user) {
  return [
    { to: '/report', label: 'แจ้งซ่อม', icon: 'plus', show: true },
    { to: '/my', label: 'งานที่ฉันแจ้ง', icon: 'list', show: true },
    { to: '/jobs', label: 'งานช่าง', icon: 'wrench', show: can(user, 'technician', 'manager') },
    { to: '/board', label: 'กระดานงาน', icon: 'board', show: can(user, 'manager') },
    { to: '/dashboard', label: 'Dashboard', icon: 'chart', show: can(user, 'manager', 'executive') },
    { to: '/machines', label: 'เครื่องจักร', icon: 'qr', show: true },
    { to: '/users', label: 'ผู้ใช้งาน', icon: 'users', show: can(user, 'manager') },
  ].filter(n => n.show)
}

export function Logo({ light }) {
  return <div className="flex items-center gap-2.5">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-grad text-sm font-bold text-white shadow-sm ring-2 ring-white/60">ATi</span>
    <div className="leading-tight"><div className={`text-[15px] font-semibold ${light ? 'text-white' : ''}`}>ATi แจ้งซ่อม</div><div className={`text-[11px] ${light ? 'text-white/80' : 'text-ink-muted'}`}>Engineering CMMS</div></div>
  </div>
}

export default function Layout() {
  const { user, logout } = useAuth()
  const nav = navFor(user)
  const mobile = nav.slice(0, 5)
  return <div className="min-h-screen lg:flex">
    {/* Desktop sidebar */}
    <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white px-4 py-5 lg:flex">
      <Logo />
      <nav className="mt-8 flex flex-col gap-1">
        {nav.map(n => <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition ${isActive ? 'bg-brand/10 font-semibold text-brand' : 'text-ink-muted hover:bg-canvas hover:text-ink'}`}><Icon name={n.icon} />{n.label}</NavLink>)}
      </nav>
      <div className="mt-auto rounded-2xl bg-canvas p-3">
        <div className="text-sm font-semibold">{user.name}</div>
        <div className="text-xs text-ink-muted">{ROLE_TH[user.role]} · {user.code}</div>
        <button onClick={logout} className="btn-ghost mt-2 w-full justify-start px-2 py-1.5 text-sm"><Icon name="logout" className="h-4 w-4" />ออกจากระบบ</button>
      </div>
    </aside>

    {/* Mobile header */}
    <div className="flex-1 min-w-0">
      <header className="no-print sticky top-0 z-30 flex items-center justify-between bg-brand-grad px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] text-white lg:hidden">
        <Logo light />
        <button onClick={logout} className="rounded-lg bg-white/15 px-2.5 py-1 text-xs">{user.name.split(' ')[0]} · ออก</button>
      </header>
      <main className="pb-safe mx-auto max-w-6xl px-4 pt-5 lg:px-8 lg:pt-8"><Outlet /></main>
    </div>

    {/* Mobile bottom nav */}
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${mobile.length}, 1fr)` }}>
      {mobile.map(n => <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'font-semibold text-brand' : 'text-ink-muted'}`}><Icon name={n.icon} className="h-[22px] w-[22px]" />{n.label}</NavLink>)}
    </nav>
  </div>
}
