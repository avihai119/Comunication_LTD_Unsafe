const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { db } = require('../db/db')
const { validatePassword, hashPassword } = require('../utils/password')
const { injectFeedback, injectValues } = require('../utils/htmlInject')

const registerPath = path.join(__dirname, '../views/register.html')

async function handleRegister(req, res) {
  const rawHtml = fs.readFileSync(registerPath, 'utf-8')

  // ── ADDED: Whitelist & escaping helpers ─────────────────────
  const WHITELIST = /^[A-Za-z0-9 _@.\-]+$/
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
  function validUsername(u) {
    return typeof u === 'string' && u.length > 0 && u.length <= 30 && WHITELIST.test(u)
  }
  function validEmail(e) {
    return typeof e === 'string'
      && /^[^@\s]+@[^@\s]+$/.test(e)
      && e.length <= 50
  }
  function validPasswordChars(p) {
    return typeof p === 'string' && p.length > 0 && p.length <= 50 && WHITELIST.test(p)
  }
  // ── END ADDED ────────────────────────────────────────────────

  const { username, email, password } = req.body
  const inject = html =>
    injectFeedback(
      // ── ADDED: inject escaped values ─────────────────────────
      injectValues(
        rawHtml,
        { 
          username: escapeHtml(username || ''),
          email:    escapeHtml(email    || '')
        }
      ),
      html
    )

      // ── DEBUG: Log validation results (remove after diagnosis)
  console.log('[Register Debug]', {
    username,
    usernameValid: validUsername(username),
    email,
    emailValid: validEmail(email),
    passwordValid: validPasswordChars(password)
  });


  // ── ADDED: Input format checks ─────────────────────────────
  if (!validUsername(username) || !validEmail(email) || !validPasswordChars(password)) {
    const msg = '<p style="color:red;">Registration failed.</p>'
    return res.status(400).send(inject(msg))
  }
  // ── END ADDED ───────────────────────────────────────────────

  // 1) Password policy
  const errors = validatePassword(password)
  if (errors.length > 0) {
    const msg = `<ul style="color:red;">${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`
    return res.status(400).send(inject(msg))
  }

  // 2) Uniqueness
  const exists = await db.user.findFirst({
    where: { OR: [{ username }, { email }] }
  })
  if (exists) {
    const msg = '<p style="color:red;">Registration failed.</p>'
    return res.status(400).send(inject(msg))
  }

  // 3) Create user
  const salt = crypto.randomBytes(16).toString('hex')
  const hashed = hashPassword(password, salt)
  const saltedHash = `${salt}:${hashed}`

  await db.user.create({
    data: { username, email, password: saltedHash }
  })

  const success = '<p style="color:green;">Registration successful!</p>'
  return res.send(inject(success))
}

module.exports = { handleRegister }
