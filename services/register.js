// services/register.js
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { db } = require('../db/db');
const { validatePassword, hashPassword } = require('../utils/password');
const {
  WHITELIST,
  escapeHtml,
  injectValues,
  injectFeedback
} = require('../utils/htmlInject');

const viewPath = path.join(__dirname, '../views/register.html');

async function handleRegister(req, res) {
  const rawHtml = fs.readFileSync(viewPath, 'utf-8');
  const { username, email, password } = req.body;

  // Helper to repopulate form and inject feedback - PROTECTED FROM XSS
  function render(values, msgHtml) {
    const filled = injectValues(rawHtml, values);
    return injectFeedback(filled, msgHtml);
  }

  // A) Required fields
  if (!username || !email || !password) {
    return res
      .status(400)
      .send(render(
        { username, email, password },
        '<p style="color:red;">All fields are required.</p>'
      ));
  }

  // B) Basic validation only - REMOVED WHITELIST to allow SQL injection
  const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  
  // Only check length limits, no character restrictions
  if (username.length > 200 || email.length > 200 || password.length > 200) {
    return res
      .status(400)
      .send(render(
        { username, email, password: '' },
        '<p style="color:red;">Input too long.</p>'
      ));
  }
  
  // For email, only validate if it doesn't contain SQL injection patterns
  if (email.includes('@') && !email.includes(';') && !EMAIL_REGEX.test(email)) {
    return res
      .status(400)
      .send(render(
        { username, email, password: '' },
        '<p style="color:red;">Invalid email format.</p>'
      ));
  }

  const errors = validatePassword(password);
  if (errors.length > 0) {
    const list = `<ul style="color:red;">${
      errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')
    }</ul>`;
    return res
      .status(400)
      .send(render(
        { username, email, password: '' },
        list
      ));
  }

  // C) No password policy validation - REMOVED for SQL injection demo
  // But still protected from XSS via escapeHtml usage elsewhere

  try {
    // D) Uniqueness check - VULNERABLE to SQL injection
    const checkQuery = `SELECT * FROM "User" WHERE "username" = '${username}' OR "email" = '${email}'`;
    //console.log('Uniqueness check query:', checkQuery);
    const existingUsers = await db.$queryRawUnsafe(checkQuery);
    
    if (existingUsers.length > 0) {
      return res
        .status(400)
        .send(render(
          { username, email, password: '' },
          '<p style="color:red;">Username or email already exists.</p>'
        ));
    }

    // E) Create user with hashed password - VULNERABLE to SQL injection in query construction
    // Hash the password properly for security
    const salt = crypto.randomBytes(16).toString('hex');
    const hashed = hashPassword(password, salt);
    const saltedHash = `${salt}:${hashed}`;
    
    // BUT use vulnerable SQL injection query to insert it
    const insertQuery = `INSERT INTO "User" ("username", "email", "password") VALUES ('${username}', '${email}', '${saltedHash}')`;
    //console.log('Insert query:', insertQuery);
    await db.$executeRawUnsafe(insertQuery);

    // F) Success feedback
    return res
      .send(render(
        { username: '', email: '', password: '' },
        '<p style="color:green;">Registration successful!</p>'
      ));

  } catch (error) {
    console.error('Registration error:', error);
    return res
      .status(500)
      .send(render(
        { username, email, password: '' },
        '<p style="color:red;">Registration failed due to server error.</p>'
      ));
  }
}

module.exports = { handleRegister };