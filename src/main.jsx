import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth, homeFor } from './auth.jsx'
import { ToastProvider, Spinner } from './ui.jsx'
import Layout from './Layout.jsx'
import Login from './pages/Login.jsx'
import Report from './pages/Report.jsx'
import MyRequests from './pages/MyRequests.jsx'
import Jobs from './pages/Jobs.jsx'
import WorkOrder from './pages/WorkOrder.jsx'
import Board from './pages/Board.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Machines from './pages/Machines.jsx'
import Users from './pages/Users.jsx'


function Guard({ children }) {
  const { user } = useAuth()
  const loc = useLocation()
  if (user === undefined) return <Spinner />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return children
}
function Home() { const { user } = useAuth(); return <Navigate to={homeFor(user?.role)} replace /> }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Guard><Layout /></Guard>}>
              <Route index element={<Home />} />
              <Route path="report" element={<Report />} />
              <Route path="r/:code" element={<Report />} />
              <Route path="my" element={<MyRequests />} />
              <Route path="jobs" element={<Jobs />} />
              <Route path="wo/:no" element={<WorkOrder />} />
              <Route path="board" element={<Board />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="machines" element={<Machines />} />
              <Route path="users" element={<Users />} />
              <Route path="*" element={<Home />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
