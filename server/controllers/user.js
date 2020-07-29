const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const _ = require('underscore');
const { requiredField, emailValidation, passValidation } = require('../shared/fieldValidation');
const { registeredUserBy } = require('../shared/errorDb');
const { createUser } = require('../models/actions')
const User = require('../models/user');
let tokenList = {}

/**
 * Get all users
 * @param {*} req 
 * @param {*} res 
 */
const getUsers = (req, res) => {
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
}

/**
 * Sign up with email
 * @param {*} req 
 * @param {*} res 
 */
const signUpUser = (req, res) => {
    const body = req.body;

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
    
            const { _id, role, nickname } = userDB;
            const user = { _id, role, nickname }

            /** Create token for future requests */
            const token = jwt.sign({
                user
            }, process.env.PRIVATE_KEY, { expiresIn: process.env.EXPIRATION_TOKEN })
    
            /** Return user data */
            res.json({ ok: true, user, token })
        })
    })
}

/**
 * Login with email and password
 * @param {*} req 
 * @param {*} res 
 */
const login = (req, res) => {
    const body = req.body

    User.findOne({ email: body.email }, (err, userDB) => {
        if(err)
            return res.status(500).json({ ok: false, err })

        /** Check if user exists in the database */
        if(!userDB){
            return res.status(400).json({
                ok: false,
                err: {
                    message: "invalid_credentials"
                }
            })
        }

        const { _id, role, nickname } = userDB;
        const user = { _id, role, nickname }

        /** Check if the password is correct */
        if(!bcrypt.compareSync( body.password, userDB.password )){
            return res.status(400).json({
                ok: false,
                err: {
                    message: "invalid_credentials"
                }
            }) 
        }

        const token = jwt.sign({
            user
        }, process.env.PRIVATE_KEY, { expiresIn: process.env.EXPIRATION_TOKEN })

        const refreshToken = jwt.sign({
            user
        }, process.env.PRIVATE_KEY_REFRESH, { expiresIn: process.env.EXPIRATION_TOKEN_REFRESH })
        const response = { ok: true, user, token, refreshToken }

        tokenList[refreshToken] = response

        res.json(response)
    })
}

/**
 * Refresh token by user
 * @param {*} req 
 * @param {*} res 
 */
const refreshToken = (req, res) => {
    const body = req.body

    /** Check if refresh token exists */
    if((body.refreshToken) && (body.refreshToken in tokenList)) {
        const { id, role, nickname } = body;
        const user = { _id: id, role, nickname }

        const token = jwt.sign({
            user
        }, process.env.PRIVATE_KEY, { expiresIn: process.env.EXPIRATION_TOKEN })

        const refreshToken = jwt.sign({
            user
        }, process.env.PRIVATE_KEY_REFRESH, { expiresIn: process.env.EXPIRATION_TOKEN_REFRESH })
        const response = { ok: true, user, token, refreshToken }

        /** Update the token in the list */
        tokenList[refreshToken] = { ok: true, user, token, refreshToken }

        res.json(response)       
    } else {
        res.status(401).json({
            ok: false,
            err: {
                message: 'not_authorized_final'
            }
        })
    }
}

/**
 * Get user by id
 * @param {*} req 
 * @param {*} res 
 */
const getUserById = (req, res) => {
    const objectIdRegexp = new RegExp("^[0-9a-fA-F]{24}$");
    const id = req.params.id

    /** Check if id parameter is object id type or nickname */
    const isObjectId = objectIdRegexp.test(id)
    const query = isObjectId ? { _id: id } : { nickname: id }

    User.findOne(query)
        .exec((err, user) => {
            if(err)
                return res.status(400).json({ ok: false, err });

            res.json({ ok: true, user })
        })
}

/**
 * Update user
 * @param {*} req 
 * @param {*} res 
 */
const updateUser = (req, res) => {
    const id = req.params.id
    const body = _.pick(req.body, ['nickname', 'birthday', 'cell_phone', 'gender', 'zipCode'])

    User.findByIdAndUpdate(id, body, {
        new: true,
        runValidators: true
    }, (err, userDB) => {
        if(err)
            return res.status(400).json({ ok: false, err })

        if(!userDB){
            return res.status(400).json({
                ok: false,
                err: {
                    message: 'user_not_found'
                }
            })
        }
        
        res.json({ user: userDB })
    })
}

module.exports = {
    getUsers,
    signUpUser,
    login,
    refreshToken,
    getUserById,
    updateUser
}