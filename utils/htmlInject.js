function injectFeedback(html, msg) {
  return html.replace('<div id="feedback"></div>', `<div id="feedback">${msg}</div>`)
}

function injectValues(html, { username = '', email = '' }) {
  return html
    .replace('name="username"', `name="username" value="${username}"`)
    .replace('name="email"', `name="email" value="${email}"`)
}

module.exports = { injectFeedback, injectValues }
