const fs = require('fs')
const path = require('path')
const { db } = require('../db/db')
const { hashPassword, validatePassword } = require('../utils/password')
const { injectFeedback, escapeHtml } = require('../utils/htmlInject')
const { getSecurityConfig } = require('../config/security')

const config = getSecurityConfig()
const MAX_ATTEMPTS = config.loginAttemptsLimit
const LOCK_DURATION = 30 * 60 * 1000
const loginAttempts = {} // memory-only
const loginPath = path.join(__dirname, '../public/index.html')

async function handleLogin(req, res) {
  const { username, password } = req.body
  const rawHtml = fs.readFileSync(loginPath, 'utf-8');
  
  // Prevent XSS using escapeHtml
  const escapedUsername = escapeHtml(username)
  const inject = (html) =>
    injectFeedback(
      rawHtml.replace('name="username"', `name="username" value="${escapedUsername}"`),
      html
    )
  
  // Password format validation (doesn't prevent SQLi)
  const validationErrors = validatePassword(password)
  if (validationErrors.length > 0) {
    return res.status(400).send(
      inject(`<ul style="color:red;">${validationErrors.map(e => `<li>${e}</li>`).join('')}</ul>`)
    )
  }

  try {
    // Check login attempts before processing
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

    // SQL Injection vulnerability on purpose - both username and password fields are injectable
    // This creates a hybrid approach: vulnerable SQL but with fallback password verification
    const unsafeQuery = `SELECT * FROM "User" WHERE "username" = '${username}' AND "password" = '${password}'`
    //console.log('Login query:', unsafeQuery)
    let userResult = await db.$queryRawUnsafe(unsafeQuery)
    let user = userResult[0]

    // If no direct match found (common with hashed passwords), try username-only lookup for proper password verification
    if (!user) {
      const fallbackQuery = `SELECT * FROM "User" WHERE "username" = '${username}'`
      //console.log('Fallback query:', fallbackQuery)
      const fallbackResult = await db.$queryRawUnsafe(fallbackQuery)
      const potentialUser = fallbackResult[0]
      
      if (potentialUser && potentialUser.password.includes(':')) {
        // Verify hashed password
        const [salt, storedHash] = potentialUser.password.split(':');
        const inputHash = hashPassword(password, salt);
        if (inputHash === storedHash) {
          user = potentialUser; // Password matches, use this user
        }
      } else if (potentialUser && potentialUser.password === password) {
        user = potentialUser;
      }
    }

    if (!user) {
      loginAttempts[username] = { count: record.count + 1, lastFailed: now }
      return res
        .status(400)
        .send(inject('<p style="color:red;">Username or password is incorrect.</p>'))
    }

    loginAttempts[username] = { count: 0, lastFailed: 0 }
    
    // Successful login
    return res.redirect('/dashboard')
    
  } catch (error) {
    console.error('Login error:', error)
    return res
      .status(500)
      .send(inject(`<p style="color:red;">Unexpected server error.</p>`))
  }
}

module.exports = { handleLogin }