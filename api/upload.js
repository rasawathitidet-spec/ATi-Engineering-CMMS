import { gas, handler, requireUser, httpError } from './_lib/core.js'

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } }

export default handler(async (req) => {
  const u = await requireUser(req)
  const { data, mimeType, name } = req.body
  if (!data || !/^image\//.test(mimeType || '')) throw httpError(400, 'รองรับเฉพาะไฟล์รูปภาพ')
  if (data.length > 3_800_000) throw httpError(413, 'ไฟล์ใหญ่เกินไป')
  const safe = `${new Date().toISOString().slice(0, 10)}_${u.code}_${String(name || 'photo').replace(/[^\w.-]/g, '_')}`
  return await gas('upload', { name: safe, mimeType, data })
})
