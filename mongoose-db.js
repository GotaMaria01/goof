require('dotenv').config({path: '../s.env'});

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Todo = new Schema({
  content: Buffer,
  updated_at: Date,
});

mongoose.model('Todo', Todo);

var User = new Schema({
  username: String,
  password: String,
});

mongoose.model('User', User);

// CloudFoundry env vars
// var mongoCFUri = cfenv.getAppEnv().getServiceURL('goof-mongo');
// console.log(JSON.stringify(cfenv.getAppEnv()));

// Default Mongo URI is local
// const DOCKER = process.env.DOCKER
// if (DOCKER === '1') {
//   var mongoUri = 'mongodb://goof-mongo/express-todo';
// } else {
  var mongoUri = 'mongodb://127.0.0.1/express-todo';
// }


// // CloudFoundry Mongo URI
// if (mongoCFUri) {
//   mongoUri = mongoCFUri;
// } else if (process.env.MONGOLAB_URI) {
//   // Generic (plus Heroku) env var support
//   mongoUri = process.env.MONGOLAB_URI;
// } else if (process.env.MONGODB_URI) {
//   // Generic (plus Heroku) env var support
//   mongoUri = process.env.MONGODB_URI;
// }

console.log("Using Mongo URI " + mongoUri);

mongoose.connect(mongoUri);

User = mongoose.model('User');
User.find({ username: 'admin@snyk.io' }).exec(function (err, users) {
  console.log(users);
  if (users.length === 0) {
    console.log('no admin');
    new User({ username: process.env.ADMIN_UN, password: process.env.ADMIN_PWD }).save(function (err, user, count) {
      if (err) {
        console.log('error saving admin user');
      }
    });
  }
});