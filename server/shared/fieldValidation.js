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
    const passRegexp = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,16}$/;
    let validation = { ok: true }

    if(!passRegexp.test(password)){
        validation = {
            ok: false,
            err: {
                message: "invalid_password",
                field: 'password'
            }
        }
    }

    return validation
}

module.exports = {
    emailValidation,
    passValidation,
    requiredField
}