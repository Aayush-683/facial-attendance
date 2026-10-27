import crypto from 'node:crypto'

const COOKIE = { admin: 'admin_session', kiosk: 'kiosk_session' }
const MAX_AGE = { admin: 60 * 60 * 12, kiosk: 60 * 60 * 24 * 365 }

function hmac(data) {
  return crypto.createHmac('sha256', process.env.AUTH_SECRET).update(data).digest('base64url')
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb)
}

function readCookie(req, name) {
  const match = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? match[1] : null
}

function validToken(token, role) {
  if (!token) return false
  const [body, sig] = token.split('.')
  if (!body || !sig || !safeEqual(sig, hmac(body))) return false
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    return payload.role === role && payload.exp > Date.now()
  } catch {
    return false
  }
}

export function hasRole(req, role) {
  if (validToken(readCookie(req, COOKIE.admin), 'admin')) return true
  return role === 'kiosk' && validToken(readCookie(req, COOKIE.kiosk), 'kiosk')
}

export function checkSecret(role, secret) {
  const expected = role === 'admin' ? process.env.ADMIN_PASSWORD : process.env.KIOSK_PIN
  return Boolean(expected) && safeEqual(secret ?? '', expected)
}

export function setSession(res, role) {
  const body = Buffer.from(JSON.stringify({ role, exp: Date.now() + MAX_AGE[role] * 1000 })).toString('base64url')
  res.setHeader('Set-Cookie',
    `${COOKIE[role]}=${body}.${hmac(body)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE[role]}`)
}

export function clearSession(res, role) {
  res.setHeader('Set-Cookie', `${COOKIE[role]}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`)
}
