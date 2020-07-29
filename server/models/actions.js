const bcrypt = require('bcrypt')
const User = require('./../models/user');

const createUser = (body) => {
    let birthday = new Date(body.birthday);
    let nickname = body.email.replace(/[^\w\s]/gi, '-').toLowerCase();
    const newUser = new User({
        email: body.email,
        gender: body.gender,
        zipCode: body.zipCode,
        role: 'USER',
        nickname,
        password: bcrypt.hashSync( body.password, 10 ),
        birthday,
        withEmail: true
    })

    return newUser
}

module.exports = {
    createUser
}