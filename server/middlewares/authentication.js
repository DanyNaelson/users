const jwt = require('jsonwebtoken')
const { isNull } = require('underscore')

//========================================
// Verify token
//========================================
let verifyToken = ( req, res, next ) => {
    const token = req.get('Authorization')

    jwt.verify( token, process.env.PRIVATE_KEY, (err, decoded) => {
        if(err){
            if(err.name === "TokenExpiredError"){
                return res.status(401).json({
                    ok: false,
                    err: {
                        message: 'expired_token'
                    }
                })
            }

            return res.status(401).json({
                ok: false,
                err: {
                    message: 'not_authorized'
                }
            })
        }

        if(req.params.hasOwnProperty('user_id')) {
            if(decoded.user._id !== req.params.user_id){
                return res.status(401).json({
                    ok: false,
                    err: {
                        message: 'not_authorized'
                    }
                })
            }
        }

        req.user = decoded.user
        next()
    })
}

//========================================
// Verify role
//========================================
let verifyRole = ( req, res, next ) => {
    let user = req.user

    if (user.role === 'ADMIN_ROLE'){
        next()
    } else {
        return res.status(401).json({
            ok: false,
            err: {
                message: 'role_not_authorized'
            }
        })
    }
}

module.exports = {
    verifyRole,
    verifyToken
}