// routes/index.js
const express = require('express')
const router = express.Router()
const path = require('path')

const view = (file) => path.join(__dirname, '../views', file)

// No need to handle '/' here — it's served by public/index.html
router.get('/register', (req, res) => res.sendFile(view('register.html')))
//router.get('/login', (req, res) => res.sendFile(view('login.html')))
router.get('/login', (req, res) => res.sendFile(view('index.html')))
router.get('/dashboard', (req, res) => res.sendFile(view('dashboard.html')))
router.get('/forgot-password', (req, res) => res.sendFile(view('forgot-password.html')))
router.get('/change-password', (req, res) => res.sendFile(view('change-password.html')))

module.exports = router
