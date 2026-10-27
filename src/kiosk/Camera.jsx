import { useEffect, useRef, useState } from 'react'
import { getDetector } from './face.js'

const HOLD_MS = 2400 // face must stay in frame through a 3-2-1 countdown
const TIMEOUT_MS = 30000
const PHOTO_WIDTH = 480

const HINTS = {
  loading: 'Starting camera…',
  none: 'Look at the camera',
  many: 'Only one person please',
  far: 'Come closer',
  ok: 'Hold still',
}

export default function Camera({ name, onCapture, onCancel, onError }) {
  const videoRef = useRef(null)
  const callbacks = useRef({})
  callbacks.current = { onCapture, onCancel, onError }
  const [hint, setHint] = useState('loading')
  const [count, setCount] = useState(null)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    let stream
    let raf
    let stopped = false

    const stop = () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach(t => t.stop())
    }

    async function capture(video, score) {
      stopped = true
      cancelAnimationFrame(raf)
      setCount(null)
      setFlash(true)
      const track = stream.getVideoTracks()[0]
      try {
        // real torch on the few tablets whose front camera has one; the white screen covers the rest
        if (track.getCapabilities?.().torch) await track.applyConstraints({ advanced: [{ torch: true }] })
      } catch { /* not supported */ }
      await new Promise(r => setTimeout(r, 250))

      const scale = Math.min(1, PHOTO_WIDTH / video.videoWidth)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(video.videoWidth * scale)
      canvas.height = Math.round(video.videoHeight * scale)
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      stop()
      callbacks.current.onCapture(canvas.toDataURL('image/jpeg', 0.7), score)
    }

    ;(async () => {
      try {
        const [s, detector] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          }),
          getDetector(),
        ])
        stream = s
        if (stopped) return stop()

        const video = videoRef.current
        video.srcObject = stream
        await video.play()
        setHint('none')

        const started = performance.now()
        let lastRun = 0
        let holdStart = null

        const tick = now => {
          if (stopped) return
          raf = requestAnimationFrame(tick)
          if (now - lastRun < 100) return
          lastRun = now

          if (holdStart === null && now - started > TIMEOUT_MS) {
            stop()
            return callbacks.current.onCancel()
          }

          const faces = detector.detectForVideo(video, now).detections
          let next = 'ok'
          if (faces.length === 0) next = 'none'
          else if (faces.length > 1) next = 'many'
          else if (faces[0].boundingBox.width < video.videoWidth * 0.18) next = 'far'
          setHint(next)

          if (next !== 'ok') {
            holdStart = null
            setCount(null)
            return
          }
          holdStart ??= now
          const left = HOLD_MS - (now - holdStart)
          if (left <= 0) return capture(video, faces[0].categories[0]?.score ?? null)
          setCount(Math.ceil(left / (HOLD_MS / 3)))
        }
        raf = requestAnimationFrame(tick)
      } catch (e) {
        if (stopped) return
        stop()
        callbacks.current.onError(e?.name === 'NotAllowedError' ? 'camera' : 'load')
      }
    })()

    return stop
  }, [])

  return (
    <div className="camera">
      <video ref={videoRef} className="camera-video" playsInline muted />
      <div className={`camera-guide hint-${hint}`} />
      <div className="camera-top">
        <div className="camera-name">{name}</div>
      </div>
      {count !== null && <div className="camera-count">{count}</div>}
      <div className={`camera-hint hint-${hint}`}>{HINTS[hint]}</div>
      <button type="button" className="camera-cancel" onClick={() => callbacks.current.onCancel()} aria-label="Cancel">
        ✕
      </button>
      {flash && <div className="flash" />}
    </div>
  )
}
