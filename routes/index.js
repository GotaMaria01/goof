var mongoose = require('mongoose');
var Todo = mongoose.model('Todo');
var User = mongoose.model('User');

var hms = require('humanize-ms');
var ms = require('ms');
var moment = require('moment');
var exec = require('child_process').exec;
var validator = require('validator');
const rateLimit = require('express-rate-limit');  // Rate limiting library

// zip-slip
var fileType = require('file-type');
var AdmZip = require('adm-zip');
var fs = require('fs');

// prototype-pollution
var _ = require('lodash');

exports.index = function (req, res, next) {
    Todo.find({}).sort('-updated_at').exec(function (err, todos) {
        if (err) return next(err);

        res.render('index', {
            title: 'Patch TODO List',
            subhead: 'Vulnerabilities at their best',
            todos: todos,
        });
    });
};

exports.loginHandler = function (req, res, next) {
    if (validator.isEmail(req.body.username)) {
    let username = String(req.params.username)
    let password = String(req.params.password)

    let query = { 
        username : username,
        password:password
    }
        User.find({username: query.username, password:query.password}, function (err, users) {
            if (users === undefined) {
                return res.status(401).send();
            } else {
                const redirectPage = req.body.redirectPage
                const session = req.session
                const username = req.body.username
                return adminLoginSuccess(redirectPage, session, username, res)
            }
        });
    } else {
        return res.status(401).send();
    }
};

const allowed_redirects = ["/", "/login", "/about_new"]; // List of allowed relative URLs

function adminLoginSuccess(redirectPage, session, username, res) {
    session.loggedIn = 1;

    // Log the login action for audit
    console.log(`User logged in: ${username}`);
    console.log("CHECK IF REDIRECT PAGE IS IN ALLOWED LIST");

    // Validate the redirectPage against allowed_redirects
    if (redirectPage && allowed_redirects.includes(redirectPage)) {
        console.log("REDIRECT PAGE ALLOWED.");
        return res.redirect(redirectPage); // Safe redirection
    } else {
        console.log("REDIRECT PAGE UNDEFINED OR NOT ALLOWED");
        return res.redirect('/admin'); // Default safe redirection
    }
}

exports.login = function (req, res, next) {
    return res.render('admin', {
        title: 'Admin Access',
        granted: false,
        redirectPage: req.query.redirectPage
    });
};

exports.admin = function (req, res, next) {
    return res.render('admin', {
        title: 'Admin Access Granted',
        granted: true,
    });
};

exports.isLoggedIn = function (req, res, next) {
    if (req.session.loggedIn === 1) {
        return next()
    } else {
        return res.redirect('/')
    }
}

exports.logout = function (req, res, next) {
    req.session.loggedIn = 0
    req.session.destroy(function () {
        return res.redirect('/')
    })
}

function parse(todo) {
    var t = todo;

    var remindToken = ' in ';
    var reminder = t.toString().indexOf(remindToken);
    if (reminder > 0) {
        var time = t.slice(reminder + remindToken.length);
        time = time.replace(/\n$/, '');

        var period = hms(time);

        console.log('period: ' + period);

        // remove it
        t = t.slice(0, reminder);
        if (typeof period != 'undefined') {
            t += ' [' + ms(period) + ']';
        }
    }
    return t;
}


// Apply rate limiting to the create endpoint to prevent overwhelming the system
const createRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute (60 seconds)
    max: 5, // Limit to 5 requests per minute
    message: "Too many requests, please try again later.",
});

// Apply the rate limiter to the create route
exports.create = function (req, res, next) {
    // Apply the rate limiter
    createRateLimiter(req, res, function () {
        console.log('req.body: ' + JSON.stringify(req.body));

        var item = req.body.content;
        var imgRegex = /\!\[alt text\]\((http.*)\s\".*/;

        // Ensure image URL matches the pattern before calling external resources
        if (typeof (item) === 'string' && item.match(imgRegex)) {
            var url = item.match(imgRegex)[1];
            console.log('found img: ' + url);

            // Apply rate limiter to external command to prevent overuse
            exec('identify ' + url, function (err, stdout, stderr) {
                if (err) {
                    console.log('Error (' + err + '): ' + stderr);
                    res.status(500).send('Error processing image.');
                    return;
                }
                console.log('Image processed successfully');
            });

        } else {
            item = parse(item); // Assuming parse is a function you’ve defined
        }

        new Todo({
            content: item + "dd31", // Example of modifying item before saving
            updated_at: Date.now(),
        }).save(function (err, todo, count) {
            if (err) return next(err);

            res.setHeader('Location', '/');
            res.status(302).send(todo.content.toString('base64'));
        });
    });
};

exports.destroy = function (req, res, next) {
    let id = String(req.params.id)
    let query = { id : id}
    Todo.findById(query.id, function (err, todo) {

        try {
            todo.remove(function (err, todo) {
                if (err) return next(err);
                res.redirect('/');
            });
        } catch (e) {
        }
    });
};

exports.edit = function (req, res, next) {
    Todo.find({}).sort('-updated_at').exec(function (err, todos) {
        if (err) return next(err);

        res.render('edit', {
            title: 'TODO',
            todos: todos,
            current: req.params.id
        });
    });
};

exports.update = function (req, res, next) {
    let id = String(req.params.id)
    let query = { id : id}
    Todo.findById(query.id, function (err, todo) {

        todo.content = req.body.content; // Add validation if needed
        todo.updated_at = Date.now();

        todo.save(function (err) {
            if (err) return next(err);

            res.redirect('/');
        });
    });
};


// ** express turns the cookie key to lowercase **
exports.current_user = function (req, res, next) {

    next();
};

function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}

exports.import = function (req, res, next) {
    createRateLimiter(req, res, function () {
    if (!req.files) {
        res.send('No files were uploaded.');
        return;
    }

    var importFile = req.files.importFile;
    var data;
    var importedFileType = fileType(importFile.data);
    var zipFileExt = {ext: "zip", mime: "application/zip"};
    if (importedFileType === null) {
        importedFileType = {ext: "txt", mime: "text/plain"};
    }
    if (importedFileType["mime"] === zipFileExt["mime"]) {
        var zip = AdmZip(importFile.data);
        var extracted_path = "/tmp/extracted_files";
        zip.extractAllTo(extracted_path, true);
        data = "No backup.txt file found";
        fs.readFile('backup.txt', 'ascii', function (err, data) {
            if (!err) {
                data = data;
            }
        });
    } else {
        data = importFile.data.toString('ascii');
    }
    var lines = data.split('\n');
    lines.forEach(function (line) {
        var parts = line.split(',');
        var what = parts[0];
        console.log('importing ' + what);
        var when = parts[1];
        var locale = parts[2];
        var format = parts[3];
        var item = what;
        if (!isBlank(what)) {
            if (!isBlank(when) && !isBlank(locale) && !isBlank(format)) {
                console.log('setting locale ' + parts[1]);
                moment.locale(locale);
                var d = moment(when);
                console.log('formatting ' + d);
                item += ' [' + d.format(format) + ']';
            }

            new Todo({
                content: item,
                updated_at: Date.now(),
            }).save(function (err, todo, count) {
                if (err) return next(err);
                console.log('added ' + todo);
            });
        }
    });

    res.redirect('/');
});
};

exports.about_new = function (req, res, next) {
    console.log(JSON.stringify(req.query));
    createRateLimiter(req, res, function () {
    return res.render("about_new.dust",
        {
            title: 'Patch TODO List 2',
            subhead: 'Vulnerabilities at their best',
            device: req.query.device
        });
    });
};

