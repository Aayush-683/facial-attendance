import { useState } from 'react'
import { api, formatBytes } from '../api.js'
import { useLoad } from './useLoad.js'

function Meter({ label, used, limit, note }) {
  const p = Math.min(100, (used / limit) * 100)
  return (
    <div className="card meter-card">
      <div className="meter-top">
        <h2>{label}</h2>
        <span className="meter-pct">{p.toFixed(p < 10 ? 1 : 0)}%</span>
      </div>
      <div className={`meter ${p > 85 ? 'bad' : p > 65 ? 'warn' : ''}`}><span style={{ width: `${p}%` }} /></div>
      <div className="meter-nums">
        <span>{formatBytes(used)} used</span>
        <span>{formatBytes(Math.max(0, limit - used))} left of {formatBytes(limit)}</span>
      </div>
      {note && <p className="hint">{note}</p>}
    </div>
  )
}

export default function Storage({ onAuthError }) {
  const { data, error, reload } = useLoad('storage', onAuthError)
  const [range, setRange] = useState({ from: '', to: '', mode: 'photos' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  if (!data) return error ? <p className="error">{error}</p> : <div className="spinner dark" />

  const purge = async (from, to, mode) => {
    const what = mode === 'all' ? 'ALL attendance records and photos' : 'photos (records stay)'
    if (!window.confirm(`Delete ${what} from ${from} to ${to}?\n\nThis cannot be undone.`)) return
    setBusy(true)
    setMessage('')
    try {
      const r = await api('storage', { method: 'POST', body: { from, to, mode } })
      setMessage(`Deleted ${r.photosDeleted} photos${mode === 'all' ? ` and ${r.recordsDeleted} records` : ''}.`)
      reload()
    } catch (e) {
      if (e.status === 401) onAuthError()
      setMessage(e.message)
    } finally {
      setBusy(false)
    }
  }

  const monthRange = month => {
    const [y, m] = month.split('-').map(Number)
    return [`${month}-01`, new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)]
  }

  const { totals, retention } = data

  return (
    <div className="stack">
      <div className="two-col">
        <Meter label="Photos" used={data.photos.used} limit={data.photos.limit}
          note={`${totals.photos} photos stored. Auto-deleted after ${retention.photo_retention_days} days.`} />
        <Meter label="Database" used={data.db.used} limit={data.db.limit}
          note={`${totals.records} attendance records. Auto-deleted after ${retention.record_retention_days} days.`} />
      </div>

      <section className="card">
        <h2>Delete by date range</h2>
        <form className="inline-form" onSubmit={e => { e.preventDefault(); purge(range.from, range.to, range.mode) }}>
          <label className="field">
            <span>From</span>
            <input type="date" value={range.from} onChange={e => setRange({ ...range, from: e.target.value })} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" value={range.to} min={range.from} onChange={e => setRange({ ...range, to: e.target.value })} />
          </label>
          <label className="field">
            <span>What</span>
            <select value={range.mode} onChange={e => setRange({ ...range, mode: e.target.value })}>
              <option value="photos">Photos only</option>
              <option value="all">Records + photos</option>
            </select>
          </label>
          <button className="btn danger-solid" disabled={busy || !range.from || !range.to || range.from > range.to}>
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </form>
        {message && <p className="message">{message}</p>}
      </section>

      <section className="card">
        <h2>By month</h2>
        <table className="table">
          <thead>
            <tr><th>Month</th><th>Records</th><th>Photos</th><th>Photo size</th><th /></tr>
          </thead>
          <tbody>
            {data.months.map(m => {
              const [from, to] = monthRange(m.month)
              return (
                <tr key={m.month}>
                  <td>{new Date(`${m.month}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</td>
                  <td>{m.records}</td>
                  <td>{m.photos}</td>
                  <td>{formatBytes(m.photo_bytes)}</td>
                  <td className="actions">
                    <button className="btn ghost" disabled={busy || m.photos === 0} onClick={() => purge(from, to, 'photos')}>Delete photos</button>
                    <button className="btn ghost danger" disabled={busy} onClick={() => purge(from, to, 'all')}>Delete all</button>
                  </td>
                </tr>
              )
            })}
            {data.months.length === 0 && <tr><td colSpan="5" className="empty-row">No attendance yet</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  )
}
