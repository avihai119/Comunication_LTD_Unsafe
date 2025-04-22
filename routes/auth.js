// routes/auth.js
const express = require('express')
const router = express.Router()
const { handleRegister } = require('../services/register')
const { handleLogin } = require('../services/login')
const { handleForgotPassword } = require('../services/forgotPassword')
const { handleResetPassword } = require('../services/resetPassword')
const { handleChangePassword } = require('../services/changePassword')
const { handleAddClient } = require('../services/addClient')

//router.post('/index',handleLogin)
router.post('/register', handleRegister)
router.post('/login', handleLogin)
router.post('/forgot-password', handleForgotPassword)
router.post('/reset-password', handleResetPassword)
router.post('/change-password', handleChangePassword)
router.post('/add-client', handleAddClient)

module.exports = router
