const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { db } = require('../db/db')
const { validatePassword, hashPassword } = require('../utils/password')
const { injectFeedback, injectValues, escapeHtml } = require('../utils/htmlInject')

const registerPath = path.join(__dirname, '../views/register.html')

async function handleRegister(req, res) {
  const { username, email, password } = req.body
  const rawHtml = fs.readFileSync(registerPath, 'utf-8')

  // Escape inputs to avoid XSS
  const escapedUsername = escapeHtml(username)
  const escapedEmail = escapeHtml(email)

  const errors = validatePassword(password)
  if (errors.length > 0) {
    const msg = `<ul style="color:red;">${errors.map((e) => `<li>${e}</li>`).join('')}</ul>`
    return res
      .status(400)
      .send(injectFeedback(injectValues(rawHtml, { username: escapedUsername, email: escapedEmail }), msg))
  }

  // SQL Injection vulnerability intentionally left in
  try {
    const unsafeQuery = `SELECT * FROM "User" WHERE "username" = '${username}' OR "email" = '${email}'`
    console.log(unsafeQuery)
    const existsResult = await db.$queryRawUnsafe(unsafeQuery)

    if (existsResult.length > 0) {
      return res
        .status(400)
        .send(
          injectFeedback(
            injectValues(rawHtml, { username: escapedUsername, email: escapedEmail }),
            `<p style="color:red;">Username or email already exists.</p>`
          )
        )
    }
  } catch (error) {
    return res
      .status(400)
      .send(
        injectFeedback(
          injectValues(rawHtml, { username: escapedUsername, email: escapedEmail }),
          `<p style="color:red;">Database error: ${escapeHtml(error.message)}</p>`
        )
      )
  }

  const salt = crypto.randomBytes(16).toString('hex')
  const hashed = hashPassword(password, salt)
  const saltedHash = `${salt}:${hashed}`

  await db.user.create({ data: { username, email, password: saltedHash } })

  const success = `<p style="color:green;">Registration successful!</p>`
  return res.send(
    injectFeedback(injectValues(rawHtml, { username: '', email: '' }), success)
  )
}

module.exports = { handleRegister }
