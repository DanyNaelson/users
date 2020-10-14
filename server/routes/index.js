const express = require('express');
const app = express();
const { verifyToken } = require('../middlewares/authentication');
const {
    getUsers,
    signUpUser,
    login,
    refreshToken,
    getUserById,
    updateUser,
    verifyConfirmationCode,
    resendConfirmationCode,
    updateUserPreferences
} = require('../controllers/user');

/**
 * Endpoint: API Users
 */
app.get(process.env.BASE_URL + '/', (req, res) => {
    res.send("API users")
})

/**
 * Endpoint: Get all users
 */
app.get(process.env.BASE_URL + '/users', [verifyToken], getUsers)

/**
 * Endpoint: Sign up with email
 */
app.post(process.env.BASE_URL + '/sign-up', signUpUser)

/**
 * Endpoint: Login with email and password
 */
app.post(process.env.BASE_URL + '/login', login)

/**
 * Endpoint: Refresh token by user
 */
app.post(process.env.BASE_URL + '/refresh-token', refreshToken)

/**
 * Endpoint: Get user by id
 */
app.get(process.env.BASE_URL + '/user/:user_id', [verifyToken], getUserById)

/**
 * Endpoint: Update user
 */
app.put(process.env.BASE_URL + '/user/:user_id', [verifyToken], updateUser)

/**
 * Endpoint: Verify confirmation code
 */
app.put(process.env.BASE_URL + '/verify-confirmation-code/:user_id', [verifyToken], verifyConfirmationCode)

/**
 * Endpoint: Verify confirmation code
 */
app.put(process.env.BASE_URL + '/resend-code/:user_id', [verifyToken], resendConfirmationCode)

/**
 * Endpoint: Update favorite drinks and favorite dishes
 */
app.put(process.env.BASE_URL + '/user/:preferences/:user_id', [verifyToken], updateUserPreferences)

module.exports = app;