const fs = require('fs');
const path = require('path');
const { db } = require('../db/db');
const { hashPassword } = require('../utils/password');
const { injectFeedback } = require('../utils/htmlInject');
const { getSecurityConfig } = require('../config/security');

const config = getSecurityConfig();
const MAX_ATTEMPTS = config.loginAttemptsLimit;
const LOCK_DURATION = 30 * 60 * 1000;
const loginAttempts = {}; // memory-only
//const loginPath = path.join(__dirname, '../views/login.html');
const loginPath = path.join(__dirname, '../public/index.html');


async function handleLogin(req, res) {
  const { username, password } = req.body;
  const rawHtml = fs.readFileSync(loginPath, 'utf-8');

  const inject = (html) =>
    injectFeedback(
      rawHtml.replace('name="username"', `name="username" value="${username}"`),
      html
    );

  const user = await db.user.findUnique({ where: { username } });
  if (!user) return res.status(400).send(inject('<p style="color:red;">User not found.</p>'));

  const now = Date.now();
  const record = loginAttempts[username] || { count: 0, lastFailed: 0 };

  if (record.count >= MAX_ATTEMPTS && now - record.lastFailed < LOCK_DURATION) {
    const msLeft = LOCK_DURATION - (now - record.lastFailed);
    const seconds = Math.floor(msLeft / 1000);
    return res.status(403).send(
      inject(`<p style="color:red;">Too many failed attempts.<br>
        Try again in <span id="countdown" data-seconds="${seconds}"></span>.</p>
        <script>
          const el = document.getElementById('countdown');
          let remaining = parseInt(el.dataset.seconds);
          function formatTime(seconds) {
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            return m + ':' + s;
          }
          el.textContent = formatTime(remaining);
          const interval = setInterval(() => {
            remaining--;
            el.textContent = formatTime(remaining);
            if (remaining <= 0) {
              clearInterval(interval);
              location.reload();
            }
          }, 1000);
        </script>`)
    );
  }

  const [salt, storedHash] = user.password.split(':');
  const inputHash = hashPassword(password, salt);

  if (inputHash !== storedHash) {
    const newCount = record.count + 1;
    loginAttempts[username] = { count: newCount, lastFailed: now };
    const left = MAX_ATTEMPTS - newCount;
    return res.status(400).send(
      inject(`<p style="color:red;">Invalid password. ${
        left > 0 ? `${left} attempt(s) left.` : 'You are now locked out for 30 minutes.'
      }</p>`)
    );
  }

  loginAttempts[username] = { count: 0, lastFailed: 0 };
  //return res.send(inject(`<p style="color:green;">Login successful!</p>`));
  return res.redirect('/dashboard');
}

module.exports = { handleLogin };
