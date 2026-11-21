import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth, can } from '../auth.jsx'
import { Icon, Spinner, ErrorBox, StatusPill, TypePill, StopPill, STATUS, fmtDateTime, fmtDate, fmtMin, photoList, useToast } from '../ui.jsx'

const techs = wo => String(wo.technicians || '').split(',').map(s => s.trim()).filter(Boolean)

function useTick(on) {
  const [, set] = useState(0)
  useEffect(() => { if (!on) return; const t = setInterval(() => set(x => x + 1), 1000); return () => clearInterval(t) }, [on])
}
const clock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, (s % 3600) / 60, s % 60].map(n => String(Math.floor(n)).padStart(2, '0')).join(':') }

export default function WorkOrder() {
  const { no } = useParams()
  const { user, boot } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [d, setD] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => api.getWo(no).then(setD).catch(setErr), [no])
  useEffect(() => { load() }, [load])

  const wo = d?.wo
  useTick(wo?.status === 'working')
  if (err && !d) return <ErrorBox error={err} />
  if (!wo) return <Spinner />

  const isMgr = can(user, 'manager')
  const isTech = isMgr || techs(wo).includes(user.name)
  const isMine = wo.requester_code === user.code || (!wo.requester_code && wo.requester === user.name)
  const run = async (action, extra, msg) => {
    setBusy(true); setErr(null)
    try { await api.woAction(wo.wo_no, action, extra); toast(msg); await load() } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const liveMin = (Number(wo.repair_min) || 0) * 60000 + (wo.work_started ? Date.now() - new Date(wo.work_started) : 0)

  return <div className="mx-auto max-w-5xl">
    <button onClick={() => nav(-1)} className="btn-ghost -ml-2 mb-2 px-2 py-1 text-sm"><Icon name="back" className="h-4 w-4" />ย้อนกลับ</button>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted"><span className="font-[Montserrat] text-base font-bold text-ink">#{wo.wo_no}</span><TypePill t={wo.type} />{wo.machine_stopped === 'Y' && wo.status !== 'closed' && <StopPill />}<span>แจ้ง {fmtDateTime(wo.reported_at)} โดย {wo.requester}</span></div>
        <h1 className="mt-1 text-xl font-semibold lg:text-2xl">{wo.machine_name || 'ไม่ระบุเครื่อง'}</h1>
        <div className="text-sm text-ink-muted">{wo.machine_code}{wo.line && ` · ไลน์ ${wo.line}`}</div>
      </div>
      <StatusPill s={wo.status} />
    </div>

    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <section className="card p-4">
          <div className="text-xs font-semibold text-ink-muted">อาการที่พบ</div>
          <div className="mt-1 font-medium">{wo.symptom}</div>
          {wo.detail && <p className="mt-1 text-sm text-ink-muted">{wo.detail}</p>}
          {photoList(wo.photos).length > 0 && <div className="mt-3 flex flex-wrap gap-2">{photoList(wo.photos).map(u => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="รูปแจ้งซ่อม" className="h-24 w-24 rounded-xl object-cover ring-1 ring-line" /></a>)}</div>}
        </section>

        {(wo.cause || wo.solution || wo.parts) && <section className="card p-4">
          <div className="mb-2 font-semibold">ผลการซ่อม</div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {wo.system && <><dt className="text-ink-muted">ระบบ</dt><dd>{wo.system}{wo.action && ` · ${wo.action}`}</dd></>}
            {wo.cause && <><dt className="text-ink-muted">สาเหตุ</dt><dd className="whitespace-pre-line">{wo.cause}</dd></>}
            {wo.solution && <><dt className="text-ink-muted">การแก้ไข</dt><dd className="whitespace-pre-line">{wo.solution}</dd></>}
            {wo.parts && <><dt className="text-ink-muted">อะไหล่</dt><dd className="whitespace-pre-line">{wo.parts}</dd></>}
            <dt className="text-ink-muted">ช่าง</dt><dd>{wo.technicians || '-'}</dd>
            <dt className="text-ink-muted">เวลาซ่อม</dt><dd>{fmtMin(wo.repair_min)}</dd>
            {wo.downtime_min && <><dt className="text-ink-muted">เครื่องหยุด</dt><dd>{fmtMin(wo.downtime_min)}</dd></>}
          </dl>
        </section>}

        <ErrorBox error={err} />
        {/* ---------- Actions ---------- */}
        {isMgr && ['new', 'assigned', 'meeting', 'follow', 'paused', 'working'].includes(wo.status) && <AssignPanel wo={wo} boot={boot} busy={busy} run={run} />}
        {isTech && ['new', 'assigned', 'working', 'paused'].includes(wo.status) && (wo.status !== 'new' || isMgr) && <TechPanel wo={wo} boot={boot} busy={busy} run={run} live={liveMin} />}
        {(isMine || isMgr) && wo.status === 'done' && <ConfirmPanel busy={busy} run={run} />}
        {isMgr && wo.status !== 'closed' && <div className="flex flex-wrap gap-2">
          <button className="btn-outline text-sm" disabled={busy} onClick={() => run('meeting', {}, 'ส่งเข้าคิวประชุม RCA แล้ว')}>ส่งเข้าประชุม (RCA)</button>
          <button className="btn-outline text-sm" disabled={busy} onClick={() => run('follow', {}, 'ตั้งเป็นติดตามอาการแล้ว')}>ติดตามอาการ</button>
          <button className="btn-outline text-sm" disabled={busy} onClick={() => run('close', {}, 'ปิดงานแล้ว')}>ปิดงานโดยหัวหน้า</button>
        </div>}
      </div>

      <aside className="space-y-4">
        <section className="card p-4">
          <div className="mb-3 font-semibold">ไทม์ไลน์</div>
          <ol className="space-y-3">
            {[{ at: wo.reported_at, to_status: 'new', by: wo.requester, note: 'แจ้งซ่อม' }, ...(d.history || []).filter(h => h.from_status)].map((h, i) => <li key={i} className="flex gap-3 text-sm">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
              <div><div className="font-medium">{STATUS[h.to_status]?.th || h.to_status}</div><div className="text-xs text-ink-muted">{fmtDateTime(h.at)} · {h.by}{h.note && ` · ${h.note}`}</div></div>
            </li>)}
          </ol>
        </section>
        <section className="card p-4">
          <div className="mb-1 font-semibold">ประวัติเครื่องนี้</div>
          <div className="mb-2 text-xs text-ink-muted">แจ้งซ่อมทั้งหมด {d.machineCount} ครั้ง</div>
          {d.machineHistory?.length ? <ul className="divide-y divide-line">{d.machineHistory.map(h => <li key={h.wo_no} className="py-2 text-sm"><Link to={`/wo/${h.wo_no}`} className="hover:text-brand"><span className="font-[Montserrat] text-xs font-semibold">{h.wo_no}</span> · {fmtDate(h.reported_at)}<div className="line-clamp-1 text-ink-muted">{h.symptom}</div></Link></li>)}</ul> : <div className="text-sm text-ink-muted">ไม่มีประวัติก่อนหน้า</div>}
        </section>
      </aside>
    </div>
  </div>
}

function AssignPanel({ wo, boot, busy, run }) {
  const [sel, setSel] = useState(techs(wo))
  const [type, setType] = useState(wo.type || 'CM')
  return <section className="card p-4">
    <div className="mb-2 font-semibold">มอบหมายช่าง</div>
    <div className="flex flex-wrap gap-2">{(boot?.technicians || []).map(t => { const on = sel.includes(t.name); return <button key={t.code} aria-pressed={on} onClick={() => setSel(s => on ? s.filter(x => x !== t.name) : [...s, t.name])} className={`chip ${on ? 'chip-on' : ''}`}>{t.name}</button> })}</div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-sm text-ink-muted">ประเภท</span>{['BM', 'CM', 'PM'].map(t => <button key={t} aria-pressed={type === t} onClick={() => setType(t)} className={`chip ${type === t ? 'chip-on' : ''}`}>{t}</button>)}
      <button className="btn-primary ml-auto" disabled={busy || !sel.length} onClick={() => run('assign', { technicians: sel, type }, `มอบหมายให้ ${sel.join(', ')} แล้ว`)}>บันทึกการมอบหมาย</button></div>
  </section>
}

function TechPanel({ wo, boot, busy, run, live }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ system: wo.system || '', action_type: wo.action || '', cause: wo.cause || '', solution: wo.solution || '', parts: wo.parts || '' })
  const [team, setTeam] = useState(techs(wo))
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }))
  const working = wo.status === 'working'
  return <section className="card p-4">
    <div className="rounded-2xl bg-canvas p-4 text-center">
      <div className="text-xs text-ink-muted">{working ? `กำลังซ่อม · เริ่ม ${fmtDateTime(wo.work_started)}` : wo.status === 'paused' ? 'พัก / รออะไหล่ — หยุดนับเวลาซ่อม' : 'ยังไม่เริ่มซ่อม'}</div>
      <div className="font-[Montserrat] text-4xl font-semibold tabular-nums">{clock(live)}</div>
      <div className="mt-3 flex justify-center gap-2">
        {!working && <button className="btn-primary" disabled={busy} onClick={() => run('start', {}, 'เริ่มนับเวลาซ่อม')}><Icon name="play" className="h-4 w-4" />{wo.status === 'paused' ? 'ซ่อมต่อ' : 'เริ่มซ่อม'}</button>}
        {working && <button className="btn-outline" disabled={busy} onClick={() => run('pause', {}, 'หยุดนับเวลา (รออะไหล่)')}><Icon name="pause" className="h-4 w-4" />พัก / รออะไหล่</button>}
        {['working', 'paused'].includes(wo.status) && <button className="btn-success" disabled={busy} onClick={() => setOpen(true)}><Icon name="check" className="h-4 w-4" />ซ่อมเสร็จ</button>}
      </div>
    </div>
    {open && <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="sys">ระบบ</label><select id="sys" className="field" value={f.system} onChange={set('system')}><option value="">— เลือก —</option>{(boot?.lists.system || []).map(s => <option key={s}>{s}</option>)}</select></div>
        <div><label className="label" htmlFor="act">รายการ</label><select id="act" className="field" value={f.action_type} onChange={set('action_type')}><option value="">— เลือก —</option>{(boot?.lists.action || []).map(s => <option key={s}>{s}</option>)}</select></div>
      </div>
      <div><label className="label" htmlFor="cause">สาเหตุ *</label><textarea id="cause" className="field" rows={2} value={f.cause} onChange={set('cause')} /></div>
      <div><label className="label" htmlFor="sol">การแก้ไข *</label><textarea id="sol" className="field" rows={2} value={f.solution} onChange={set('solution')} /></div>
      <div><label className="label" htmlFor="parts">อะไหล่ที่เปลี่ยน (ชื่อ ขนาด จำนวน)</label><textarea id="parts" className="field" rows={2} placeholder="เช่น ลูกปืน FAG 6202-C-2Z C3 จำนวน 2" value={f.parts} onChange={set('parts')} /></div>
      <div><div className="label">ช่างร่วมงาน</div><div className="flex flex-wrap gap-2">{(boot?.technicians || []).map(t => { const on = team.includes(t.name); return <button key={t.code} aria-pressed={on} onClick={() => setTeam(s => on ? s.filter(x => x !== t.name) : [...s, t.name])} className={`chip ${on ? 'chip-on' : ''}`}>{t.name}</button> })}</div></div>
      <button className="btn-primary w-full py-3" disabled={busy || !f.cause.trim() || !f.solution.trim()} onClick={() => run('finish', { ...f, technicians: team }, 'ส่งให้ผู้แจ้งยืนยันแล้ว')}>ส่งให้ผู้แจ้งยืนยัน</button>
    </div>}
  </section>
}

function ConfirmPanel({ busy, run }) {
  const [note, setNote] = useState('')
  return <section className="card border-emerald-200 p-4">
    <div className="font-semibold">ยืนยันผลซ่อม</div>
    <p className="mb-3 text-sm text-ink-muted">ตรวจเครื่องแล้วเลือกผล ถ้ายังไม่หาย งานจะกลับไปที่ช่าง</p>
    <textarea className="field mb-3" rows={2} placeholder="หมายเหตุ (ถ้ามี)" value={note} onChange={e => setNote(e.target.value)} />
    <div className="grid grid-cols-2 gap-2">
      <button className="btn-success py-3" disabled={busy} onClick={() => run('confirm', { ok: true, note }, 'ปิดงานแล้ว ขอบคุณครับ')}>ใช้งานได้ปกติ</button>
      <button className="btn-outline py-3" disabled={busy} onClick={() => run('confirm', { ok: false, note }, 'ตีกลับให้ช่างแล้ว')}>ยังไม่หาย</button>
    </div>
  </section>
}
