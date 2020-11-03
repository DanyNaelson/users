const requiredField = (body, nameField) => {
    let validation = { ok: true }

    if(!body.hasOwnProperty(nameField) || body[`${nameField}`] === ""){
        validation = {
            ok: false,
            err: {
                message: "required",
                field: nameField,
                required: true
            }
        }
    }

    return validation
}

const emailValidation = (email) => {
    const emailRegexp = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
    let validation = { ok: true }

    if(!emailRegexp.test(email)){
        validation = {
            ok: false,
            err: {
                message: "invalid_email",
                field: 'email'
            }
        }
    }

    return validation
}

const passValidation = (password) => {
    const passRegexp = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*_])[a-zA-Z0-9!@#$%^&*_]{8,16}$/;
    let validation = { ok: true }

    if(!passRegexp.test(password)){
        validation = {
            ok: false,
            err: {
                message: "invalid_password",
                field: 'password',
                rules: [
                    'at_least_one_capital_letter',
                    'at_least_one_number',
                    'at_least_one_symbol',
                ],
                symbols: '!@#$%^&*_',
                length: '8_to_16'
            }
        }
    }

    return validation
}

const birthdayValidation = (birthday) => {
    let validation = { ok: true }
    let minBirthday = new Date()
    birthday = new Date(birthday)
    minBirthday.setFullYear(minBirthday.getFullYear() - 15)

    if(birthday > minBirthday){
        validation = {
            ok: false,
            err: {
                message: "must_be_over_15_years",
                field: 'birthday'
            }
        }
    }

    return validation
}

module.exports = {
    birthdayValidation,
    emailValidation,
    passValidation,
    requiredField
}