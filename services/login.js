const fs = require('fs')
const path = require('path')
const { db } = require('../db/db')
const { hashPassword } = require('../utils/password')
const { injectFeedback } = require('../utils/htmlInject')
const { getSecurityConfig } = require('../config/security')
const { escapeHtml, WHITELIST } = require('../utils/htmlInject')

const config = getSecurityConfig()
const MAX_ATTEMPTS = config.loginAttemptsLimit
const LOCK_DURATION = 30 * 60 * 1000
const loginAttempts = {} // memory-only
const loginPath = path.join(__dirname, '../public/index.html')

async function handleLogin(req, res) {
  const { username, password } = req.body
  const rawHtml = fs.readFileSync(loginPath, 'utf-8')

  if (!WHITELIST.test(username) || username.length > 30) {
    return res.status(400).send(injectFeedback(rawHtml, `<p style="color:red;">Login failed.</p>`))
  }

  const escapedUsername = escapeHtml(username)
  const inject = (html) =>
    injectFeedback(
      rawHtml.replace('name="username"', `name="username" value="${escapedUsername}"`),
      html
    )

  const user = await db.user.findUnique({ where: { username } })
  if (!user) {
    return res
      .status(400)
      .send(inject('<p style="color:red;">Username or password is incorrect.</p>'))
  }

  const now = Date.now()
  const record = loginAttempts[username] || { count: 0, lastFailed: 0 }

  if (record.count >= MAX_ATTEMPTS && now - record.lastFailed < LOCK_DURATION) {
    return res
      .status(403)
      .send(
        inject(
          '<p style="color:red;">Your account is temporarily locked due to multiple failed attempts. Try again later.</p>'
        )
      )
  }

  const [salt, storedHash] = user.password.split(':')
  const inputHash = hashPassword(password, salt)

  if (inputHash !== storedHash) {
    loginAttempts[username] = { count: record.count + 1, lastFailed: now }
    return res
      .status(400)
      .send(inject('<p style="color:red;">Username or password is incorrect.</p>'))
  }

  loginAttempts[username] = { count: 0, lastFailed: 0 }
  return res.redirect('/dashboard')
}

module.exports = { handleLogin }
