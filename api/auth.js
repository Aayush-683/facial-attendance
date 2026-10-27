import { checkSecret, clearSession, hasRole, setSession } from '../lib/auth.js'
import { handler, HttpError } from '../lib/http.js'

export default handler({
  GET: {
    fn: req => ({ admin: hasRole(req, 'admin'), kiosk: hasRole(req, 'kiosk') }),
  },
  POST: {
    fn: (req, res) => {
      const { role, secret } = req.body ?? {}
      if (role !== 'admin' && role !== 'kiosk') throw new HttpError(400, 'Bad role')
      if (!checkSecret(role, secret)) {
        throw new HttpError(401, role === 'admin' ? 'Wrong password' : 'Wrong PIN', 'BAD_SECRET')
      }
      setSession(res, role)
      return { ok: true }
    },
  },
  DELETE: {
    fn: (req, res) => {
      clearSession(res, req.query.role === 'kiosk' ? 'kiosk' : 'admin')
      return { ok: true }
    },
  },
})
