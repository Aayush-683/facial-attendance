import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useLoad } from './useLoad.js'

const EMPTY = { roll_no: '', name: '', shift: 'day' }

function EmployeeFields({ value, onChange }) {
  const set = key => e => onChange({ ...value, [key]: e.target.value })
  return (
    <>
      <input className="input-roll" inputMode="numeric" placeholder="Roll no." value={value.roll_no}
        onChange={e => onChange({ ...value, roll_no: e.target.value.replace(/\D/g, '') })} />
      <input placeholder="Full name" value={value.name} onChange={set('name')} />
      <select value={value.shift} onChange={set('shift')}>
        <option value="day">Day</option>
        <option value="night">Night</option>
      </select>
    </>
  )
}

export default function Employees({ onAuthError }) {
  const { data, error, reload } = useLoad('employees', onAuthError)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')

  const run = async (fn, okMessage) => {
    setMessage('')
    try {
      await fn()
      reload()
      if (okMessage) setMessage(okMessage)
      return true
    } catch (e) {
      if (e.status === 401) onAuthError()
      setMessage(e.message)
      return false
    }
  }

  const add = async e => {
    e.preventDefault()
    if (await run(() => api('employees', { method: 'POST', body: form }), `Added ${form.name}`)) setForm(EMPTY)
  }

  const save = async () => {
    if (await run(() => api('employees', { method: 'PUT', body: editing }))) setEditing(null)
  }

  const toggleActive = emp =>
    run(() => api('employees', { method: 'PUT', body: { ...emp, active: !emp.active } }))

  const remove = emp => {
    if (!window.confirm(`Delete ${emp.name} and ALL their attendance and photos? This cannot be undone.\n\nTip: use "Deactivate" to just stop them marking.`)) return
    run(() => api(`employees?id=${emp.id}`, { method: 'DELETE' }), `Deleted ${emp.name}`)
  }

  if (!data) return error ? <p className="error">{error}</p> : <div className="spinner dark" />

  const q = query.trim().toLowerCase()
  const list = data.filter(e => !q || e.name.toLowerCase().includes(q) || e.roll_no.includes(q))

  return (
    <div className="stack">
      <section className="card">
        <h2>Add employee</h2>
        <form className="inline-form" onSubmit={add}>
          <EmployeeFields value={form} onChange={setForm} />
          <button className="btn primary" disabled={!form.roll_no || !form.name.trim()}>Add</button>
        </form>
        {message && <p className="message">{message}</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Employees <small>{data.filter(e => e.active).length} active</small></h2>
          <input type="search" placeholder="Search name or roll" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <table className="table">
          <thead>
            <tr><th>Roll</th><th>Name</th><th>Shift</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {list.map(emp => editing?.id === emp.id ? (
              <tr key={emp.id} className="editing">
                <td colSpan="3"><div className="inline-form"><EmployeeFields value={editing} onChange={setEditing} /></div></td>
                <td />
                <td className="actions">
                  <button className="btn primary" onClick={save}>Save</button>
                  <button className="btn ghost" onClick={() => setEditing(null)}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={emp.id} className={emp.active ? '' : 'absent'}>
                <td>{emp.roll_no}</td>
                <td><Link to={`/admin/employees/${emp.id}`}>{emp.name}</Link></td>
                <td><span className={`pill ${emp.shift}`}>{emp.shift}</span></td>
                <td>{emp.active ? 'Active' : 'Inactive'}</td>
                <td className="actions">
                  <button className="btn ghost" onClick={() => setEditing(emp)}>Edit</button>
                  <button className="btn ghost" onClick={() => toggleActive(emp)}>{emp.active ? 'Deactivate' : 'Activate'}</button>
                  <button className="btn ghost danger" onClick={() => remove(emp)}>Delete</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan="5" className="empty-row">{q ? 'No match' : 'No employees yet. Add one above.'}</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  )
}
