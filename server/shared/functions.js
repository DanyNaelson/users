const jwt = require('jsonwebtoken');
const jwksClient = require("jwks-rsa")

const replaceStringArray = (stringArray, string) => {
    let newString = string

    if(string){
        stringArray.map(string => {
            newString = newString.replace(string.regExp, string.wordReplaced)
        })
    }

    return newString
}

const getAppleSigninKey = kid => {
    const client = jwksClient({
        jwksUri: "https://appleid.apple.com/auth/keys"
    })

    return new Promise(resolve => {
        client.getSigningKey(kid, (err, key) => {
            if(err) {
                console.log(err)
                resolve(null)
            }

            const signinKey = key.getPublicKey()
            resolve(signinKey)
        })
    })
}

const verifyToken = (token, publicKey) => {
    const client = jwksClient({
        jwksUri: "https://appleid.apple.com/auth/keys"
    })

    return new Promise(resolve => {
        jwt.verify(token, publicKey, (err, payload) => {
            if(err) {
                console.log(err)
                resolve(null)
            }

            resolve(payload)
        })
    })
}

const createTokenAndRefreshTokenByUser = user => {
    const token = jwt.sign({
        user
    }, process.env.PRIVATE_KEY, { expiresIn: process.env.EXPIRATION_TOKEN })

    const refreshToken = jwt.sign({
        user
    }, process.env.PRIVATE_KEY_REFRESH, { expiresIn: process.env.EXPIRATION_TOKEN_REFRESH })

    return { token, refreshToken }
}

const registeredUserBy = (userDB) => {
    let registeredBy = "email"

    if(userDB.apple)
        registeredBy = "apple"

    if(userDB.facebook)
        registeredBy = "facebook"
    
    if(userDB.google)
        registeredBy = "google"

    return registeredBy
}

module.exports = {
    createTokenAndRefreshTokenByUser,
    replaceStringArray,
    getAppleSigninKey,
    registeredUserBy,
    verifyToken
}