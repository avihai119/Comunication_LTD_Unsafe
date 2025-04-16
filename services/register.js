const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { db } = require('../db/db')
const { validatePassword, hashPassword } = require('../utils/password')
const { injectFeedback, injectValues } = require('../utils/htmlInject')

const registerPath = path.join(__dirname, '../views/register.html')

async function handleRegister(req, res) {
  const { username, email, password } = req.body
  const rawHtml = fs.readFileSync(registerPath, 'utf-8')
  const errors = validatePassword(password)

  if (errors.length > 0) {
    const msg = `<ul style="color:red;">${errors.map((e) => `<li>${e}</li>`).join('')}</ul>`
    return res.status(400).send(injectFeedback(injectValues(rawHtml, { username, email }), msg))
  }

  const exists = await db.user.findFirst({ where: { OR: [{ username }, { email }] } })
  if (exists) {
    return res
      .status(400)
      .send(
        injectFeedback(
          injectValues(rawHtml, { username, email }),
          `<p style="color:red;">Username or email already exists.</p>`
        )
      )
  }

  const salt = crypto.randomBytes(16).toString('hex')
  const hashed = hashPassword(password, salt)
  const saltedHash = `${salt}:${hashed}`

  await db.user.create({ data: { username, email, password: saltedHash } })

  const success = `<p style="color:green;">Registration successful!</p>`
  return res.send(injectFeedback(injectValues(rawHtml, { username: '', email: '' }), success))
}

module.exports = { handleRegister }
