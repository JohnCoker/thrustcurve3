var process = require('process'),
    config = require('./config/server.js'),
    mongoose = require('mongoose'),
    express = require('express'),
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    favicon = require('serve-favicon');

// fail if initial connection is impossible
/*
mongoose.connect(config.mongoUrl, function(err) {
  if (err) {
    console.error('unable to connect to MongoDB');
    console.error(err);
    process.exit(1);
  }
});
*/

// site routes grouped by area
var index = require('./routes/index'),
    info = require('./routes/info'),
    motors = require('./routes/motors'),
    manufacturers = require('./routes/manufacturers'),
    contributors = require('./routes/contributors'),
    mystuff = require('./routes/mystuff');

var app = express();

// view engine setup using Handlebars
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', require('exphbs'));
app.set('view engine', 'hbs');

// other Express configuration
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(morgan('combined'));
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));

// the defined routes
app.use('/', index);
app.use('/', info);
app.use('/', motors);
app.use('/', manufacturers);
app.use('/', contributors);
app.use('/', mystuff);

// handle other routes as 404
app.use(function(req, res, next) {
  res.status(404);
  res.render('notfound', {
    title: 'Page Not Found',
    layout: 'home',
    url: req.url,
    path: req.path
  });
});

// handle internal errors
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    title: 'Server Error',
    layout: 'home',
    url: req.url,
    status: err.status,
    message: err.message,
    error: err
  });
});


module.exports = app;
