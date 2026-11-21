import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Spinner, ErrorBox, PageHead, fmtMin } from '../ui.jsx'

const pct = x => (x * 100).toFixed(1)
function Tile({ k, v, unit, s, tone }) {
  const bar = { warn: 'bg-amber-500', crit: 'bg-brand', good: 'bg-emerald-500' }[tone] || 'bg-slate-300'
  return <div className="card relative overflow-hidden p-4"><span className={`absolute inset-x-0 top-0 h-1 ${bar}`} /><div className="text-xs text-ink-muted">{k}</div><div className="font-[Montserrat] text-3xl font-semibold tabular-nums">{v}<span className="ml-1 text-sm font-medium text-ink-muted">{unit}</span></div><div className="text-xs text-ink-muted">{s}</div></div>
}

function Monthly({ data }) {
  const W = 560, H = 230, L = 34, B = 190, T = 16
  const max = Math.max(10, ...data.map(d => d.total)); const top = Math.ceil(max / 10) * 10
  const step = (W - L - 10) / Math.max(1, data.length), bw = Math.min(46, step * 0.6)
  const y = v => B - (v / top) * (B - T)
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="งานแจ้งซ่อมรายเดือน">
    {[0, .25, .5, .75, 1].map(f => <g key={f}><line x1={L} x2={W - 6} y1={y(top * f)} y2={y(top * f)} stroke="#e3e6ea" /><text x={L - 6} y={y(top * f) + 4} textAnchor="end" fontSize="11" fill="#5a6472">{Math.round(top * f)}</text></g>)}
    {data.map((d, i) => { const x = L + i * step + (step - bw) / 2; return <g key={d.key}>
      <rect x={x} y={y(d.total)} width={bw} height={B - y(d.total)} rx="4" fill="#cbd2da" />
      <rect x={x} y={y(d.BM)} width={bw} height={B - y(d.BM)} rx="4" fill="#c1272f" />
      <text x={x + bw / 2} y={y(d.total) - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="#1d2530">{d.total}</text>
      {d.BM > 0 && B - y(d.BM) > 16 && <text x={x + bw / 2} y={B - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">{d.BM}</text>}
      <text x={x + bw / 2} y={B + 18} textAnchor="middle" fontSize="12" fill="#5a6472">{d.label}</text></g> })}
  </svg>
}

export default function Dashboard() {
  const [d, setD] = useState(null)
  const [err, setErr] = useState(null)
  const [months, setMonths] = useState(6)
  useEffect(() => { setD(null); api.stats(months).then(setD).catch(setErr) }, [months])
  return <div>
    <PageHead eyebrow="Maintenance KPI" title="Dashboard ซ่อมบำรุง" sub={d ? `ข้อมูล ${d.total} ใบงาน ย้อนหลัง ${months} เดือน` : ' '}
      right={<select className="field w-auto" value={months} onChange={e => setMonths(+e.target.value)}>{[3, 6, 12].map(m => <option key={m} value={m}>{m} เดือนล่าสุด</option>)}</select>} />
    <ErrorBox error={err} />
    {!d ? <Spinner /> : <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Tile k="ใบแจ้งซ่อม" v={d.total} s={`ค้างอยู่ ${d.open} งาน`} />
        <Tile k="อัตราปิดงาน" v={pct(d.closeRate)} unit="%" s="เป้าหมาย ≥ 95%" tone={d.closeRate >= .95 ? 'good' : 'warn'} />
        <Tile k="เวลาซ่อม (มัธยฐาน)" v={fmtMin(d.medianRepairMin)} s={`เฉลี่ย ${fmtMin(d.meanRepairMin)}`} />
        <Tile k="สัดส่วน BM" v={d.total ? pct(d.bm / d.total) : 0} unit="%" s={`${d.bm} งานเครื่องหยุด`} tone="warn" />
        <Tile k="งาน PM" v={d.pm} s="งานบำรุงรักษาเชิงป้องกัน" tone={d.pm ? 'good' : 'crit'} />
        <Tile k="เริ่มซ่อมในวันที่แจ้ง" v={pct(d.sameDayStart)} unit="%" s={`${d.waitLong} งานรอเกิน 7 วัน`} tone={d.waitLong ? 'warn' : 'good'} />
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-4"><div className="font-semibold">งานแจ้งซ่อมรายเดือน</div><div className="mb-2 flex gap-4 text-xs text-ink-muted"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-brand" />BM เครื่องหยุด</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-slate-300" />งานทั้งหมด</span></div><Monthly data={d.monthly} /></div>
        <div className="card p-4"><div className="mb-3 font-semibold">ชั่วโมงซ่อมตามกลุ่มเครื่อง</div>
          <div className="space-y-2">{d.groups.slice(0, 8).map((g, i) => { const max = d.groups[0]?.hours || 1; return <div key={g.group} className="grid grid-cols-[56px_1fr_70px] items-center gap-2 text-sm"><span className="font-[Montserrat] font-semibold">{g.group}</span><div className="h-3 rounded bg-canvas"><div className={`h-3 rounded ${i < 2 ? 'bg-brand' : 'bg-slate-300'}`} style={{ width: `${(g.hours / max) * 100}%` }} /></div><span className="text-right tabular-nums text-ink-muted">{Math.round(g.hours)} ชม.</span></div> })}</div>
        </div>
      </div>
      <div className="card overflow-x-auto p-4"><div className="mb-2 font-semibold">เครื่องที่ใช้เวลาซ่อมสูงสุด · ควรวางแผน PM ก่อน</div>
        <table className="w-full text-sm"><thead><tr className="border-b border-line text-left text-xs text-ink-muted"><th className="py-2">เครื่อง</th><th className="text-right">ใบงาน</th><th className="text-right">BM</th><th className="text-right">ชั่วโมงซ่อม</th></tr></thead>
          <tbody>{d.topMachines.map(m => <tr key={m.code || m.name} className="border-b border-line last:border-0"><td className="py-2"><div className="font-medium">{m.name}</div><div className="font-[Montserrat] text-xs text-ink-muted">{m.code}</div></td><td className="text-right tabular-nums">{m.count}</td><td className="text-right tabular-nums">{m.bm}</td><td className="text-right font-semibold tabular-nums">{Math.round(m.hours)}</td></tr>)}</tbody></table>
      </div>
    </>}
  </div>
}
