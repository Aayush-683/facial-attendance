import { useEffect, useState } from 'react'
import { api } from '../api.js'

// GETs `path` and keeps the previous data on screen while a new path loads.
export function useLoad(path, onAuthError) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let live = true
    setState(s => ({ ...s, loading: true }))
    api(path)
      .then(data => live && setState({ data, error: null, loading: false }))
      .catch(e => {
        if (!live) return
        if (e.status === 401) onAuthError()
        setState(s => ({ ...s, error: e.message, loading: false }))
      })
    return () => { live = false }
  }, [path, nonce])

  return { ...state, reload: () => setNonce(n => n + 1) }
}
