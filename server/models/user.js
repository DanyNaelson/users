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
let favoriteDrinkSchema = new Schema({
    id: {
        type: String,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'name_required']
    },
    picture: {
        type: String,
        required: false
    },
    category: {
        type: String,
        required: false
    },
    description: {
        type: String,
        required: false
    }
})
let favoriteDishSchema = new Schema({
    id: {
        type: String,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'name_required']
    },
    picture: {
        type: String,
        required: false
    },
    category: {
        type: String,
        required: false
    },
    description: {
        type: String,
        required: false
    }
})
let userSchema = new Schema({
    email: {
        type: String,
        unique: true,
        required: [true, 'email_required']
    },
    zipCode: {
        type: String,
        required: false
    },
    role: {
        type: String,
        required: false,
        default: 'USER',
        enum: validRoles
    },
    username: {
        type: String,
        required: [true, 'username_required']
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
    cellPhone: {
        type: String,
        required: false
        //TO DO: min length 10
    },
    gender: {
        type: String,
        required: false,
        enum: validGender,
        default: 'FEMALE'
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
    confirmationCode: {
        type: String,
        required: false,
        default: null
    },
    photo: {
        type: String,
        required: false,
        default: 'url_photo'
    },
    favoriteDrinks: {
        type: [ favoriteDrinkSchema ]
    },
    favoriteDishes: {
        type: [ favoriteDishSchema ]
    }
},
{
    timestamps: true
})

userSchema.pre('findOneAndUpdate', function(next) {
    this.update({}, { $set: { updatedAt: new Date() } });
    next()
})

userSchema.methods.toJSON = function() {
    let user = this;
    let userObject = user.toObject();
    delete userObject.password;
    delete userObject.confirmationCode;

    return userObject;
}

userSchema.plugin(uniqueValidator, {
    message: '{PATH} must be unique'
})

module.exports = mongoose.model('User', userSchema);