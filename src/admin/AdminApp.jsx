import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { api } from '../api.js'
import Dashboard from './Dashboard.jsx'
import EmployeeDetail from './EmployeeDetail.jsx'
import Employees from './Employees.jsx'
import Settings from './Settings.jsx'
import Storage from './Storage.jsx'

function Login({ onDone }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setBusy(true)
    try {
      await api('auth', { method: 'POST', body: { role: 'admin', secret: password } })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin login-page">
      <form className="card login-card" onSubmit={submit}>
        <h1>Admin login</h1>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" disabled={busy || !password}>Log in</button>
      </form>
    </div>
  )
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(null)

  useEffect(() => {
    api('auth').then(r => setAuthed(r.admin)).catch(() => setAuthed(false))
  }, [])

  const logout = async () => {
    await api('auth?role=admin', { method: 'DELETE' })
    setAuthed(false)
  }

  if (authed === null) return <div className="admin"><div className="spinner dark" /></div>
  if (!authed) return <Login onDone={() => setAuthed(true)} />

  return (
    <div className="admin">
      <header className="admin-header">
        <span className="brand">Attendance</span>
        <nav>
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/employees">Employees</NavLink>
          <NavLink to="/admin/settings">Shifts</NavLink>
          <NavLink to="/admin/storage">Storage</NavLink>
        </nav>
        <button className="btn ghost" onClick={logout}>Log out</button>
      </header>
      <main className="admin-main">
        <Routes>
          <Route index element={<Dashboard onAuthError={() => setAuthed(false)} />} />
          <Route path="employees" element={<Employees onAuthError={() => setAuthed(false)} />} />
          <Route path="employees/:id" element={<EmployeeDetail onAuthError={() => setAuthed(false)} />} />
          <Route path="settings" element={<Settings onAuthError={() => setAuthed(false)} />} />
          <Route path="storage" element={<Storage onAuthError={() => setAuthed(false)} />} />
        </Routes>
      </main>
    </div>
  )
}
