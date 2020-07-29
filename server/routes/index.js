const express = require('express');
const app = express();
const { verifyToken } = require('../middlewares/authentication');
const {
    getUsers,
    signUpUser,
    login,
    refreshToken,
    getUserById,
    updateUser
} = require('../controllers/user');

/**
 * Endpoint: API Users
 */
app.get('/', (req, res) => {
    res.send("API users")
})

/**
 * Endpoint: Get all users
 */
app.get('/users', [verifyToken], getUsers)

/**
 * Endpoint: Sign up with email
 */
app.post('/sign-up', signUpUser)

/**
 * Endpoint: Login with email and password
 */
app.post('/login', login)

/**
 * Endpoint: Refresh token by user
 */
app.post('/refresh-token', refreshToken)

/**
 * Endpoint: Get user by id
 */
app.get('/user/:id', [verifyToken], getUserById)

/**
 * Endpoint: Update user
 */
app.put('/user/:id', [verifyToken], updateUser)

module.exports = app;