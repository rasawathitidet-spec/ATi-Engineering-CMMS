import { SignJWT, jwtVerify } from 'jose'

/* ---------- Apps Script data layer ---------- */
export async function gas(action, payload = {}) {
  const url = process.env.APPS_SCRIPT_URL
  if (!url) throw httpError(500, 'ยังไม่ได้ตั้งค่า APPS_SCRIPT_URL')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ key: process.env.APPS_SCRIPT_KEY, action, ...payload }),
    redirect: 'follow',
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { throw httpError(502, 'Apps Script ตอบกลับไม่ใช่ JSON — ตรวจ URL และสิทธิ์การ Deploy') }
  if (!json.ok) throw httpError(json.error === 'unauthorized' ? 500 : 400, json.error === 'unauthorized' ? 'APPS_SCRIPT_KEY ไม่ตรงกับ API_KEY ใน Apps Script' : json.error)
  return json.data
}

/* ---------- Session (JWT in httpOnly cookie) ---------- */
const COOKIE = 'ati_session'
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-only-secret-change-me')

export async function issueSession(res, user) {
  const token = await new SignJWT({ code: user.emp_code, name: user.name, role: user.role, line: user.line || '' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(secret())
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24 * 30}`)
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`)
}

export async function getSession(req) {
  const raw = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))
  if (!raw) return null
  try { const { payload } = await jwtVerify(raw.slice(COOKIE.length + 1), secret()); return payload } catch { return null }
}

export async function requireUser(req, roles) {
  const u = await getSession(req)
  if (!u) throw httpError(401, 'กรุณาเข้าสู่ระบบ')
  if (roles && !roles.includes(u.role) && u.role !== 'admin') throw httpError(403, 'ไม่มีสิทธิ์ทำรายการนี้')
  return u
}

/* ---------- HTTP helpers ---------- */
export function httpError(status, message) { const e = new Error(message); e.status = status; return e }

export function handler(fn) {
  return async (req, res) => {
    try {
      if (typeof req.body === 'string' && req.body) { try { req.body = JSON.parse(req.body) } catch {} }
      req.body = req.body || {}
      const out = await fn(req, res)
      if (!res.headersSent) res.status(200).json(out ?? { ok: true })
    } catch (e) {
      console.error(e)
      res.status(e.status || 500).json({ error: e.message || 'เกิดข้อผิดพลาด' })
    }
  }
}

export const isManager = u => ['manager', 'admin'].includes(u.role)
export const nowIso = () => new Date().toISOString()
