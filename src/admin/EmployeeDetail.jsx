import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PhotoModal from './PhotoModal.jsx'
import { useLoad } from './useLoad.js'

function monthDays(month) {
  const [y, m] = month.split('-').map(Number)
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7 // Monday = 0
  const days = Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
  return { days, firstWeekday }
}

function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}

export default function EmployeeDetail({ onAuthError }) {
  const { id } = useParams()
  const [month, setMonth] = useState('')
  const [photo, setPhoto] = useState(null)
  const { data, error, loading } = useLoad(`attendance?employee=${id}&month=${month}`, onAuthError)

  if (!data) return error ? <p className="error">{error}</p> : <div className="spinner dark" />

  const { employee, today, days } = data
  const shown = data.month
  const byDate = Object.fromEntries(days.map(d => [d.date, d]))
  const { days: all, firstWeekday } = monthDays(shown)
  const elapsed = all.filter(d => d <= today).length
  const monthName = new Date(`${shown}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <div className={`stack ${loading ? 'is-loading' : ''}`}>
      <Link to="/admin/employees" className="back-link">← Employees</Link>
      <div className="toolbar">
        <h1 className="page-title">
          {employee.name} <small>#{employee.roll_no} · <span className={`pill ${employee.shift}`}>{employee.shift}</span>{!employee.active && ' · inactive'}</small>
        </h1>
        <div className="date-nav">
          <button className="btn" onClick={() => setMonth(addMonths(shown, -1))} aria-label="Previous month">‹</button>
          <input type="month" value={shown} max={today.slice(0, 7)} onChange={e => e.target.value && setMonth(e.target.value)} />
          <button className="btn" onClick={() => setMonth(addMonths(shown, 1))} disabled={shown >= today.slice(0, 7)} aria-label="Next month">›</button>
        </div>
      </div>

      <section className="stats">
        <div className="stat">
          <span className="stat-label">Present in {monthName}</span>
          <span className="stat-value good">{days.length}<small>/{elapsed}</small></span>
        </div>
        <div className="stat">
          <span className="stat-label">Absent</span>
          <span className="stat-value bad">{Math.max(0, elapsed - days.length)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Attendance</span>
          <span className="stat-value">{elapsed ? Math.round((days.length / elapsed) * 100) : 0}%</span>
        </div>
      </section>

      <section className="card">
        <div className="calendar">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="cal-head">{d}</div>)}
          {Array.from({ length: firstWeekday }, (_, i) => <div key={`pad${i}`} />)}
          {all.map(date => {
            const rec = byDate[date]
            const state = rec ? 'present' : date > today ? 'future' : 'absent'
            return (
              <div key={date} className={`cal-day ${state}`}>
                <span className="cal-num">{Number(date.slice(8))}</span>
                {rec && (
                  <>
                    {rec.photo_url ? (
                      <button className="cal-photo" onClick={() => setPhoto({ url: rec.photo_url, caption: `${employee.name} · ${date} ${rec.time}` })}>
                        <img src={rec.photo_url} alt="" loading="lazy" />
                      </button>
                    ) : null}
                    <span className="cal-time">{rec.time}</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <PhotoModal photo={photo} onClose={() => setPhoto(null)} />
    </div>
  )
}
