const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
const bcrypt = require('bcrypt');
const _ = require('underscore');
const { requiredField, emailValidation, passValidation } = require('../shared/fieldValidation');
const { createUser } = require('../models/actions')
const {
    createTokenAndRefreshTokenByUser,
    getAppleSigninKey,
    registeredUserBy,
    verifyGoogleToken,
    verifyToken,
    getFacebookUserData
} = require('../shared/functions')
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
        if(userDB){
            const registeredUserType = registeredUserBy(userDB)

            return res.status(400).json({
                ok: false,
                err: {
                    message: `registered_user_by_${registeredUserType}`,
                    registered_by: registeredUserType,
                    field: "email"
                }
            })
        }

        /** Create user */
        const newUser = createUser(body)

        /** Save user into database */
        newUser.save(async(err, userDB) => {
            if(err)
                return res.status(400).json({ ok: false, err })
    
            const { _id, role, nickname, email } = userDB;
            const user = { _id, role, nickname }

            /** Create token and refresh token for future requests */
            const { token, refreshToken } = createTokenAndRefreshTokenByUser(user)

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

        /** Check if user exists in the database by email */
        if(!userDB.withEmail){
            const registeredUserType = registeredUserBy(userDB)

            return res.status(400).json({
                ok: false,
                err: {
                    message: `registered_user_by_${registeredUserType}`,
                    registered_by: registeredUserType,
                    field: "email"
                }
            })
        }

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

        const { _id, role, nickname } = userDB;
        const user = { _id, role, nickname }

        /** Create token and refresh token for future requests */
        const { token, refreshToken } = createTokenAndRefreshTokenByUser(user)

        userDB.id = userDB._id.toString()

        const response = { ok: true, user: userDB, token, refreshToken }

        tokenList[refreshToken] = response

        res.json(response)
    })
}

/**
 * Login with social network
 * @param {*} req 
 * @param {*} res 
 */
const signInSocialNetwork = async (req, res) => {
    const { social_network } = req.params
    const body = req.body
    const socialNetworks = [ 'apple', 'facebook', 'google' ]
    let validation = {}

    if(!socialNetworks.includes(social_network))
        return res.status(400).json({
            ok: false,
            err: {
                message: 'social_network_not_found'
            }
        })

    switch(social_network){
        case "apple":
            /** Validate if the identity token by apple exists in the submitted body */
            validation = requiredField(body, 'identityToken')
            if(!validation.ok)
                return res.status(400).json(validation)

            const { identityToken, user } = body
            const json = jwt.decode(identityToken, { complete: true })
            const kid = json.header.kid
            const appleKey = await getAppleSigninKey(kid)

            if(!appleKey)
                return res.status(400).json({
                    ok: false,
                    err: {
                        message: 'apple_error'
                    }
                })

            const payload = await verifyToken(identityToken, appleKey)

            if(!payload)
                return res.status(400).json({
                    ok: false,
                    err: {
                        message: 'apple_token_invalid'
                    }
                })

            if(payload.sub !== user)
                return res.status(400).json({
                    ok: false,
                    err: {
                        message: 'apple_user_invalid'
                    }
                })
            
            if(payload.aud !== "com.laostra.laostra")
                return res.status(400).json({
                    ok: false,
                    err: {
                        message: 'app_invalid'
                    }
                })
            
            /** Search user in database */
            User.findOne({ email: payload.email }, (err, userDB) => {
                if(err)
                    return res.status(500).json({ ok: false, err })

                if(!userDB){
                    /** Create user */
                    const bodyUser = {
                        email: payload.email,
                        password: user,
                        apple: true,
                        confirm: true
                    }
                    const newUser = createUser(bodyUser)

                    /** Save user into database */
                    newUser.save(async(err, userDB) => {
                        if(err)
                            return res.status(400).json({ ok: false, err })
                
                        const { _id, role, nickname, email } = userDB;
                        const user = { _id, role, nickname }

                        /** Create token and refresh token for future requests */
                        const { token, refreshToken } = createTokenAndRefreshTokenByUser(user)
                
                        let response = { ok: true, user: userDB, token, refreshToken, signUp: true }

                        tokenList[refreshToken] = response
                
                        /** Return user data */
                        res.json(response)
                    })
                } else {
                    if(userDB.apple) {
                        const { _id, role, nickname, email } = userDB;
                        const user = { _id, role, nickname }

                        /** Create token and refresh token for future requests */
                        const { token, refreshToken } = createTokenAndRefreshTokenByUser(user)
                
                        let response = { ok: true, user: userDB, token, refreshToken, signUp: false }

                        tokenList[refreshToken] = response
                
                        /** Return user data */
                        res.json(response)
                    } else {
                        const registeredUserType = registeredUserBy(userDB)

                        return res.status(400).json({
                            ok: false,
                            err: {
                                message: `registered_user_by_${registeredUserType}`,
                                registered_by: registeredUserType,
                                field: registeredUserType
                            }
                        })
                    }
                }
            })

            break
        case "facebook":
            let accessToken = body.accessToken
            let facebookUser = await getFacebookUserData(accessToken)
                .catch(e => {
                    return res.status(403).json({
                        ok: false,
                        err: {
                            message: "not_authorized",
                            field: 'facebook'
                        }
                    });
                });

            /** Search user in database */
            User.findOne({ email: facebookUser.email }, (err, userDB) => {
                if(err)
                    return res.status(500).json({ ok: false, err })

                if(!userDB){
                    /** Create user */
                    const bodyUser = {
                        email: facebookUser.email,
                        password: facebookUser.id,
                        facebook: true,
                        confirm: true
                    }
                    const newUser = createUser(bodyUser)

                    /** Save user into database */
                    newUser.save(async(err, userDB) => {
                        if(err)
                            return res.status(400).json({ ok: false, err })
                
                        const { _id, role, nickname, email } = userDB;
                        const user = { _id, role, nickname }

                        /** Create token and refresh token for future requests */
                        const { token, refreshToken } = createTokenAndRefreshTokenByUser(user)
                
                        let response = { ok: true, user: userDB, token, refreshToken, signUp: true }

                        tokenList[refreshToken] = response
                
                        /** Return user data */
                        res.json(response)
                    })
                } else {
                    if(userDB.facebook) {
                        const { _id, role, nickname, email } = userDB;
                        const user = { _id, role, nickname }

                        /** Create token and refresh token for future requests */
                        const { token, refreshToken } = createTokenAndRefreshTokenByUser(user)
                
                        let response = { ok: true, user: userDB, token, refreshToken, signUp: false }

                        tokenList[refreshToken] = response
                
                        /** Return user data */
                        res.json(response)
                    } else {
                        const registeredUserType = registeredUserBy(userDB)

                        return res.status(400).json({
                            ok: false,
                            err: {
                                message: `registered_user_by_${registeredUserType}`,
                                registered_by: registeredUserType,
                                field: registeredUserType
                            }
                        })
                    }
                }
            })

            break
        case "google":
            let token = body.idToken
            let googleUser = await verifyGoogleToken(token, client)
                .catch(e => {
                    return res.status(403).json({
                        ok: false,
                        err: {
                            message: "not_authorized",
                            field: 'google'
                        }
                    });
                });

            /** Search user in database */
            User.findOne({ email: googleUser.email }, (err, userDB) => {
                if(err)
                    return res.status(500).json({ ok: false, err })

                if(!userDB){
                    /** Create user */
                    const bodyUser = {
                        email: googleUser.email,
                        password: googleUser.sub,
                        google: true,
                        confirm: true
                    }
                    const newUser = createUser(bodyUser)

                    /** Save user into database */
                    newUser.save(async(err, userDB) => {
                        if(err)
                            return res.status(400).json({ ok: false, err })
                
                        const { _id, role, nickname, email } = userDB;
                        const user = { _id, role, nickname }

                        /** Create token and refresh token for future requests */
                        const { token, refreshToken } = createTokenAndRefreshTokenByUser(user)
                
                        let response = { ok: true, user: userDB, token, refreshToken, signUp: true }

                        tokenList[refreshToken] = response
                
                        /** Return user data */
                        res.json(response)
                    })
                } else {
                    if(userDB.google) {
                        const { _id, role, nickname, email } = userDB;
                        const user = { _id, role, nickname }

                        /** Create token and refresh token for future requests */
                        const { token, refreshToken } = createTokenAndRefreshTokenByUser(user)
                
                        let response = { ok: true, user: userDB, token, refreshToken, signUp: false }

                        tokenList[refreshToken] = response
                
                        /** Return user data */
                        res.json(response)
                    } else {
                        const registeredUserType = registeredUserBy(userDB)

                        return res.status(400).json({
                            ok: false,
                            err: {
                                message: `registered_user_by_${registeredUserType}`,
                                registered_by: registeredUserType,
                                field: registeredUserType
                            }
                        })
                    }
                }
            })

            break
        default:
            return res.status(400).json({
                ok: false,
                err: {
                    message: 'social_network_not_found'
                }
            })
    }
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

        /** Create token and refresh token for future requests */
        const { token, refreshToken } = createTokenAndRefreshTokenByUser(user)

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

/**
 * Add to user promotions
 * @param {*} req 
 * @param {*} res 
 */
const addUserPromotions = (req, res) => {
    const id = req.params.user_id
    const body = req.body

    User.findById({ _id: id }, 
    (err, userDB) => {
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

        const index = userDB.promotions.findIndex(promotion => promotion.code === body.promotion.code)

        if(index >= 0){
            return res.status(400).json({
                ok: false,
                err: {
                    message: 'existing_promotion'
                }
            })
        }

        userDB.promotions.push(body.promotion)
        userDB.save()
        
        res.json({ ok: true, user: userDB })
    })
}

module.exports = {
    getUsers,
    signUpUser,
    login,
    signInSocialNetwork,
    refreshToken,
    getUserById,
    updateUser,
    verifyConfirmationCode,
    resendConfirmationCode,
    updateUserPreferences,
    addUserPromotions
}