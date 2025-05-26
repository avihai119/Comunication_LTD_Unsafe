const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { db } = require('../db/db')
const { sendResetEmail } = require('../utils/email')

async function handleForgotPassword(req, res) {
  const { email } = req.body

  const viewPath = path.join(__dirname, '../views/forgot-password.html')
  const html = fs.readFileSync(viewPath, 'utf-8')

  const user = await db.user.findUnique({ where: { email } })

  // If email doesn't exist, show error and return page
  if (!user) {
    const errorHtml = html.replace(
      '<div id="feedback"></div>',
      '<div id="feedback"><p style="color:red;">Email not found in the system.</p></div>'
    )
    return res.status(400).send(errorHtml)
  }

  // If email exists, generate code and send
  const code = crypto.createHash('sha1').update(Math.random().toString()).digest('hex').slice(0, 6)

  await db.user.update({
    where: { email },
    data: { resetCode: code },
  })

  await sendResetEmail(email, code)

  const successHtml = html.replace(
    '<div id="feedback"></div>',
    `<div id="feedback"><p style="color:green;">Reset code sent to your email: ${email}</p>
     </div>`
  )

  res.send(successHtml)
}

module.exports = { handleForgotPassword }
