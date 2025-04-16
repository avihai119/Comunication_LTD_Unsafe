const crypto = require('crypto')
const { getSecurityConfig } = require('../config/security')

function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex')
}

function validatePassword(pwd) {
  const config = getSecurityConfig()
  const errors = []
  if (pwd.length < config.passwordLength)
    errors.push(`Password must be at least ${config.passwordLength} characters long.`)
  if (config.requireUppercase && !/[A-Z]/.test(pwd))
    errors.push('Password must include an uppercase letter.')
  if (config.requireLowercase && !/[a-z]/.test(pwd))
    errors.push('Password must include a lowercase letter.')
  if (config.requireDigits && !/\d/.test(pwd)) errors.push('Password must include a digit.')
  if (config.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(pwd))
    errors.push('Password must include a special character.')
  if (config.forbiddenWords.some((w) => pwd.toLowerCase().includes(w.toLowerCase())))
    errors.push('Password contains a forbidden word.')
  return errors
}

module.exports = { hashPassword, validatePassword }
