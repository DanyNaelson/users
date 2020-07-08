require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes/index');
const cors = require('cors');
const app = express();

const whitelist = ['*']//[http://localhost:3000']

const corsOptions = {
    origin: '*',//function (origin, callback) {
    //     if (whitelist.indexOf(origin) !== -1) {
    //       callback(null, true)
    //     } else {
    //       callback(new Error('Not allowed by CORS'))
    //     }
    // },
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

/**
 * Parse application/json
 */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * Global settings of the routes
 */
app.use(routes)

/**
 * Run server
 */
app.listen(process.env.PORT, () => console.log('Running server in the port: ', process.env.PORT))