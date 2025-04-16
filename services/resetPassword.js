// services/resetPassword.js
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { db } = require('../db/db')
const { validatePassword, hashPassword } = require('../utils/password')

async function handleResetPassword(req, res) {
  const { email, code, newPassword } = req.body

  const viewPath = path.join(__dirname, '../views/forgot-password.html')
  const html = fs.readFileSync(viewPath, 'utf-8')
  const inject = (msg, color = 'red') =>
    html.replace(
      '<div id="feedback"></div>',
      `<div id="feedback"><p style="color:${color};">${msg}</p></div>`
    )

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return res.status(400).send(inject('Email not found.'))
  }

  if (user.resetCode !== code) {
    return res.status(400).send(inject('Invalid reset code.'))
  }

  const errors = validatePassword(newPassword)
  if (errors.length > 0) {
    return res.status(400).send(inject(errors.join('<br>')))
  }

  const salt = crypto.randomBytes(16).toString('hex')
  const hashed = hashPassword(newPassword, salt)
  const saltedHash = `${salt}:${hashed}`

  await db.user.update({
    where: { email },
    data: { password: saltedHash, resetCode: null },
  })

  return res.send(inject('Password reset successful.', 'green'))
}

module.exports = { handleResetPassword }
