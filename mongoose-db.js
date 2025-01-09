require('dotenv').config({path: '../.env'});

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Todo = new Schema({
    content: Buffer,
    updated_at: Date,
});

mongoose.model('Todo', Todo);

var User = new Schema({
    username: String,
    password: String
});

mongoose.model('User', User);

var mongoUri = 'mongodb://127.0.0.1/express-todo';

console.log("Using Mongo URI " + mongoUri);

mongoose.connect(mongoUri);

User = mongoose.model('User');
User.find({username: 'admin@snyk.io'}).exec(function (err, users) {
    console.log(users);
    if (users.length === 0) {
        console.log('no admin');
        new User({username: process.env.ADMIN_UN, password: process.env.ADMIN_PWD}).save(function (err, user, count) {
            if (err) {
                console.log('error saving admin user');
            }
        });
    }

    new User({username: process.env.ADMIN_UN, password: process.env.ADMIN_PWD}).save(function (err, user, count) {
        if (err) {
            console.log('error saving admin user');
        }
    });
});