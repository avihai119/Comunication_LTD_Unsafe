const express = require('express')
const path = require('path')
require('dotenv').config()
const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))
app.use(express.json()) // <-- Important for JSON POST requests

// Routes
app.use('/', require('./routes/index'))
app.use('/config', require('./routes/config'))
app.use('/auth', require('./routes/auth'))

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
