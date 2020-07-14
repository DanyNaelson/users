const registeredUserBy = (userDb, registerType) => {
    let isNewUser = { ok: true }

    if(userDb){
        isNewUser = {
            ok: false,
            err: {
                message: "registered_user",
                registered_by: registerType,
                field: registerType
            }
        }
    }

    return isNewUser
}

module.exports = {
    registeredUserBy
}