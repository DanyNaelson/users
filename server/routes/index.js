const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt')
const { requiredField, emailValidation, passValidation } = require('./../shared/fieldValidation');
const { registeredUserBy } = require('./../shared/errorDb');
const { createUser } = require('./../models/actions')
const { verifyToken } = require('./../middlewares/authentication')
const User = require('./../models/user');

/**
 * Endpoint: API Users
 */
app.get('/', (req, res) => {
    res.send("API users")
})

/**
 * Endpoint: Get all users
 */
app.get('/users', [verifyToken], (req, res) => {
    User.find({})
        .exec((err, users) => {
            if(err)
                return res.status(400).json({ ok: false, err });

            User.countDocuments({}, (err, count) => {
                res.json({
                    ok: true,
                    users,
                    count
                })
            })

        })
})

/**
 * Endpoint: Sign up with email
 */
app.post('/sign-up', (req, res) => {
    let body = req.body;

    /** Validate if the email field exists in the submitted body */
    validation = requiredField(body, 'email')
    if(!validation.ok)
        return res.status(400).json(validation)

    /** Email field validation */
    validation = emailValidation(body.email)
    if(!validation.ok)
        return res.status(400).json(validation)

    /** Validate if the birthday field exists in the submitted body */
    validation = requiredField(body, 'birthday')
    if(!validation.ok)
        return res.status(400).json(validation)

    /** Validate if the zip code field exists in the submitted body */
    validation = requiredField(body, 'zipCode')
    if(!validation.ok)
        return res.status(400).json(validation)

    /** Validate if the gender field exists in the submitted body */
    validation = requiredField(body, 'gender')
    if(!validation.ok)
        return res.status(400).json(validation)

    /** Validate if the password field exists in the submitted body */
    validation = requiredField(body, 'password')
    if(!validation.ok)
        return res.status(400).json(validation)

    /** Password field validation */
    validation = passValidation(body.password)
    if(!validation.ok)
        return res.status(400).json(validation)

    /** Search user in database */
    User.findOne({ email: body.email }, (err, userDB) => {
        if(err)
            return res.status(500).json({ ok: false, err })

        /** Verify if user is registered */
        let isNewUser = registeredUserBy(userDB, 'email')
        if(!isNewUser.ok){
            return res.status(400).json(isNewUser)
        }

        /** Create user */
        const newUser = createUser(body)

        /** Save user into database */
        newUser.save((err, userDB) => {
            if(err)
                return res.status(400).json({ ok: false, err })
    
            const { _id, photo, role, url } = userDB;
            const user = { _id, photo, role, url }

            /** Create token for future requests */
            const token = jwt.sign({
                user
            }, process.env.PRIVATE_KEY, { expiresIn: process.env.EXPIRATION_TOKEN })
    
            /** Return user data */
            res.json({ ok: true, user, token })
        })
    })
})

/**
 * Endpoint: Login with email and password
 */
app.post('/login', (req, res) => {
    let body = req.body

    User.findOne({ email: body.email }, (err, userDB) => {
        if(err)
            return res.status(500).json({ ok: false, err })

        if(!userDB){
            return res.status(400).json({
                ok: false,
                err: {
                    message: "invalid_credentials"
                }
            })
        }

        const { _id, photo, role, url } = userDB;
        const user = { _id, photo, role, url }

        if(!bcrypt.compareSync( body.password, userDB.password )){
            return res.status(400).json({
                ok: false,
                err: {
                    message: "invalid_credentials"
                }
            }) 
        }

        let token = jwt.sign({
            user
        }, process.env.PRIVATE_KEY, { expiresIn: process.env.EXPIRATION_TOKEN })

        res.json({ ok: true, user, token })
    })
})

module.exports = app;