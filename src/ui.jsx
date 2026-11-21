import { createContext, useContext, useState, useCallback } from 'react'

/* ---------- Icons (inline, stroke) ---------- */
const P = {
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  board: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  cog: 'M4 6h16M4 12h16M4 18h16',
  qr: 'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  plus: 'M12 5v14M5 12h14',
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  play: 'M6 4l14 8-14 8z', pause: 'M6 4h4v16H6zM14 4h4v16h-4z', check: 'M20 6 9 17l-5-5',
  back: 'M15 18l-6-6 6-6', logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2', alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3', home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  printer: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
}
export function Icon({ name, className = 'w-5 h-5', ...rest }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...rest}><path d={P[name]} /></svg>
}

/* ---------- Status ---------- */
export const STATUS = {
  new: { th: 'รอรับงาน', cls: 'bg-slate-100 text-slate-700' },
  assigned: { th: 'รอซ่อม', cls: 'bg-amber-50 text-amber-700' },
  working: { th: 'กำลังดำเนินการ', cls: 'bg-sky-50 text-sky-700' },
  paused: { th: 'รออะไหล่', cls: 'bg-violet-50 text-violet-700' },
  done: { th: 'ซ่อมเสร็จ รอยืนยัน', cls: 'bg-emerald-50 text-emerald-700' },
  follow: { th: 'ติดตามอาการ', cls: 'bg-teal-50 text-teal-700' },
  meeting: { th: 'รอเข้าประชุม', cls: 'bg-fuchsia-50 text-fuchsia-700' },
  closed: { th: 'ปิดงาน', cls: 'bg-emerald-600 text-white' },
}
export function StatusPill({ s }) {
  const x = STATUS[s] || { th: s || '-', cls: 'bg-slate-100 text-slate-600' }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${x.cls}`}>{x.th}</span>
}
export function TypePill({ t }) {
  if (!t) return null
  const cls = t === 'BM' ? 'bg-red-50 text-red-700 ring-red-200' : t === 'PM' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-sky-50 text-sky-700 ring-sky-200'
  return <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-bold ring-1 ${cls}`}>{t}</span>
}
export function StopPill() { return <span className="inline-flex rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-bold text-white">เครื่องหยุด</span> }

/* ---------- Formatting (เวลาไทย) ---------- */
const TZ = { timeZone: 'Asia/Bangkok' }
export const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('th-TH', { ...TZ, day: 'numeric', month: 'short', year: '2-digit' }) : '-'
export const fmtDateTime = iso => iso ? new Date(iso).toLocaleString('th-TH', { ...TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'
export const fmtMin = m => { m = Number(m) || 0; if (!m) return '-'; const h = Math.floor(m / 60), r = Math.round(m % 60); return h ? `${h} ชม.${r ? ` ${r} นาที` : ''}` : `${r} นาที` }
export const ageDays = iso => iso ? Math.floor((Date.now() - new Date(iso)) / 864e5) : 0
export const photoList = s => String(s || '').split(/\s+/).filter(Boolean)

/* ---------- Bits ---------- */
export function Spinner({ label = 'กำลังโหลด…' }) {
  return <div className="flex items-center justify-center gap-3 py-16 text-ink-muted"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />{label}</div>
}
export function Empty({ title, children }) {
  return <div className="card px-6 py-12 text-center"><div className="font-semibold">{title}</div>{children && <div className="mt-1 text-sm text-ink-muted">{children}</div>}</div>
}
export function ErrorBox({ error }) {
  if (!error) return null
  return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{String(error.message || error)}</div>
}
export function PageHead({ eyebrow, title, sub, right }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>{eyebrow && <span className="eyebrow mb-2">{eyebrow}</span>}<h1 className="text-xl font-semibold leading-snug lg:text-2xl">{title}</h1>{sub && <p className="mt-0.5 text-sm text-ink-muted">{sub}</p>}</div>
    {right}
  </div>
}

/* ---------- Toast ---------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null)
  const show = useCallback(m => { setMsg(m); clearTimeout(window.__tt); window.__tt = setTimeout(() => setMsg(null), 3000) }, [])
  return <ToastCtx.Provider value={show}>{children}
    <div role="status" className={`fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[90vw] rounded-xl bg-ink px-4 py-2.5 text-sm text-white shadow-lg transition lg:bottom-8 ${msg ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}>{msg}</div>
  </ToastCtx.Provider>
}
