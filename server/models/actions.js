const bcrypt = require('bcrypt')
const User = require('./../models/user');

const createUser = (body) => {
    let birthday = new Date();
    birthday.setFullYear(birthday.getFullYear() - 15)
    let nickname = body.email.replace(/[^\w\s]/gi, '-').toLowerCase();
    const newUser = new User({
        email: body.email,
        gender: body.gender,
        zipCode: "",
        role: 'USER',
        cellPhone: "",
        username: nickname,
        nickname,
        password: bcrypt.hashSync( body.password, 10 ),
        birthday,
        withEmail: !body.apple && !body.facebook && !body.google ? true : false,
        apple: body.apple ? body.apple : false,
        facebook: body.facebook ? body.facebook : false,
        google: body.google ? body.google : false,
        confirm: body.confirm ? true : false
    })

    return newUser
}

module.exports = {
    createUser
}