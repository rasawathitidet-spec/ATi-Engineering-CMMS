import { useMemo, useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { api, compressImage } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Icon, ErrorBox, PageHead, Spinner, StopPill, useToast } from '../ui.jsx'

export default function Report() {
  const { code } = useParams()
  const { boot } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [machine, setMachine] = useState(null)
  const [q, setQ] = useState('')
  const [symptoms, setSymptoms] = useState([])
  const [other, setOther] = useState('')
  const [stopped, setStopped] = useState(null)
  const [detail, setDetail] = useState('')
  const [photos, setPhotos] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(null)

  const machines = boot?.machines || []
  useEffect(() => { if (code && machines.length) setMachine(machines.find(m => m.code.toLowerCase() === code.toLowerCase()) || null) }, [code, machines.length]) // eslint-disable-line

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return machines.filter(m => !s || `${m.code} ${m.name} ${m.line}`.toLowerCase().includes(s)).slice(0, 60)
  }, [q, machines])

  if (!boot) return <Spinner />

  const toggle = s => setSymptoms(x => x.includes(s) ? x.filter(y => y !== s) : [...x, s])
  const addPhotos = async files => {
    for (const f of [...files].slice(0, 3 - photos.length)) {
      try { const c = await compressImage(f); setPhotos(p => p.length < 3 ? [...p, { ...c, key: f.name + Math.random() }] : p) } catch { toast('อ่านไฟล์รูปไม่ได้') }
    }
  }
  const symptomText = [...symptoms.filter(s => s !== 'อื่น ๆ'), other.trim()].filter(Boolean).join(', ')

  const submit = async () => {
    setErr(null)
    if (!machine) return setErr('เลือกเครื่องจักร')
    if (!symptomText) return setErr('เลือกหรือพิมพ์อาการที่พบ')
    if (stopped === null) return setErr('ตอบว่าเครื่องหยุดทำงานหรือไม่')
    setBusy(true)
    try {
      const urls = []
      for (const p of photos.filter(p => p.data)) urls.push((await api.upload({ data: p.data, mimeType: p.mimeType, name: p.name })).url)
      const { wo } = await api.createWo({ machine_code: machine.code, machine_name: machine.name, line: machine.line, symptom: symptomText, detail, machine_stopped: stopped, photos: urls })
      setDone(wo)
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  if (done) return <div className="mx-auto max-w-md">
    <div className="card p-6 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Icon name="check" className="h-8 w-8" /></div>
      <div className="mt-3 text-lg font-semibold">ส่งแจ้งซ่อมแล้ว</div>
      <div className="text-sm text-ink-muted">เลขที่ใบงาน</div>
      <div className="font-[Montserrat] text-3xl font-bold tracking-wide">{done.wo_no}</div>
      <div className="mt-3 rounded-xl bg-canvas p-3 text-left text-sm"><div className="font-semibold">{done.machine_name} <span className="font-normal text-ink-muted">({done.machine_code})</span></div><div className="text-ink-muted">{done.symptom}</div></div>
      <p className="mt-3 text-sm text-ink-muted">หัวหน้าช่างจะมอบหมายช่างให้ คุณติดตามสถานะได้ที่ "งานที่ฉันแจ้ง"</p>
      <div className="mt-5 grid gap-2"><Link to={`/wo/${done.wo_no}`} className="btn-primary">ดูใบงาน</Link><button className="btn-outline" onClick={() => { setDone(null); setMachine(null); setSymptoms([]); setOther(''); setStopped(null); setDetail(''); setPhotos([]); nav('/report') }}>แจ้งซ่อมรายการใหม่</button></div>
    </div>
  </div>

  return <div className="mx-auto max-w-2xl">
    <PageHead eyebrow="FM-EN-07" title="แจ้งซ่อมเครื่องจักร" sub="สแกน QR ที่เครื่องเพื่อเลือกเครื่องอัตโนมัติ หรือค้นหาจากรายการ" />
    <div className="space-y-4">
      <section className="card p-4">
        <div className="label">1. เครื่องจักร</div>
        {machine ? <div className="flex items-center gap-3 rounded-xl bg-canvas p-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-xs font-bold ring-1 ring-line">{machine.group}</span>
          <div className="min-w-0 flex-1"><div className="font-semibold">{machine.name}</div><div className="text-xs text-ink-muted">{machine.code}{machine.line && ` · ไลน์ ${machine.line}`}</div></div>
          <button className="btn-ghost px-2 py-1 text-sm" onClick={() => setMachine(null)}>เปลี่ยน</button>
        </div> : <>
          <div className="relative"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /><input className="field pl-9" placeholder="ค้นหา เช่น ปั้ม 5, PU-PR-05, L3" value={q} onChange={e => setQ(e.target.value)} /></div>
          <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-line">
            {filtered.map(m => <button key={m.code} onClick={() => setMachine(m)} className="flex w-full items-center gap-3 border-b border-line px-3 py-2 text-left last:border-0 hover:bg-canvas">
              <span className="w-24 shrink-0 font-[Montserrat] text-xs font-semibold">{m.code}</span><span className="flex-1 text-sm">{m.name}</span><span className="text-xs text-ink-muted">{m.line}</span></button>)}
            {!filtered.length && <div className="p-4 text-center text-sm text-ink-muted">ไม่พบเครื่อง</div>}
          </div>
        </>}
      </section>

      <section className="card p-4">
        <div className="label">2. อาการที่พบ</div>
        <div className="flex flex-wrap gap-2">{(boot.lists.symptom || []).map(s => <button key={s} type="button" aria-pressed={symptoms.includes(s)} onClick={() => toggle(s)} className={`chip ${symptoms.includes(s) ? 'chip-on' : ''}`}>{s}</button>)}</div>
        <input className="field mt-3" placeholder="พิมพ์อาการเพิ่มเติม" value={other} onChange={e => setOther(e.target.value)} />
      </section>

      <section className="card p-4">
        <div className="label">3. เครื่องหยุดทำงานหรือไม่</div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={stopped === true} onClick={() => setStopped(true)} className={`btn border py-3 ${stopped === true ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>หยุด ผลิตไม่ได้</button>
          <button type="button" aria-pressed={stopped === false} onClick={() => setStopped(false)} className={`btn border py-3 ${stopped === false ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-line bg-white'}`}>ยังเดินได้</button>
        </div>
        <p className="mt-2 text-xs text-ink-muted">เครื่องหยุด = งานด่วน (BM) ระบบแจ้งหัวหน้าช่างก่อนงานอื่น</p>
      </section>

      <section className="card p-4">
        <label className="label" htmlFor="detail">4. รายละเอียด และรูปภาพ</label>
        <textarea id="detail" className="field min-h-[88px]" placeholder="เช่น เกิดขึ้นตอนไหน บ่อยแค่ไหน ยูนิตไหน" value={detail} onChange={e => setDetail(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          {photos.map(p => <div key={p.key} className="relative h-20 w-20 overflow-hidden rounded-xl bg-canvas ring-1 ring-line">{p.preview ? <img src={p.preview} alt="" className="h-full w-full object-cover" /> : <span className="absolute inset-0 animate-pulse" />}<button onClick={() => setPhotos(x => x.filter(y => y.key !== p.key))} className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs text-white" aria-label="ลบรูป">×</button></div>)}
          {photos.length < 3 && <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-ink-muted hover:border-brand hover:text-brand"><Icon name="camera" /><input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={e => { addPhotos(e.target.files); e.target.value = '' }} /></label>}
        </div>
        <p className="mt-1 text-xs text-ink-muted">ถ่ายรูปได้สูงสุด 3 รูป</p>
      </section>

      <ErrorBox error={err} />
      <div className="sticky bottom-20 z-10 lg:static">
        <button className="btn-primary w-full py-3.5 text-base shadow-lg" onClick={submit} disabled={busy}>{busy ? 'กำลังส่ง…' : 'ส่งแจ้งซ่อม'}{stopped && !busy && <StopPill />}</button>
      </div>
    </div>
  </div>
}
