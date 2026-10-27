import { useState } from 'react'
import { Link } from 'react-router-dom'
import { prettyDate, shiftDate } from '../api.js'
import PhotoModal from './PhotoModal.jsx'
import { useLoad } from './useLoad.js'

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)

export default function Dashboard({ onAuthError }) {
  const [date, setDate] = useState('')
  const [period, setPeriod] = useState('week')
  const [shift, setShift] = useState('all')
  const [photo, setPhoto] = useState(null)
  const { data, error, loading } = useLoad(`attendance?date=${date}&period=${period}`, onAuthError)

  if (!data) return error ? <p className="error">{error}</p> : <div className="spinner dark" />

  const shown = date || data.date
  const byShift = r => shift === 'all' || r.shift === shift
  const day = data.day.filter(byShift)
  const people = data.perEmployee.filter(byShift)
  const presentDay = day.filter(r => r.time).length
  const { daysElapsed, from, to, today } = data.range
  const periodPresent = people.reduce((sum, p) => sum + p.present, 0)
  const perfect = daysElapsed > 0 ? people.filter(p => p.present >= daysElapsed).length : 0
  const maxDaily = Math.max(1, data.perEmployee.length)

  return (
    <div className={`stack ${loading ? 'is-loading' : ''}`}>
      <div className="toolbar">
        <div className="date-nav">
          <button className="btn" onClick={() => setDate(shiftDate(shown, -1))} aria-label="Previous day">‹</button>
          <input type="date" value={shown} max={today} onChange={e => e.target.value && setDate(e.target.value)} />
          <button className="btn" onClick={() => setDate(shiftDate(shown, 1))} disabled={shown >= today} aria-label="Next day">›</button>
          {shown !== today && <button className="btn ghost" onClick={() => setDate(today)}>Today</button>}
        </div>
        <div className="segmented">
          {['week', 'month'].map(p => (
            <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>
              This {p}
            </button>
          ))}
        </div>
        <div className="segmented">
          {['all', 'day', 'night'].map(s => (
            <button key={s} className={shift === s ? 'active' : ''} onClick={() => setShift(s)}>
              {s === 'all' ? 'All shifts' : `${s[0].toUpperCase()}${s.slice(1)}`}
            </button>
          ))}
        </div>
      </div>

      <section className="stats">
        <div className="stat">
          <span className="stat-label">Present · {prettyDate(shown)}</span>
          <span className="stat-value">{presentDay}<small>/{day.length}</small></span>
        </div>
        <div className="stat">
          <span className="stat-label">Absent · {prettyDate(shown)}</span>
          <span className="stat-value bad">{day.length - presentDay}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Attendance this {data.period}</span>
          <span className="stat-value">{pct(periodPresent, people.length * daysElapsed)}%</span>
          <span className="stat-note">{prettyDate(from)} – {prettyDate(to)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Full attendance this {data.period}</span>
          <span className="stat-value good">{perfect}<small>/{people.length}</small></span>
        </div>
      </section>

      <section className="card">
        <h2>Daily present count <small>all shifts</small></h2>
        <div className="bars">
          {data.daily.map(d => (
            <button
              key={d.date}
              className={`bar ${d.date === shown ? 'selected' : ''} ${d.date > today ? 'future' : ''}`}
              onClick={() => d.date <= today && setDate(d.date)}
              title={`${prettyDate(d.date)}: ${d.present}`}
            >
              <span className="bar-fill" style={{ height: `${(d.present / maxDaily) * 100}%` }} />
              <span className="bar-label">{data.period === 'week' ? prettyDate(d.date, { weekday: 'short' }) : Number(d.date.slice(8))}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="two-col">
        <section className="card">
          <h2>{prettyDate(shown, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          <table className="table">
            <thead>
              <tr><th>Photo</th><th>Roll</th><th>Name</th><th>Shift</th><th>Time</th></tr>
            </thead>
            <tbody>
              {day.map(r => (
                <tr key={r.id} className={r.time ? '' : 'absent'}>
                  <td>
                    {r.photo_url ? (
                      <button className="thumb" onClick={() => setPhoto({ url: r.photo_url, caption: `${r.name} · ${prettyDate(shown)} ${r.time}` })}>
                        <img src={r.photo_url} alt="" loading="lazy" />
                      </button>
                    ) : <span className="thumb empty" />}
                  </td>
                  <td>{r.roll_no}</td>
                  <td><Link to={`/admin/employees/${r.id}`}>{r.name}</Link></td>
                  <td><span className={`pill ${r.shift}`}>{r.shift}</span></td>
                  <td>{r.time ?? <span className="tag-absent">Absent</span>}</td>
                </tr>
              ))}
              {day.length === 0 && <tr><td colSpan="5" className="empty-row">No employees yet</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>This {data.period} <small>{daysElapsed} day{daysElapsed === 1 ? '' : 's'} so far</small></h2>
          <table className="table">
            <thead>
              <tr><th>Roll</th><th>Name</th><th>Present</th><th>%</th></tr>
            </thead>
            <tbody>
              {people.map(p => (
                <tr key={p.id}>
                  <td>{p.roll_no}</td>
                  <td><Link to={`/admin/employees/${p.id}`}>{p.name}</Link></td>
                  <td>{p.present}/{daysElapsed}</td>
                  <td>
                    <div className="mini-meter">
                      <span style={{ width: `${pct(p.present, daysElapsed)}%` }} />
                    </div>
                    {pct(p.present, daysElapsed)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <PhotoModal photo={photo} onClose={() => setPhoto(null)} />
    </div>
  )
}
