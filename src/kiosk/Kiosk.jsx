import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import Camera from './Camera.jsx'
import Keypad from './Keypad.jsx'
import { getDetector } from './face.js'

const RESULT_MS = 5000
const IDLE_MS = 30000

function errorMessage(err) {
  switch (err.code) {
    case 'NOT_FOUND': return { title: 'Wrong number', detail: 'This roll number is not registered' }
    case 'OUTSIDE_SHIFT': return {
      title: 'Not your shift time',
      detail: `${err.data.name}, your shift is ${err.data.shiftStart} – ${err.data.shiftEnd}`,
    }
    case 'ALREADY_MARKED': return {
      title: 'Already marked today',
      detail: err.data.time ? `${err.data.name}, marked at ${err.data.time}` : err.data.name,
      soft: true,
    }
    case 'UNAUTHORIZED': return { title: 'Tablet logged out', detail: 'Ask the admin to set up this tablet again' }
    default: return { title: 'Something went wrong', detail: 'Please try again' }
  }
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(t)
  }, [])
  return now
}

function Setup({ onDone }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const submit = async () => {
    try {
      await api('auth', { method: 'POST', body: { role: 'kiosk', secret: pin } })
      onDone()
    } catch (e) {
      setError(e.message)
      setPin('')
    }
  }
  return (
    <div className="kiosk">
      <div className="kiosk-screen">
        <h1 className="kiosk-title">Tablet setup</h1>
        <p className="kiosk-sub">{error || 'Enter the kiosk PIN'}</p>
        <Keypad value={pin} onChange={setPin} onSubmit={submit} masked maxLength={12} />
      </div>
    </div>
  )
}

export default function Kiosk() {
  const [authed, setAuthed] = useState(null)
  const [screen, setScreen] = useState('home') // home | keypad | camera | busy | result
  const [roll, setRoll] = useState('')
  const [person, setPerson] = useState(null)
  const [result, setResult] = useState(null)
  const idleTimer = useRef()
  const now = useClock()

  useEffect(() => {
    api('auth').then(r => setAuthed(r.kiosk)).catch(() => setAuthed(false))
    getDetector().catch(() => {})
  }, [])

  const reset = () => {
    setScreen('home')
    setRoll('')
    setPerson(null)
    setResult(null)
  }

  // drop back to the home screen if someone walks away mid-way
  useEffect(() => {
    clearTimeout(idleTimer.current)
    if (screen === 'keypad') idleTimer.current = setTimeout(reset, IDLE_MS)
    if (screen === 'result') idleTimer.current = setTimeout(reset, RESULT_MS)
    return () => clearTimeout(idleTimer.current)
  }, [screen, roll])

  const showError = err => {
    if (err.code === 'UNAUTHORIZED') setAuthed(false)
    setResult({ ok: false, ...errorMessage(err) })
    setScreen('result')
  }

  const checkRoll = async () => {
    setScreen('busy')
    try {
      const p = await api('kiosk', { method: 'POST', body: { action: 'check', roll } })
      setPerson(p)
      setScreen('camera')
    } catch (e) {
      showError(e)
    }
  }

  const submitPhoto = async (photo, faceScore) => {
    setScreen('busy')
    try {
      const r = await api('kiosk', { method: 'POST', body: { action: 'mark', roll, photo, faceScore } })
      setResult({ ok: true, title: r.name, detail: `Present · ${r.time}` })
      setScreen('result')
    } catch (e) {
      showError(e)
    }
  }

  const cameraError = kind => {
    setResult({
      ok: false,
      title: kind === 'camera' ? 'Camera blocked' : 'Camera did not start',
      detail: kind === 'camera' ? 'Allow camera access in the browser settings' : 'Check the internet and try again',
    })
    setScreen('result')
  }

  if (authed === null) return <div className="kiosk"><div className="spinner" /></div>
  if (!authed) return <Setup onDone={() => setAuthed(true)} />

  return (
    <div className="kiosk">
      {screen === 'home' && (
        <div className="kiosk-screen">
          <div className="kiosk-clock">
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="kiosk-date">
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <button type="button" className="big-button" onClick={() => setScreen('keypad')}>
            <span className="big-button-icon">☝</span>
            Mark Attendance
          </button>
        </div>
      )}

      {screen === 'keypad' && (
        <div className="kiosk-screen">
          <h1 className="kiosk-title">Your roll number</h1>
          <Keypad value={roll} onChange={setRoll} onSubmit={checkRoll} />
          <button type="button" className="back-button" onClick={reset}>← Back</button>
        </div>
      )}

      {screen === 'camera' && (
        <Camera name={person.name} onCapture={submitPhoto} onCancel={reset} onError={cameraError} />
      )}

      {screen === 'busy' && <div className="kiosk-screen"><div className="spinner" /></div>}

      {screen === 'result' && (
        <button type="button" className={`result ${result.ok ? 'ok' : result.soft ? 'soft' : 'bad'}`} onClick={reset}>
          <span className="result-icon">{result.ok ? '✓' : result.soft ? '!' : '✕'}</span>
          <span className="result-title">{result.title}</span>
          <span className="result-detail">{result.detail}</span>
        </button>
      )}
    </div>
  )
}
