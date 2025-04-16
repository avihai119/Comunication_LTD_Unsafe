const express = require('express')
const path = require('path')
const fs = require('fs')
const router = express.Router()

const configPath = path.join(__dirname, '../config/security.config.json')

// UI Page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/edit-config.html'))
})

// JSON API for loading config
router.get('/data', (req, res) => {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  res.json(config)
})

// Save new config
router.post('/', (req, res) => {
  try {
    const forbiddenRaw = req.body.forbiddenWords

    const newConfig = {
      passwordLength: parseInt(req.body.passwordLength),
      requireUppercase: req.body.requireUppercase === 'true' || req.body.requireUppercase === true,
      requireLowercase: req.body.requireLowercase === 'true' || req.body.requireLowercase === true,
      requireDigits: req.body.requireDigits === 'true' || req.body.requireDigits === true,
      requireSpecial: req.body.requireSpecial === 'true' || req.body.requireSpecial === true,
      historyLimit: parseInt(req.body.historyLimit),
      forbiddenWords: Array.isArray(forbiddenRaw)
        ? forbiddenRaw
        : typeof forbiddenRaw === 'string'
        ? forbiddenRaw
            .split(',')
            .map((w) => w.trim())
            .filter(Boolean)
        : [],
      loginAttemptsLimit: parseInt(req.body.loginAttemptsLimit),
    }

    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2))
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Failed to update config:', err)
    res.status(500).json({ error: 'Failed to update config' })
  }
})

module.exports = router
