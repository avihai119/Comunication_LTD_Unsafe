const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { db } = require('../db/db')
const { validatePassword, hashPassword } = require('../utils/password')
const { getSecurityConfig } = require('../config/security')

async function handleChangePassword(req, res) {
  const { email, currentPassword, newPassword } = req.body

  const htmlPath = path.join(__dirname, '../views/change-password.html')
  const html = fs.readFileSync(htmlPath, 'utf-8')

  const inject = (msg, color = 'red') =>
    html.replace('<form', `<div id="feedback"><p style="color:${color};">${msg}</p></div><form`)

  // Validate input presence
  if (!email || !currentPassword || !newPassword) {
    return res
      .status(400)
      .send(inject('All fields are required (email, current password, new password).'))
  }

  // Fetch user #fix: using raw input from user into database, vulernable to sql injection (need to do escaping here)
  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return res.status(400).send(inject('User not found.'))
  }

  // Validate current password
  const [salt, storedHash] = user.password.split(':')
  if (!salt || !storedHash) {
    return res.status(500).send(inject('Stored password format is invalid.'))
  }

  const inputHash = hashPassword(currentPassword, salt)
  if (inputHash !== storedHash) {
    return res.status(400).send(inject('Current password is incorrect.'))
  }

  // Validate new password strength
  const errors = validatePassword(newPassword)
  if (errors.length > 0) {
    return res.status(400).send(inject(errors.join('<br>')))
  }

  // Check reuse in password history
  const config = getSecurityConfig()
  const historyLimit = config.historyLimit || 3

  const isReused = (user.passwordHistory || []).some((old) => {
    //console.log(old)
    const [oldSalt] = old.split(':') //takes the old salt from old password array
    //console.log(oldSalt)
    //const [oldHashedPassword] = old.split(':')
    //console.log(oldHashedPassword)
    //console.log(hashPassword(newPassword,oldSalt))
    const returnConsoleHashedPassword = hashPassword(newPassword, oldSalt) //computes the hashed password
    const returnSaltedHash = `${oldSalt}:${returnConsoleHashedPassword}` //combines the salt and hashed password
    return returnSaltedHash === old
  })
  const newPasswordHashed = hashPassword(newPassword,salt)
  const SameSaltedHash = `${salt}:${newPasswordHashed}`
  isReusedSamePassword = (SameSaltedHash === user.password) 
  console.log(SameSaltedHash)
  console.log(currentPassword)
  console.log(isReusedSamePassword)
  if (isReused) {//If user reuses his last 3 passwords
    return res.status(400).send(inject(`You cannot reuse your last ${historyLimit} password(s).`))
  }
  if (isReusedSamePassword) //If user enters his current password into new one
  {
    return res.status(400).send(inject(`You cannot use your current password.`))
  }
  // Hash new password and update history
  const newSalt = crypto.randomBytes(16).toString('hex')
  const newHashed = hashPassword(newPassword, newSalt)
  const newSaltedHash = `${newSalt}:${newHashed}`

  const newHistory = [user.password, ...(user.passwordHistory || [])].slice(0, historyLimit)

  await db.user.update({
    where: { email },
    data: {
      password: newSaltedHash,
      passwordHistory: newHistory,
    },
  })

  return res.send(inject('Password updated successfully.', 'green'))
}

module.exports = { handleChangePassword }
