async function req(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api/' + path, {
    method, credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = {}
  try { data = await res.json() } catch {}
  if (!res.ok) { const e = new Error(data.error || `เกิดข้อผิดพลาด (${res.status})`); e.status = res.status; throw e }
  return data
}
export const api = {
  me: () => req('auth'),
  loginPin: (emp_code, pin) => req('auth', { method: 'POST', body: { action: 'pin', emp_code, pin } }),
  loginGoogle: credential => req('auth', { method: 'POST', body: { action: 'google', credential } }),
  logout: () => req('auth', { method: 'POST', body: { action: 'logout' } }),
  bootstrap: () => req('data'),
  listWo: (q = {}) => req('wo?' + new URLSearchParams(q)),
  getWo: no => req('wo?no=' + encodeURIComponent(no)),
  createWo: body => req('wo', { method: 'POST', body: { action: 'create', ...body } }),
  woAction: (wo_no, action, extra = {}) => req('wo', { method: 'POST', body: { wo_no, action, ...extra } }),
  upload: body => req('upload', { method: 'POST', body }),
  stats: (months = 12) => req('stats?months=' + months),
  users: () => req('users'),
  userAction: body => req('users', { method: 'POST', body }),
}

/** ย่อรูปก่อนอัปโหลด (ด้านยาวสุด 1280px, JPEG) */
export async function compressImage(file, max = 1280) {
  const url = URL.createObjectURL(file)
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url })
  const s = Math.min(1, max / Math.max(img.width, img.height))
  const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  URL.revokeObjectURL(url)
  const dataUrl = c.toDataURL('image/jpeg', 0.8)
  return { data: dataUrl.split(',')[1], mimeType: 'image/jpeg', name: file.name.replace(/\.\w+$/, '') + '.jpg', preview: dataUrl }
}
