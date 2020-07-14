const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

let validRoles = {
    values: ['ADMIN_ROLE', 'EMPLOYEE', 'USER'],
    message: 'invalid_role'
}
let validGender = {
    values: ['MALE', 'FEMALE'],
    message: 'invalid_gender'
}
let Schema = mongoose.Schema;
let userSchema = new Schema({
    email: {
        type: String,
        unique: true,
        required: [true, 'email_required']
    },
    zipCode: {
        type: String,
        required: [true, 'zipCode_required']
    },
    role: {
        type: String,
        required: [true, 'role_required'],
        default: 'USER',
        enum: validRoles
    },
    nickname: {
        type: String,
        required: [true, 'nickname_required']
    },
    password: {
        type: String,
        required: [true, 'password_required']
    },
    confirm: {
        type: Boolean,
        required: false,
        default: false
    },
    birthday: {
        type: Date,
        required: false
    },
    cell_phone: {
        type: String,
        required: false
        //TO DO: min length 10
    },
    gender: {
        type: String,
        required: [true, 'gender_required'],
        enum: validGender
    },
    google: {
        type: Boolean,
        required: false,
        default: false
    },
    facebook: {
        type: Boolean,
        required: false,
        default: false
    },
    withEmail: {
        type: Boolean,
        required: false,
        default: false
    },
    photo: {
        type: String,
        required: false,
        default: 'url_photo'
    }
})

userSchema.methods.toJSON = function() {
    let user = this;
    let userObject = user.toObject();
    delete userObject.password;

    return userObject;
}

userSchema.plugin(uniqueValidator, {
    message: '{PATH} must be unique'
})

module.exports = mongoose.model('User', userSchema);