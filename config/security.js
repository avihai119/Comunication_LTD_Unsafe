const fs = require('fs')
const path = require('path')

function getSecurityConfig() {
  const configPath = path.join(__dirname, 'security.config.json')
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
}

module.exports = { getSecurityConfig }
