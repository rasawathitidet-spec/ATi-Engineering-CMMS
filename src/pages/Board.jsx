import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { Spinner, ErrorBox, PageHead, TypePill, StopPill, ageDays } from '../ui.jsx'

const COLS = [['new', 'รอรับงาน', 0], ['assigned', 'รอซ่อม', 3], ['working', 'กำลังดำเนินการ', 7], ['paused', 'รออะไหล่', 14], ['done', 'รอยืนยัน', 3], ['follow', 'ติดตามอาการ', 30], ['meeting', 'รอเข้าประชุม', 14]]

export default function Board() {
  const [items, setItems] = useState(null)
  const [err, setErr] = useState(null)
  const [grp, setGrp] = useState('')
  const [tech, setTech] = useState('')
  const load = () => api.listWo({ open: '1' }).then(r => setItems(r.items)).catch(setErr)
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [])
  const groups = useMemo(() => [...new Set((items || []).map(w => (w.machine_code || '').split('-')[0]).filter(Boolean))].sort(), [items])
  const techs = useMemo(() => [...new Set((items || []).flatMap(w => String(w.technicians || '').split(',').map(s => s.trim())).filter(Boolean))].sort(), [items])
  const shown = (items || []).filter(w => (!grp || (w.machine_code || '').startsWith(grp + '-')) && (!tech || String(w.technicians).includes(tech)))
  return <div className="lg:-mx-4">
    <PageHead title={`กระดานงาน · ค้าง ${items ? items.length : '…'} งาน`} sub="ตัวเลขวันสีแดง = เกินเป้าหมายของสถานะนั้น · อัปเดตทุก 1 นาที"
      right={<div className="flex gap-2"><select className="field w-auto" value={grp} onChange={e => setGrp(e.target.value)}><option value="">ทุกกลุ่มเครื่อง</option>{groups.map(g => <option key={g}>{g}</option>)}</select><select className="field w-auto" value={tech} onChange={e => setTech(e.target.value)}><option value="">ช่างทุกคน</option>{techs.map(t => <option key={t}>{t}</option>)}</select></div>} />
    <ErrorBox error={err} />
    {!items ? <Spinner /> : <div className="flex gap-3 overflow-x-auto pb-4">
      {COLS.map(([k, name, limit]) => { const L = shown.filter(w => w.status === k).sort((a, b) => (a.machine_stopped === 'Y' ? -1 : 1) - (b.machine_stopped === 'Y' ? -1 : 1)); return <div key={k} className="flex w-64 shrink-0 flex-col gap-2 rounded-2xl bg-slate-100/80 p-2.5">
        <div className="flex items-center justify-between px-1 text-sm font-semibold">{name}<span className="rounded-full bg-white px-2 text-xs tabular-nums shadow-sm">{L.length}</span></div>
        {L.map(w => { const a = ageDays(w.reported_at); return <Link key={w.wo_no} to={`/wo/${w.wo_no}`} className={`block rounded-xl border-l-4 bg-white p-3 shadow-sm transition hover:shadow-md ${w.type === 'BM' ? 'border-l-brand' : 'border-l-sky-500'}`}>
          <div className="text-sm font-semibold leading-snug">{w.machine_name || w.machine_code}</div>
          <div className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{w.symptom}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs"><span className="font-[Montserrat] font-semibold">{w.wo_no}</span><TypePill t={w.type} />{w.machine_stopped === 'Y' && <StopPill />}
            <span className={`ml-auto tabular-nums ${a > limit ? 'font-semibold text-brand' : 'text-ink-muted'}`}>{a ? `${a} วัน` : 'วันนี้'}</span></div>
          <div className="mt-1 truncate text-xs text-ink-muted">{w.technicians || 'ยังไม่มอบหมาย'}</div>
        </Link> })}
        {!L.length && <div className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-xs text-ink-muted">ไม่มีงาน</div>}
      </div> })}
    </div>}
  </div>
}
