import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useLoad } from './useLoad.js'

export default function Settings({ onAuthError }) {
  const { data, error } = useLoad('settings', onAuthError)
  const [form, setForm] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  if (!form) return error ? <p className="error">{error}</p> : <div className="spinner dark" />

  const setShift = (name, key, value) =>
    setForm(f => ({ ...f, shifts: f.shifts.map(s => (s.name === name ? { ...s, [key]: value } : s)) }))
  const setSetting = (key, value) => setForm(f => ({ ...f, settings: { ...f.settings, [key]: value } }))

  const save = async e => {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const saved = await api('settings', { method: 'PUT', body: form })
      setForm(saved)
      setMessage('Saved')
    } catch (err) {
      if (err.status === 401) onAuthError()
      setMessage(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack" onSubmit={save}>
      <div className="two-col">
        {form.shifts.map(s => (
          <section key={s.name} className="card">
            <h2><span className={`pill ${s.name}`}>{s.name}</span> shift</h2>
            <div className="field-row">
              <label className="field">
                <span>Starts</span>
                <input type="time" value={s.start_time} onChange={e => setShift(s.name, 'start_time', e.target.value)} />
              </label>
              <label className="field">
                <span>Ends</span>
                <input type="time" value={s.end_time} onChange={e => setShift(s.name, 'end_time', e.target.value)} />
              </label>
              <label className="field">
                <span>Can mark early (min)</span>
                <input type="number" min="0" max="240" value={s.early_minutes}
                  onChange={e => setShift(s.name, 'early_minutes', Number(e.target.value))} />
              </label>
            </div>
            <p className="hint">
              Attendance opens at {s.start_time} minus {s.early_minutes} min and closes at {s.end_time}.
              {s.end_time <= s.start_time && ' Ends next morning; counts for the day the shift started.'}
            </p>
          </section>
        ))}
      </div>

      <section className="card">
        <h2>Data</h2>
        <div className="field-row">
          <label className="field">
            <span>Delete photos after (days)</span>
            <input type="number" min="1" value={form.settings.photo_retention_days}
              onChange={e => setSetting('photo_retention_days', Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Delete records after (days)</span>
            <input type="number" min="1" value={form.settings.record_retention_days}
              onChange={e => setSetting('record_retention_days', Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Timezone</span>
            <input value={form.settings.timezone} onChange={e => setSetting('timezone', e.target.value)} />
          </label>
        </div>
        <p className="hint">Old data is cleaned up automatically every night.</p>
      </section>

      <div className="save-bar">
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        {message && <span className="message">{message}</span>}
      </div>
    </form>
  )
}
