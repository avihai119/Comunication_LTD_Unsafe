const path = require('path')
const fs = require('fs')
const { db } = require('../db/db')
const { injectFeedback, injectValues } = require('../utils/htmlInject')

const addClientPath = path.join(__dirname, '../views/dashboard.html')

async function handleAddClient(req, res) {
  const { name, email, phone, address } = req.body
  const rawHtml = fs.readFileSync(addClientPath, 'utf-8')

  if (!name || !email) {
    const msg = `<p style="color:red;">Name and email are required.</p>`
    return res.status(400).send(injectFeedback(injectValues(rawHtml, { name, email, phone, address }), msg))
  }

  // Unsafe email check with SQL injection vulnerability
  const unsafeEmailCheck = `SELECT * FROM "Client" WHERE "email" = '${email}'`
  console.log("Unsafe email check:", unsafeEmailCheck)
  const result = await db.$queryRawUnsafe(unsafeEmailCheck)

  if (result.length > 0) {
    const msg = `<p style="color:red;">A client with this email already exists.</p>`
    return res.status(400).send(injectFeedback(injectValues(rawHtml, { name, email, phone, address }), msg))
  }

  function sqlEscape(str) {
    return String(str).replace(/'/g, "''")
  }

  // Insert data insecurely (vulnerable to SQL injection)
const unsafeInsert = `
  INSERT INTO "Client" ("name", "email", "phone", "address")
  VALUES ('${sqlEscape(name)}', '${sqlEscape(email)}', '${sqlEscape(phone)}', '${sqlEscape(address)}')
`
  console.log("Unsafe INSERT query:", unsafeInsert)
  await db.$executeRawUnsafe(unsafeInsert)

  const msg = `<p style="color:green;">Client "${name}" has been added successfully!</p>`
  return res.send(injectFeedback(injectValues(rawHtml, { name: '', email: '', phone: '', address: '' }), msg))
}

module.exports = { handleAddClient }
