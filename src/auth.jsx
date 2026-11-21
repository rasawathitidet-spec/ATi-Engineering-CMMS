import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from './api.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const [boot, setBoot] = useState(null)
  const refresh = useCallback(async () => {
    try { const { user } = await api.me(); setUser(user || null) } catch { setUser(null) }
  }, [])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { if (user) api.bootstrap().then(setBoot).catch(() => setBoot({ machines: [], lists: {}, technicians: [] })) }, [user])
  const logout = async () => { await api.logout().catch(() => {}); setUser(null); setBoot(null) }
  return <Ctx.Provider value={{ user, setUser, boot, logout, refresh }}>{children}</Ctx.Provider>
}

export const ROLE_TH = { requester: 'ผู้แจ้ง', technician: 'ช่าง', manager: 'หัวหน้า', executive: 'ผู้บริหาร', admin: 'ผู้ดูแลระบบ' }
export const can = (user, ...roles) => !!user && (user.role === 'admin' || roles.includes(user.role))
export const homeFor = role => ({ technician: '/jobs', manager: '/board', admin: '/board', executive: '/dashboard' }[role] || '/report')
