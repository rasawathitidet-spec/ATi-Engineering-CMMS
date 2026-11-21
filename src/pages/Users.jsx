import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { ROLE_TH, useAuth } from '../auth.jsx'
import { Spinner, ErrorBox, PageHead, useToast } from '../ui.jsx'

export default function Users() {
  const { user } = useAuth()
  const toast = useToast()
  const [list, setList] = useState(null)
  const [err, setErr] = useState(null)
  const [f, setF] = useState({ emp_code: '', name: '', role: 'requester', email: '', line: '', pin: '' })
  const [busy, setBusy] = useState(false)
  const load = () => api.users().then(r => setList(r.users)).catch(setErr)
  useEffect(() => { load() }, [])
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }))
  const roles = Object.keys(ROLE_TH).filter(r => r !== 'admin' || user.role === 'admin')
  const create = async e => { e.preventDefault(); setBusy(true); setErr(null); try { await api.userAction({ action: 'create', ...f }); toast('เพิ่มผู้ใช้แล้ว'); setF({ emp_code: '', name: '', role: 'requester', email: '', line: '', pin: '' }); load() } catch (e) { setErr(e) } finally { setBusy(false) } }
  const resetPin = async code => { const pin = window.prompt?.(`ตั้ง PIN ใหม่ (4-6 หลัก) ให้ ${code}`); if (!pin) return; try { await api.userAction({ action: 'setPin', emp_code: code, pin }); toast('ตั้ง PIN แล้ว'); load() } catch (e) { setErr(e) } }
  const update = async (code, patch) => { try { await api.userAction({ action: 'update', emp_code: code, ...patch }); load() } catch (e) { setErr(e) } }

  return <div>
    <PageHead title="ผู้ใช้งาน" sub="เพิ่มพนักงาน กำหนดบทบาท และตั้ง PIN" />
    <ErrorBox error={err} />
    <form onSubmit={create} className="card mb-4 grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-7">
      <input className="field" placeholder="รหัสพนักงาน" value={f.emp_code} onChange={set('emp_code')} required />
      <input className="field lg:col-span-2" placeholder="ชื่อ-นามสกุล / ชื่อเล่น" value={f.name} onChange={set('name')} required />
      <select className="field" value={f.role} onChange={set('role')}>{roles.map(r => <option key={r} value={r}>{ROLE_TH[r]}</option>)}</select>
      <input className="field" placeholder="อีเมล Google (ถ้ามี)" value={f.email} onChange={set('email')} type="email" />
      <input className="field" placeholder="PIN 4-6 หลัก" value={f.pin} onChange={e => setF(x => ({ ...x, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} inputMode="numeric" />
      <button className="btn-primary" disabled={busy}>เพิ่มผู้ใช้</button>
    </form>
    {!list ? <Spinner /> : <div className="card overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className="border-b border-line text-left text-xs text-ink-muted"><th className="px-4 py-2.5">รหัส</th><th>ชื่อ</th><th>บทบาท</th><th>อีเมล</th><th>PIN</th><th>สถานะ</th></tr></thead>
      <tbody>{list.map(u => { const active = String(u.active).toUpperCase() !== 'FALSE'; return <tr key={u.emp_code} className="border-b border-line last:border-0">
        <td className="px-4 py-2 font-[Montserrat] font-semibold">{u.emp_code}</td><td>{u.name}</td>
        <td><select className="rounded-lg border border-line bg-white px-2 py-1" value={u.role} onChange={e => update(u.emp_code, { role: e.target.value })} disabled={u.role === 'admin' && user.role !== 'admin'}>{Object.keys(ROLE_TH).map(r => <option key={r} value={r} disabled={r === 'admin' && user.role !== 'admin'}>{ROLE_TH[r]}</option>)}</select></td>
        <td className="text-ink-muted">{u.email || '-'}</td>
        <td><button className="text-brand hover:underline" onClick={() => resetPin(u.emp_code)}>{u.has_pin ? 'ตั้งใหม่' : 'ตั้ง PIN'}</button></td>
        <td><button onClick={() => update(u.emp_code, { active: !active })} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{active ? 'ใช้งาน' : 'ปิด'}</button></td>
      </tr> })}</tbody></table></div>}
  </div>
}
