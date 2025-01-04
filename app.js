/**
 * Module dependencies.
 */

// mongoose setup
require('./mongoose-db');
// require('./typeorm-db');

var st = require('st');
const rateLimit = require('express-rate-limit')
// const limit = require('express-limit').limit;
// var crypto = require('crypto');
var helmet = require('helmet');
var express = require('express');
var http = require('http');
var https = require('https');
var fs = require('fs')
var path = require('path');
var ejsEngine = require('ejs-locals');
var bodyParser = require('body-parser');
var session = require('express-session')
var methodOverride = require('method-override');
var logger = require('morgan');
var errorHandler = require('errorhandler');
// var optional = require('optional');
var marked = require('marked');
var fileUpload = require('express-fileupload');
// var dust = require('dustjs-linkedin');
var dustHelpers = require('dustjs-helpers');
var cons = require('consolidate');
const hbs = require('hbs')

var app = express();
var routes = require('./routes');
var routesUsers = require('./routes/users.js')

var rateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    limit: 100, // each IP can make up to 50 requests per `windowsMs` (5 minutes)
    standardHeaders: true, // add the `RateLimit-*` headers to the response
    legacyHeaders: false, // remove the `X-RateLimit-*` headers from the response
})
// all environments

// var limiter = {
//     max: 10, // 5 requests
//     period: 5 * 60 * 1000, // per minute (60 seconds)
// }

app.use(helmet())
app.set('port', process.env.PORT || 3001);
app.engine('ejs', ejsEngine);
app.engine('dust', cons.dust);
app.engine('hbs', hbs.__express);
cons.dust.helpers = dustHelpers;
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(methodOverride());
app.use(session({
    secret: process.env.XPRESS_SESSION_SECRET,
    name: 'connect.sid',
    cookie: {
        path: '/',
        secure: true
    }
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(fileUpload());
app.use(rateLimiter);

// Routes
app.use(routes.current_user);
app.get('/', routes.index);
app.get('/login', routes.login);
app.post('/login', routes.loginHandler);
app.get('/admin', routes.isLoggedIn, routes.admin);
app.get('/account_details', routes.isLoggedIn, routes.get_account_details);
app.post('/account_details', routes.isLoggedIn, routes.save_account_details);
app.get('/logout', routes.logout);
app.post('/create', routes.create);
app.get('/destroy/:id', routes.destroy);
app.get('/edit/:id', routes.edit);
app.post('/update/:id', routes.update);
app.post('/import', routes.import);
app.get('/about_new', routes.about_new);
app.get('/chat', routes.chat.get);
app.put('/chat', routes.chat.add);
app.delete('/chat', routes.chat.delete);
app.use('/users', routesUsers)

// Static
app.use(st({path: './public', url: '/public'}));

// Add the option to output (sanitized!) markdown
marked.setOptions({sanitize: true});
app.locals.marked = marked;

// development only
if (app.get('env') === 'development') {
    app.use(errorHandler());
}
//
// var token = process.env.TOKEN;
// console.log('token: ' + token);

var key = fs.readFileSync('../private-key.pem');
var certificate = fs.readFileSync('../certificate.pem');
https.createServer({key: key, cert: certificate}, app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
