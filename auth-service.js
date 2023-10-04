/********************************************************************************* 
*
*  Creator Name: Vladyslav Savchyn
* 
*  Cyclic Web App URL: not available rn ;(
* 
*  GitHub Repository URL: https://github.com/vsavchyn-dev/Blog-A-Gramm
* 
********************************************************************************/
const { rejects } = require('assert');
const { resolve } = require('dns');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const env = require("dotenv");

// Configure environment variables
env.config();

let User;

////////////////////////
//  DB Configuration  //
////////////////////////

var userSchema = new mongoose.Schema({
    "userName": {
        type: String,
        unique: true
    },
    "password": String,
    "email": String,
    "loginHistory": [{
        "dateTime": Date,
        "userAgent": String
    }]
});


////////////////////////
//   Initialization   //
////////////////////////

function initialize() {
    return new Promise((resolve, reject) => {
        const connectionStr = String(process.env.MONGO_CONN_STR);
        let mongodb = mongoose.createConnection(connectionStr, { useNewUrlParser: true, useUnifiedTopology: true });

        mongodb.on('error', (err) => {
            reject(err);
        });

        mongodb.once('open', () => {
            User = mongodb.model('users', userSchema, 'users');
            resolve();
        });
    });
};


////////////////////////
//   LogIn/Register   //
////////////////////////

function registerUser(userData) {
    return new Promise((resolve, reject) => {
        if (userData.password !== userData.password2) {
            reject("Passwords don't match")
        }
        bcrypt.hash(userData.password, 10)
            .then((hash) => {
                userData.password = hash;
                userData.password2 = undefined;
                console.log(JSON.stringify(userData));
                var newUser = new User(userData);

                newUser.save()
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        console.log(err);
                        if (err.code == 11000) {
                            reject("User Name was already taken!");
                        }
                        else {
                            reject("Error during saving new user: ", err);
                        }
                    });
            })
            .catch((err) => {
                console.log(err)
                reject("PASSWORD ENCRYTPION ERROR: ", err);
            });
    });
};

function checkUser(userData) {
    return new Promise((resolve, reject) => {
        User.find({ "userName": userData.userName })
            .exec()
            .then((users) => {
                if (users.length === 0) {
                    reject("Unable to find user: ", userData.userName);
                }

                bcrypt.compare(userData.password, users[0].password)
                    .then((result) => {
                        if (result === true) {
                            users[0].loginHistory.push({ "dateTime": new Date(), "userAgent": userData.userAgent });

                            User.updateOne(
                                { "userName": { $eq: users[0].userName } },
                                { $set: { "loginHistory": users[0].loginHistory } })
                                .exec()
                                .then(() => {
                                    resolve(users[0]);
                                })
                                .catch((err) => {
                                    reject("There was an error verifying the user: ", err);
                                });
                        }
                        else {
                            reject("Incorrect Password for user: ", String(userData.userName));
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                        reject("CREDENTIALS ERR: ", err);
                    });
            })
            .catch((err) => {
                console.log(err);
                reject("Unable to find user: ", userData.userName);
            });
    });
};

module.exports = {
    initialize,
    registerUser,
    checkUser
}