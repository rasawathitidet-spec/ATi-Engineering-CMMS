import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { useAuth, can } from '../auth.jsx'
import { Spinner, PageHead, Icon } from '../ui.jsx'

function QR({ value }) {
  const [src, setSrc] = useState('')
  useEffect(() => { QRCode.toDataURL(value, { margin: 1, width: 240, color: { dark: '#1d2530' } }).then(setSrc) }, [value])
  return src ? <img src={src} alt={`QR ${value}`} className="h-full w-full" /> : null
}

export default function Machines() {
  const { boot, user } = useAuth()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState([])
  const [printing, setPrinting] = useState(false)
  const list = useMemo(() => (boot?.machines || []).filter(m => !q || `${m.code} ${m.name} ${m.line}`.toLowerCase().includes(q.toLowerCase())), [boot, q])
  if (!boot) return <Spinner />
  const origin = window.location.origin
  const toPrint = boot.machines.filter(m => sel.includes(m.code))
  const isMgr = can(user, 'manager')

  if (printing) return <div>
    <div className="no-print mb-4 flex gap-2"><button className="btn-outline" onClick={() => setPrinting(false)}><Icon name="back" className="h-4 w-4" />กลับ</button><button className="btn-primary" onClick={() => window.print()}><Icon name="printer" className="h-4 w-4" />พิมพ์ {toPrint.length} ป้าย</button></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
      {toPrint.map(m => <div key={m.code} className="break-inside-avoid rounded-xl border-2 border-ink p-3 text-center">
        <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-bold"><span className="rounded bg-brand px-1.5 text-white">ATi</span>สแกนเพื่อแจ้งซ่อม</div>
        <div className="mx-auto aspect-square w-36"><QR value={`${origin}/r/${m.code}`} /></div>
        <div className="font-[Montserrat] text-lg font-bold">{m.code}</div><div className="text-xs">{m.name}</div>
      </div>)}
    </div>
  </div>

  return <div>
    <PageHead title="เครื่องจักร" sub={`${boot.machines.length} เครื่อง · กดเพื่อแจ้งซ่อมเครื่องนั้น`}
      right={isMgr && <button className="btn-primary" disabled={!sel.length} onClick={() => setPrinting(true)}><Icon name="qr" className="h-4 w-4" />พิมพ์ป้าย QR ({sel.length})</button>} />
    <div className="mb-3 flex gap-2"><input className="field" placeholder="ค้นหารหัส ชื่อ หรือไลน์" value={q} onChange={e => setQ(e.target.value)} />
      {isMgr && <button className="btn-outline whitespace-nowrap text-sm" onClick={() => setSel(sel.length === list.length ? [] : list.map(m => m.code))}>{sel.length === list.length && list.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}</button>}</div>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {list.map(m => <div key={m.code} className="card flex items-center gap-3 p-3">
        {isMgr && <input type="checkbox" className="h-4 w-4 accent-[#c1272f]" checked={sel.includes(m.code)} onChange={e => setSel(s => e.target.checked ? [...s, m.code] : s.filter(x => x !== m.code))} aria-label={`เลือก ${m.code}`} />}
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas text-xs font-bold">{m.group}</span>
        <div className="min-w-0 flex-1"><div className="truncate font-medium">{m.name}</div><div className="font-[Montserrat] text-xs text-ink-muted">{m.code}{m.line && ` · ${m.line}`}</div></div>
        <Link to={`/r/${m.code}`} className="btn-outline px-3 py-1.5 text-sm">แจ้งซ่อม</Link>
      </div>)}
    </div>
  </div>
}
