import { createRemoteJWKSet, jwtVerify } from 'jose'
import { gas, handler, issueSession, clearSession, getSession, httpError } from './_lib/core.js'

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

export default handler(async (req, res) => {
  if (req.method === 'GET') return { user: await getSession(req) }

  const { action } = req.body
  if (action === 'logout') { clearSession(res); return { ok: true } }

  if (action === 'pin') {
    const { emp_code, pin } = req.body
    if (!emp_code || !pin) throw httpError(400, 'กรอกรหัสพนักงานและ PIN')
    const user = await gas('verifyPin', { emp_code: String(emp_code).trim(), pin: String(pin).trim() })
    if (!user) throw httpError(401, 'รหัสพนักงานหรือ PIN ไม่ถูกต้อง')
    await issueSession(res, user)
    return { user: { code: user.emp_code, name: user.name, role: user.role, line: user.line } }
  }

  if (action === 'google') {
    if (!process.env.GOOGLE_CLIENT_ID) throw httpError(500, 'ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID')
    const { payload } = await jwtVerify(req.body.credential, JWKS, {
      audience: process.env.GOOGLE_CLIENT_ID,
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    })
    const email = String(payload.email || '').toLowerCase()
    if (!payload.email_verified) throw httpError(401, 'อีเมลนี้ยังไม่ได้ยืนยันกับ Google')
    const domains = (process.env.ALLOWED_EMAIL_DOMAINS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    const users = await gas('read', { sheet: 'Users' })
    const user = users.find(u => String(u.email || '').toLowerCase() === email && String(u.active).toUpperCase() !== 'FALSE')
    if (!user && domains.length && !domains.includes(email.split('@')[1])) throw httpError(403, 'อีเมลนี้ไม่ได้รับอนุญาต')
    if (!user) throw httpError(403, `ยังไม่มีบัญชีสำหรับ ${email} — ติดต่อผู้ดูแลระบบ`)
    await issueSession(res, user)
    return { user: { code: user.emp_code, name: user.name, role: user.role, line: user.line } }
  }
  throw httpError(400, 'unknown action')
})
