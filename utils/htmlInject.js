function injectFeedback(html, msg) {
  return html.replace('<div id="feedback"></div>', `<div id="feedback">${msg}</div>`)
}

function injectValues(html, { username = '', email = '' }) {
  return html
    .replace('name="username"', `name="username" value="${username}"`)
    .replace('name="email"', `name="email" value="${email}"`)
}

const WHITELIST = /^[A-Za-z0-9 _@.\-]+$/

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

module.exports = { injectFeedback, injectValues, escapeHtml, WHITELIST }
