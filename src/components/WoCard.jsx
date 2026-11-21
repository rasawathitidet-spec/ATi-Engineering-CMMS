import { Link } from 'react-router-dom'
import { StatusPill, TypePill, StopPill, fmtDateTime, ageDays } from '../ui.jsx'

export default function WoCard({ wo, showAge }) {
  const bm = wo.type === 'BM'
  return <Link to={`/wo/${wo.wo_no}`} className={`card block border-l-4 p-3.5 transition hover:shadow-md ${bm ? 'border-l-brand' : 'border-l-sky-500'}`}>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0"><div className="truncate font-semibold">{wo.machine_name || wo.machine_code || 'ไม่ระบุเครื่อง'}</div><div className="line-clamp-2 text-sm text-ink-muted">{wo.symptom}</div></div>
      <StatusPill s={wo.status} />
    </div>
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
      <span className="font-[Montserrat] font-semibold text-ink">{wo.wo_no}</span>
      <TypePill t={wo.type} />{wo.machine_stopped === 'Y' && wo.status !== 'closed' && <StopPill />}
      <span>· {fmtDateTime(wo.reported_at)}</span>
      {wo.technicians && <span>· {wo.technicians}</span>}
      {showAge && wo.status !== 'closed' && <span className="ml-auto font-semibold">{ageDays(wo.reported_at) ? `${ageDays(wo.reported_at)} วัน` : 'วันนี้'}</span>}
    </div>
  </Link>
}
