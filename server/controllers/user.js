const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const _ = require('underscore');
const { requiredField, emailValidation, passValidation } = require('../shared/fieldValidation');
const { registeredUserBy } = require('../shared/errorDb');
const { createUser } = require('../models/actions')
const User = require('../models/user');
const { sendEmail } = require('../services/emailService');
const { isNull } = require('underscore');
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
    let validation = requiredField(body, 'email')
    if(!validation.ok)
        return res.status(400).json(validation)

    /** Email field validation */
    validation = emailValidation(body.email)
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
        newUser.save(async(err, userDB) => {
            if(err)
                return res.status(400).json({ ok: false, err })
    
            const { _id, role, nickname, email } = userDB;
            const user = { _id, role, nickname }

            /** Create token for future requests */
            const token = jwt.sign({
                user
            }, process.env.PRIVATE_KEY, { expiresIn: process.env.EXPIRATION_TOKEN })
            
            /** Create refreshToken for future requests */
            const refreshToken = jwt.sign({
                user
            }, process.env.PRIVATE_KEY_REFRESH, { expiresIn: process.env.EXPIRATION_TOKEN_REFRESH })

            /** Create confirmation code */
            const confirmationCode = Math.floor(100000 + Math.random() * 900000)

            /** Email body with verification code */
            const body = {
                to: email,
                subject: 'Código de confirmación',
                content: `<html>
                            <body>
                                <h2 style="color: #60b3a8;">Codigo de confirmación!</h2>
                                <h4>Tu código de confirmación: <b style="color: #60b3a8;">${confirmationCode}</b></h4>
                            </body>
                        </html>`
            }

            userDB.id = userDB._id.toString()
     
            let response = { ok: true, user: userDB, token, refreshToken, sentEmail: false }

            tokenList[refreshToken] = response

            /** Send email with verification code */
            const sentEmail = await sendEmail(body, token)

            if (sentEmail.ok) {
                const updatedCode = await userDB.updateOne({ confirmationCode: confirmationCode })

                if (updatedCode.ok)
                    response.sentEmail = true
                else
                    response.sentEmail = 'no_code'
            } else {
                response.sentEmail = 'no_code'
            }
    
            /** Return user data */
            res.json(response)
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

    /** Validate if the email field exists in the submitted body */
    let validation = requiredField(body, 'email')
    if(!validation.ok)
        return res.status(400).json(validation)

    /** Email field validation */
    validation = emailValidation(body.email)
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

    User.findOne({ email: body.email }, (err, userDB) => {
        if(err)
            return res.status(500).json({ ok: false, err })

        /** Check if user exists in the database */
        if(!userDB){
            return res.status(400).json({
                ok: false,
                err: {
                    message: "email_not_found",
                    field: 'email'
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
                    message: "invalid_credentials",
                    field: 'password'
                }
            }) 
        }

        const token = jwt.sign({
            user
        }, process.env.PRIVATE_KEY, { expiresIn: process.env.EXPIRATION_TOKEN })

        const refreshToken = jwt.sign({
            user
        }, process.env.PRIVATE_KEY_REFRESH, { expiresIn: process.env.EXPIRATION_TOKEN_REFRESH })

        userDB.id = userDB._id.toString()

        const response = { ok: true, user: userDB, token, refreshToken }

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
    if(body.refreshToken/* && (body.refreshToken in tokenList)*/) {
        const { user } = jwt.decode(body.refreshToken);

        const token = jwt.sign({
            user
        }, process.env.PRIVATE_KEY, { expiresIn: process.env.EXPIRATION_TOKEN })

        const refreshToken = jwt.sign({
            user
        }, process.env.PRIVATE_KEY_REFRESH, { expiresIn: process.env.EXPIRATION_TOKEN_REFRESH })
        const response = { ok: true, user, token, refreshToken }

        /** Update the token in the list */
        tokenList[refreshToken] = response

        User.findOne({ _id: user._id })
            .exec((err, userDB) => {
                if(err)
                    return res.status(400).json({ ok: false, err });

                if(isNull(userDB))
                    return res.status(404).json({
                        ok: false,
                        err: {
                            error: 'user_not_found',
                            message: 'logout'
                        }
                    })

                userDB.id = userDB._id.toString()

                res.json({ ok: true, user: userDB, token, refreshToken })
            }) 
    } else {
        res.status(401).json({
            ok: false,
            err: {
                error: 'not_authorized_final',
                message: 'logout'
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
    const id = req.params.user_id

    /** Check if id parameter is object id type or nickname */
    const isObjectId = objectIdRegexp.test(id)
    const query = isObjectId ? { _id: id } : { nickname: id }

    User.findOne(query)
        .exec((err, user) => {
            if(err)
                return res.status(400).json({ ok: false, err });

            if(isNull(user))
                return res.status(404).json({
                    ok: false,
                    err: {
                        error: 'user_not_found',
                        message: 'logout'
                    }
                })

            user.id = user._id.toString()

            res.json({ ok: true, user })
        })
}

/**
 * Update user
 * @param {*} req 
 * @param {*} res 
 */
const updateUser = (req, res) => {
    const id = req.params.user_id
    const body = _.pick(req.body, ['birthday', 'cell_phone', 'gender', 'zipCode'])

    User.findByIdAndUpdate(id, body, {
        new: true,
        runValidators: true
    }, (err, userDB) => {
        if(err)
            return res.status(400).json({ ok: false, err })

        if(!userDB){
            return res.status(404).json({
                ok: false,
                err: {
                    message: 'user_not_found'
                }
            })
        }
        
        res.json({ ok: true, user: userDB })
    })
}

/**
 * Verify confirmation code
 * @param {*} req 
 * @param {*} res 
 */
const verifyConfirmationCode = (req, res) => {
    const id = req.params.user_id
    const body = req.body

    /** Validate if the password field exists in the submitted body */
    validation = requiredField(body, 'confirmationCode')
    if(!validation.ok)
        return res.status(400).json(validation)

    const confirmationCode = body.confirmationCode

    User.findOne({ _id: id })
        .exec(async(err, userDB) => {
            if(err)
                return res.status(400).json({ ok: false, err })

            if(!userDB)
                return res.status(404).json({
                    ok: false,
                    err: {
                        error: 'user_not_found'
                    }
                })

            if(confirmationCode !== userDB.confirmationCode){
                return res.status(400).json({
                    ok: false,
                    err: {
                        error: 'incorrect_code',
                        message: 'incorrect_code'
                    }
                })
            }

            const user = await User.findOneAndUpdate({ _id: id }, { confirmationCode: "", confirm: true }, { new: true })

            if(!user)
                return res.status(404).json({
                    ok: false,
                    err: {
                        error: 'user_not_found',
                    }
                })

            res.json({ ok: true, user })
        })
}

/**
 * Resend confirmation code
 * @param {*} req 
 * @param {*} res 
 */
const resendConfirmationCode = (req, res) => {
    const id = req.params.user_id
    const payload = req.body
    const token = req.headers.authorization

    /** Validate if the email field exists in the submitted body */
    validation = requiredField(payload, 'email')
    if(!validation.ok)
        return res.status(400).json(validation)

    /** Email field validation */
    validation = emailValidation(payload.email)
    if(!validation.ok)
        return res.status(400).json(validation)

    User.findOne({ _id: id })
        .exec(async(err, userDB) => {
            if(err)
                return res.status(400).json({ ok: false, err })

            if(!userDB)
                return res.status(404).json({
                    ok: false,
                    err: {
                        error: 'user_not_found'
                    }
                })

            const user = await User.findOneAndUpdate({ _id: id }, { email: payload.email }, { new: true })

            if(!user)
                return res.status(404).json({
                    ok: false,
                    err: {
                        error: 'user_not_found',
                    }
                })

            /** Create confirmation code */
            const confirmationCode = Math.floor(100000 + Math.random() * 900000)

            /** Email body with verification code */
            const body = {
                to: payload.email,
                subject: 'Código de confirmación',
                content: `<html>
                            <body>
                                <h2 style="color: #60b3a8;">Codigo de confirmación!</h2>
                                <h4>Tu código de confirmación: <b style="color: #60b3a8;">${confirmationCode}</b></h4>
                            </body>
                        </html>`
            }

            /** Send email with verification code */
            const sentEmail = await sendEmail(body, token)

            let response = { ok: true, user, sentEmail: false }

            if (sentEmail.ok) {
                const updatedCode = await userDB.updateOne({ confirmationCode: confirmationCode })

                if (updatedCode.ok)
                    response.sentEmail = true
                else
                    response.sentEmail = 'no_code'
            } else {
                response.sentEmail = 'no_code'
            }

            res.json({ ok: true, user })
        })
}

/**
 * Update user preferences
 * @param {*} req 
 * @param {*} res 
 */
const updateUserPreferences = (req, res) => {
    const id = req.params.user_id
    const preferences = req.params.preferences
    const body = req.body
    const subQuery = preferences === 'drinks' ? { favoriteDrinks: body.favoriteDrinks } : { favoriteDishes: body.favoriteDishes }

    User.findByIdAndUpdate({ _id: id }, 
    {'$set': subQuery}, {
        new: true,
        runValidators: true
    }, (err, userDB) => {
        if(err)
            return res.status(400).json({ ok: false, err })

        if(!userDB){
            return res.status(404).json({
                ok: false,
                err: {
                    message: 'user_not_found'
                }
            })
        }
        
        res.json({ ok: true, user: userDB })
    })
}

module.exports = {
    getUsers,
    signUpUser,
    login,
    refreshToken,
    getUserById,
    updateUser,
    verifyConfirmationCode,
    resendConfirmationCode,
    updateUserPreferences
}