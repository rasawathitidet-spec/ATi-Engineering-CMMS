import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth, homeFor } from '../auth.jsx'
import { ErrorBox, Icon } from '../ui.jsx'

export default function Login() {
  const { user, setUser } = useAuth()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const gRef = useRef(null)
  const next = sp.get('next')
  const done = u => { setUser(u); nav(next && next !== '/login' ? next : homeFor(u.role), { replace: true }) }

  useEffect(() => {
    const cid = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!cid) return
    let tries = 0
    const t = setInterval(() => {
      if (window.google?.accounts?.id && gRef.current) {
        clearInterval(t)
        window.google.accounts.id.initialize({
          client_id: cid,
          callback: async r => { setErr(null); setBusy(true); try { done((await api.loginGoogle(r.credential)).user) } catch (e) { setErr(e) } finally { setBusy(false) } },
        })
        window.google.accounts.id.renderButton(gRef.current, { theme: 'outline', size: 'large', width: 320, text: 'signin_with', shape: 'pill', locale: 'th' })
      } else if (++tries > 40) clearInterval(t)
    }, 150)
    return () => clearInterval(t)
  }, []) // eslint-disable-line

  if (user) return <Navigate to={next || homeFor(user.role)} replace />

  const submit = async e => {
    e.preventDefault(); setErr(null); setBusy(true)
    try { done((await api.loginPin(code, pin)).user) } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  return <div className="min-h-screen lg:grid lg:grid-cols-2">
    <section className="relative hidden overflow-hidden bg-brand-grad p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border-2 border-white text-base font-bold">ATi</span><div><div className="font-semibold">Aluminium Tube Industrial</div><div className="text-sm text-white/80">แผนกวิศวกรรม</div></div></div>
      <div>
        <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/30">FM-EN-07 · ระบบแจ้งซ่อมเครื่องจักร</span>
        <h1 className="mt-5 text-4xl font-bold leading-tight" style={{ textWrap: 'balance' }}>แจ้งซ่อมจากหน้าเครื่อง<br />ติดตามได้ทุกขั้นตอน</h1>
        <p className="mt-4 max-w-md text-white/85">สแกน QR ที่เครื่อง แนบรูป ส่งถึงหัวหน้าช่างทันที ช่างจับเวลาซ่อมจริง และผู้แจ้งยืนยันก่อนปิดงาน</p>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        {[['QR', 'แจ้งซ่อมจากหน้าเครื่อง'], ['⏱', 'เวลาซ่อมจริงเป็นนาที'], ['✓', 'ผู้แจ้งยืนยันก่อนปิด']].map(([a, b]) => <div key={b} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20"><div className="text-xl font-bold">{a}</div><div className="mt-1 text-white/85">{b}</div></div>)}
      </div>
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
    </section>

    <section className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3 lg:hidden"><span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-grad font-bold text-white">ATi</span><div><div className="font-semibold">ATi แจ้งซ่อม</div><div className="text-xs text-ink-muted">Engineering CMMS</div></div></div>
        <div className="card p-6">
          <h2 className="text-lg font-semibold">เข้าสู่ระบบ</h2>
          <p className="mb-5 text-sm text-ink-muted">ใช้รหัสพนักงานและ PIN หรือบัญชี Google ของบริษัท</p>
          <form onSubmit={submit} className="space-y-3">
            <div><label className="label" htmlFor="code">รหัสพนักงาน</label><input id="code" className="field" value={code} onChange={e => setCode(e.target.value)} autoComplete="username" placeholder="เช่น 650123" required /></div>
            <div><label className="label" htmlFor="pin">PIN</label><input id="pin" className="field tracking-[.4em]" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" type="password" autoComplete="current-password" placeholder="••••" required /></div>
            <ErrorBox error={err} />
            <button className="btn-primary w-full py-3" disabled={busy}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
          </form>
          {import.meta.env.VITE_GOOGLE_CLIENT_ID && <>
            <div className="my-5 flex items-center gap-3 text-xs text-ink-muted"><span className="h-px flex-1 bg-line" />หรือ<span className="h-px flex-1 bg-line" /></div>
            <div ref={gRef} className="flex justify-center" />
          </>}
        </div>
        <p className="mt-4 text-center text-xs text-ink-muted">ลืม PIN? ติดต่อหัวหน้าช่างหรือผู้ดูแลระบบ</p>
      </div>
    </section>
  </div>
}
