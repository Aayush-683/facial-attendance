import { hasRole } from './auth.js'

export class HttpError extends Error {
  constructor(status, message, code, extra) {
    super(message)
    this.status = status
    this.code = code
    this.extra = extra
  }
}

// routes: { GET: { role: 'admin' | 'kiosk' | null, fn: async (req, res) => json } }
export function handler(routes) {
  return async (req, res) => {
    const route = routes[req.method]
    if (!route) return res.status(405).json({ error: 'Method not allowed' })
    if (route.role && !hasRole(req, route.role)) {
      return res.status(401).json({ error: 'Please log in again', code: 'UNAUTHORIZED' })
    }
    try {
      const out = await route.fn(req, res)
      if (!res.headersSent) res.status(200).json(out ?? { ok: true })
    } catch (e) {
      if (e instanceof HttpError) {
        return res.status(e.status).json({ error: e.message, code: e.code, ...e.extra })
      }
      if (e.code === '23505') return res.status(409).json({ error: 'Roll number already exists', code: 'DUPLICATE' })
      if (e.code === '22P02' || e.code === '22007' || e.code === '22008') {
        return res.status(400).json({ error: 'Invalid value', code: 'BAD_INPUT' })
      }
      console.error(e)
      res.status(500).json({ error: 'Server error' })
    }
  }
}

export const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s ?? '')
