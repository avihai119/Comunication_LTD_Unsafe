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

  // Keep password validation from original
  const errors = validatePassword(password)
  if (errors.length > 0) {
    const msg = `<ul style="color:red;">${errors.map((e) => `<li>${e}</li>`).join('')}</ul>`
    return res.status(400).send(injectFeedback(injectValues(rawHtml, { username, email }), msg))
  }

  // VULNERABLE SQLi check - using table and column names that should exist
  try {
    // First, let's try to find the correct table/column names from your working Prisma query
    // This query structure should match your existing schema
    const unsafeQuery = `SELECT * FROM "User" WHERE "username" = '${username}' OR "email" = '${email}'`
    const existsResult = await db.$queryRawUnsafe(unsafeQuery)
    
    if (existsResult.length > 0) {
      return res
        .status(400)
        .send(
          injectFeedback(
            injectValues(rawHtml, { username, email }), // XSS: No HTML escaping
            `<p style="color:red;">Username or email already exists.</p>`
          )
        )
    }
  } catch (error) {
    // If the unsafe query fails, fall back to the safe Prisma query
    console.log('Raw query failed, using Prisma fallback:', error.message)
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
  }

  const salt = crypto.randomBytes(16).toString('hex')
  const hashed = hashPassword(password, salt)
  const saltedHash = `${salt}:${hashed}`
  
  await db.user.create({ data: { username, email, password: saltedHash } })
  
  const success = `<p style="color:green;">Registration successful!</p>`
  return res.send(injectFeedback(injectValues(rawHtml, { username: '', email: '' }), success))
}

module.exports = { handleRegister }