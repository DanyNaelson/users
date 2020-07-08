const express = require('express');
const app = express();

/**
 * Endpoint: API Users
 */
app.get('/', (req, res) => {
    res.send("API users")
})

/**
 * Endpoint: Get all users
 */
app.get('/users', [], (req, res) => {
    res.json({
        users: [
            {id: 1, name: "Raul"},
            {id: 2, name: "Magally"},
            {id: 3, name: "Sharon"},
            {id: 4, name: "Sandra"},
            {id: 5, name: "Daniel"},
        ]
    })
})

module.exports = app;