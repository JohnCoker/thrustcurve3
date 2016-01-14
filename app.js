/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var process = require('process'),
    mongoose = require('mongoose'),
    express = require('express'),
    exphbs = require('exphbs'),
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    favicon = require('serve-favicon'),
    config = require('./config/server.js'),
    schema = require('./database/schema');

// fail if initial connection is impossible
mongoose.connect(config.mongoUrl, function(err) {
  if (err) {
    console.error('unable to connect to MongoDB');
    console.error(err);
    process.exit(1);
  }
});

// site routes grouped by area
var index = require('./routes/index'),
    info = require('./routes/info'),
    motors = require('./routes/motors'),
    manufacturers = require('./routes/manufacturers'),
    contributors = require('./routes/contributors'),
    mystuff = require('./routes/mystuff');

var app = express();

// view engine setup using Handlebars
require('handlebars-helper').help(exphbs.handlebars);
require('./helpers').help(exphbs.handlebars);
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', exphbs);
app.set('view engine', 'hbs');

// other Express configuration
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(morgan('combined'));
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));

// wire in database access to routes
var db = Object.create(null, {
  mongoose: { value: mongoose },
  schema: { value: schema },
  Manufacturer: { get: function() {
    return this._manufacturer || (this._manufacturer = schema.ManufacturerModel(mongoose));
  } },
  CertOrg: { get: function() {
    return this._certOrg || (this._certOrg = schema.CertOrgModel(mongoose));
  } },
  Motor: { get: function() {
    return this._motor || (this._motor = schema.MotorModel(mongoose));
  } },
  Contributor: { get: function() {
    return this._contributor || (this._contributor = schema.ContributorModel(mongoose));
  } },
  MotorNote: { get: function() {
    return this._motorNote || (this._motorNote = schema.MotorNoteModel(mongoose));
  } },
  SimFile: { get: function() {
    return this._simFile || (this._simFile = schema.SimFileModel(mongoose));
  } },
  SimFileNote: { get: function() {
    return this._simFileNote || (this._simFileNote = schema.SimFileNoteModel(mongoose));
  } },
  Rocket: { get: function() {
    return this._rocket || (this._rocket = schema.RocketModel(mongoose));
  } }
});
app.use(function(req, res, next) {
  req.db = db;
  req.success = function(cb) {
    return function(err, result) {
      if (err) {
        res.status(err.status || 500);
        res.render('error', {
          title: 'Database Error',
          layout: 'home',
          url: req.url,
          status: err.status,
          message: err.message,
          error: err
        });
      } else {
        cb(result);
      }
    }
  };
  next();
});

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
