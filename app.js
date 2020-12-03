/*
 * Copyright 2015-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const process = require('process'),
      mongoose = require('mongoose'),
      cls = require('continuation-local-storage'),
      express = require('express'),
      exphbs = require('exphbs'),
      path = require('path'),
      favicon = require('serve-favicon'),
      logger = require('morgan'),
      cookieParser = require('cookie-parser'),
      bodyParser = require('body-parser'),
      morgan = require('morgan'),
      session = require('express-session'),
      SessionMongoStore = require('connect-mongo')(session),
      passport = require('passport'),
      passportLocal = require('passport-local').Strategy,
      compression = require('compression'),
      config = require('./config/server.js'),
      schema = require('./database/schema'),
      crawlers = require('./lib/crawlers'),
      helpers = require('./lib/helpers');

// fail if initial connection is impossible
mongoose.Promise = global.Promise;
mongoose.connect(config.mongoUrl, function(err) {
  if (err) {
    console.error('unable to connect to MongoDB');
    console.error(err);
    process.exit(1);
  }

  // clean up old motor guide results (older than 60 days)
  if (db && db.GuideResult) {
    let before = new Date();
    before.setDate(before.getDate() - 60);
    before.setHours(0);
    before.setMinutes(0);
    before.setSeconds(0);
    db.GuideResult.deleteMany({ updatedAt: { $lt: before }}, function(err, _result) {
      if (err)
        console.error('unable to delete old guide results', err);
    });
  }
});

// site routes grouped by area
const index = require('./routes/index'),
      info = require('./routes/info'),
      motors = require('./routes/motors'),
      manufacturers = require('./routes/manufacturers'),
      simfiles = require('./routes/simfiles'),
      outbox = require('./routes/outbox'),
      contributors = require('./routes/contributors'),
      guide = require('./routes/guide'),
      browser = require('./routes/browser'),
      mystuff = require('./routes/mystuff'),
      notes = require('./routes/notes'),
      admin = require('./routes/admin'),
      api_v1 = require('./routes/api_v1');

const domain = 'www.thrustcurve.org';
const app = express();
if (process.env.NODE_ENV === 'production') {
  // force SSL and canonical domain in production (except for API)
  app.use((req, res, next) => {
    let host = req.header('host');
    if (!/^\/(servlets|api)\//.test(req.url) &&
        (host != null && host != domain || req.header('x-forwarded-proto') !== 'https'))
      res.redirect(`https://${domain}${req.url}`);
    else
      next();
  });
}

// view engine setup using Handlebars
require('handlebars-helper').help(exphbs.handlebars);
helpers.help(exphbs.handlebars);
app.use(compression());
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', exphbs);
app.set('view engine', 'hbs');

// other Express configuration
app.use(logger('dev'));
app.use(morgan('combined'));
app.use(cookieParser());
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'ThrustCurve.org',
  resave: false,
  saveUninitialized: false,
  store: new SessionMongoStore({
    mongooseConnection: mongoose.connection
  })
}));
app.use(passport.initialize());
app.use(passport.session());

/*
 * Many of the routes need access to the database and other stuff,
 * so we add some properties to the req instance.
 *
 * isBot: test if this session is a known robot user agent.
 *
 * db: this object includes the Mongoose handle and various
 * instantiated models plus a few convenience functions.
 *
 * success: this a function used as the callback to all
 * Mongoose functions.  It handles database errors by
 * rendering a standard error page and only makes the
 * callback on success.
 *
 * The success function also provides a chance to catch exceptions
 * during production of the resulting page.  Otherwise, the
 * Node.js instance prints an error and exits, which isn't good
 * error handling for a server.
 *
 * helpers: the helpers module with useful formatting functions.
 */
const db = Object.create(null, {
  mongoose: { value: mongoose },
  schema: { value: schema },
  Manufacturer: { value: schema.ManufacturerModel(mongoose) },
  CertOrg: { value: schema.CertOrgModel(mongoose) },
  Motor: { value: schema.MotorModel(mongoose) },
  Contributor: { value: schema.ContributorModel(mongoose) },
  MotorNote: { value: schema.MotorNoteModel(mongoose) },
  SimFile: { value: schema.SimFileModel(mongoose) },
  SimFileNote: { value: schema.SimFileNoteModel(mongoose) },
  Rocket: { value: schema.RocketModel(mongoose) },
  MotorView: { value: schema.MotorViewModel(mongoose) },
  MotorRanking: { value: schema.MotorRankingModel(mongoose) },
  FavoriteMotor: { value: schema.FavoriteMotorModel(mongoose) },
  GuideResult: { value: schema.GuideResultModel(mongoose) },
  PropellantInfo: { value: schema.PropellantInfoModel(mongoose) },
  IntIdMap: { value: schema.IntIdMapModel(mongoose) },
  isId: { value: function(v) {
    if (v == null)
      return false;
    return schema.IdRegex.test(v);
  } }
});
const clsNamespace = cls.createNamespace('session');
app.use(function(req, res, next) {
  // determine if this is a robot/crawler/spider
  req.isBot = function() {
    if (req.user)
      return false;

    if (!req.session.hasOwnProperty("bot")) {
      req.session.bot = crawlers.match(req.header('User-Agent'));
      req.session.touch();
    }
    return req.session.bot;
  };

  // check if a property is specified in the body/query
  req.hasBodyProperty = function(p) {
    return this.body != null && Object.prototype.hasOwnProperty.call(this.body, p);
  };
  req.hasQueryProperty = function(p) {
    return this.query != null && Object.prototype.hasOwnProperty.call(this.query, p);
  };
  req.hasParamsProperty = function(p) {
    return this.params != null && Object.prototype.hasOwnProperty.call(this.params, p);
  };

  // make request and prefs available throughout processing
  clsNamespace.bindEmitter(req);
  clsNamespace.bindEmitter(res);
  clsNamespace.run(function() {
    clsNamespace.set('req', req);
    clsNamespace.set('prefs', req.user ? req.user.preferences : {});
    clsNamespace.set('perms', req.user ? req.user.permissions : {});

    // easy access to database state
    req.db = db;
    req.success = function(cb) {
      return clsNamespace.bind(function(err, result) {
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
	  try {
	    cb(result);
	  } catch (e) {
	    res.status(500);
	    res.render('error', {
	      title: 'Server Error',
	      layout: 'home',
	      url: req.url,
	      status: 500,
	      message: e.message,
	      error: e
	    });
	  }
	}
      });
    };
  
    // add helpers directly
    req.helpers = helpers;
  
    // render notfound (404) page
    res.notfound = function() {
      res.status(404);
      res.render('notfound', {
	title: 'Page Not Found',
	layout: 'home',
	url: req.url,
	path: req.path
      });
    };

    next();
  });
});

/*
 * Most pages work without a login, although their behavior might differ
 * due to user preferences.  Some pages do require a user be logged in.
 *
 * Passport is used to authenticate users (contributors), using the local
 * strategy with encrypted passwords stored in the database.
 */
passport.use(new passportLocal(function(email, password, done) {
  db.Contributor.findOne({ email: email }, function(err, contributor) {
    if (err)
      return done(err);
    if (!contributor)
      return done(null, false, { message: 'Unregistered email address.' });
    contributor.comparePassword(password, function(err, isMatch) {
      if (err)
	return done(err);
      if (!isMatch)
	return done(null, false, { message: 'Login incorrect.' });
      done(null, contributor);
    });
  });
}));
passport.serializeUser(function(contributor, done) {
  done(null, contributor.id);
});
passport.deserializeUser(function(id, done) {
  db.Contributor.findById(id, function(err, contributor) {
    done(err, contributor);
  });
});

// API route is special
app.use('/', api_v1);

// UI routes
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/', index);
app.use('/', info);
app.use('/', motors);
app.use('/', simfiles);
app.use('/', outbox);
app.use('/', manufacturers);
app.use('/', contributors);
app.use('/', guide);
app.use('/', browser);
app.use('/', mystuff);
app.use('/', notes);
app.use('/', admin);

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
