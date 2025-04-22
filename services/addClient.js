const path = require('path')
const fs = require('fs')
const { db } = require('../db/db')
const { injectFeedback, injectValues } = require('../utils/htmlInject')

const addClientPath = path.join(__dirname, '../views/dashboard.html')

async function handleAddClient(req, res) {
  const { name, email, phone, address } = req.body
  const rawHtml = fs.readFileSync(addClientPath, 'utf-8')

  // Check for missing required fields
  if (!name || !email) {
    const msg = `<p style="color:red;">Name and email are required.</p>`
    return res.status(400).send(injectFeedback(injectValues(rawHtml, { name, email, phone, address }), msg))
  }

  // Check if email is already used
  const exists = await db.client.findUnique({ where: { email } })
  if (exists) {
    const msg = `<p style="color:red;">A client with this email already exists.</p>`
    return res.status(400).send(injectFeedback(injectValues(rawHtml, { name, email, phone, address }), msg))
  }

  // Add the client to the database
  await db.client.create({data: {name,email, phone,address}})

  const msg = `<p style="color:green;">Client "${name}" has been added successfully!</p>`
  return res.send(injectFeedback(injectValues(rawHtml, { name: '', email: '', phone: '', address: '' }), msg))
}

module.exports = { handleAddClient }
