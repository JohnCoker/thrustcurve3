/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      passport = require('passport'),
      crypto = require('crypto'),
      sendgrid = require('@sendgrid/mail'),
      https = require('https'),
      config = require('../config/server.js'),
      schema = require('../database/schema'),
      units = require('../lib/units'),
      metadata = require('../lib/metadata'),
      locals = require('./locals.js'),
      authenticated = require('./authenticated.js');

const loginLink = '/mystuff/login.html',
      registerLink = '/mystuff/register.html',
      forgotLink = '/mystuff/forgotpasswd.html',
      verifyLink = '/mystuff/verify.html',
      resetLink = '/mystuff/resetpasswd.html',
      favoritesLink = '/mystuff/favorites.html',
      rocketsLink = '/mystuff/rockets.html',
      searchLink = '/mystuff/publicrockets.html',
      preferencesLink = '/mystuff/preferences.html',
      profileLink = '/mystuff/profile.html';

const defaults = {
  layout: 'mystuff',
  loginLink: loginLink,
  registerLink: registerLink,
  forgotLink: forgotLink,
};

function getRedirect(req) {
  var referer, redirect;

  // get page to redirect to after login
  if (req.session.loginRedirect) {
    // use the defined redirect page
    redirect = req.session.loginRedirect;
    delete req.session.loginRedirect;
  } else if ((referer = req.header('Referer')) &&
             (/^https?:\/\/(www\.)?thrustcurve\.org\//.test(referer) ||
              /^http:\/\/localhost:\d+\//.test(referer)) &&
             !/(login|register)\.html/.test(referer)) {
    // use the referrer, since it's on the site
    redirect = referer;
  }

  return redirect;
}

/*
 * /mystuff/login.html
 * Passport login flow, probably redirected from another page requiring a user.
 * Renders with mystuff/login.hbs template.
 */
router.get(loginLink, function(req, res, next) {
  // render the login page
  res.render('mystuff/login', locals(req, defaults, {
    title: 'Log In',
    layout: 'info',
    submitLink: loginLink,
    redirect: getRedirect(req),
  }));
});
router.get('login.jsp', function(req, res, next) {
  res.redirect(301, loginLink);
});

router.post(loginLink, passport.authenticate('local', {
  failureRedirect: loginLink
}), function(req, res, next) {
  var redirect = req.body.redirect || req.query.redirect || profileLink;
  res.redirect(redirect);
});

/*
 * /mystuff/register.html
 * Renders with mystuff/register.hbs template.
 */
router.get(registerLink, function(req, res, next) {
  res.render('mystuff/register', locals(req, defaults, {
    title: 'Register',
    layout: 'info',
    info: { showEmail: true },
    submitLink: registerLink,
    redirect: getRedirect(req),
  }));
});
router.get(['/register.jsp'], function(req, res, next) {
  res.redirect(301, registerLink);
});

router.post(registerLink, function(req, res, next) {
  // collect parameters
  let info = {}, errors = [], captcha,
      v;

  v = req.body.name.trim();
  if (v == null || v === '') {
    errors.push('Please enter your name for public display.');
  } else {
    info.name = v;
  }

  v = req.body.email.trim();
  if (v == null || v === '' || !schema.EmailRegex.test(v)) {
    errors.push('Please enter your email address as your login name.');
  } else {
    info.email = v;
  }

  v = req.body.password;
  if (v == null || v === '') {
    errors.push('Please enter a password to protect your account.');
  } else {
    info.password = v;

    v = req.body.password2;
    if (v != info.password)
      errors.push('Please confirm your password by entering it twice.');
  }

  v = req.body.showEmail;
  if (v)
    info.showEmail = true;
  else
    info.showEmail = false;

  function sendErrors() {
    res.render('mystuff/register', locals(req, defaults, {
      title: 'Register',
      layout: 'info',
      info: info,
      errors: errors,
      submitLink: registerLink,
    }));
  }
  if (errors.length > 0) {
    sendErrors();
    return;
  }

  // check captcha
  let data = ('secret=' + process.env.RECAPTCHA_SECRET +
              '&response=' + encodeURIComponent(req.body['g-recaptcha-response']));
  let post = https.request({
    hostname: 'www.google.com',
    port: 443,
    path: '/recaptcha/api/siteverify',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data.length,
      'Accept': 'application/json',
    }
  }, rsp => {
    rsp.on('data', d => {
      let r;
      try {
        r = JSON.parse(d.toString());
      } catch (e) {
      }
      if (r == null || r.success !== true) {
        errors.push('Please solve the captcha.');
        sendErrors();
      } else {
        // make sure the email isn't already in use
        req.db.Contributor.findOne({ email: info.email }, req.success(function(existing) {
          if (existing) {
            res.render('mystuff/forgotpasswd', {
              title: 'Forgot Password',
              layout: 'info',
              email: info.email,
              errors: ['Email address already registered.'],
              submitLink: forgotLink,
            });
            return;
          }

          // create the user and log them in
          info.lastLogin = new Date();
          var model = new req.db.Contributor(info);
          model.save(req.success(function(updated) {
            req.login(updated, function(err) {
              if (err)
                return next(err);

              var redirect = req.body.redirect || req.query.redirect || profileLink;
              res.redirect(redirect);
            });
          }));
        }));
      }
    });
  });
  post.on('error', next);
  post.write(data);
  post.end();
});


/*
 * /mystuff/forgotpasswd.html
 * Renders with mystuff/forgotpasswd.hbs template.
 */
router.get([forgotLink, '/forgotpasswd.jsp'], function(req, res, next) {
  res.render('mystuff/forgotpasswd', locals(req, defaults, {
    title: 'Forgot Password',
    submitLink: forgotLink,
  }));
});

router.post(forgotLink, function(req, res, next) {
  const email = req.body.username.trim();
  req.db.Contributor.findOne({ email: email }).exec(req.success(function(user) {
    if (user == null) {
      res.render('mystuff/forgotpasswd', locals(req, defaults, {
        title: 'Forgot Password',
        submitLink: forgotLink,
        email: email,
        errors: [ "No user with that email registered." ]
      }));
      return;
    }

    crypto.randomBytes(20, function(err, buf) {
      const token = buf.toString('hex');

      user.resetToken = token;
      user.resetExpires = Date.now() + 30 * 60 * 1000; // 30m
      user.save(req.success(function(updated) {
        const origin = 'https://' + process.env.DOMAIN;
        const link = origin + resetLink + "?t=" + token;

        sendgrid.setApiKey(config.sendGridApiKey);
        sendgrid.send({
          to: email,
          from: 'noreply@thrustcurve.org',
          subject: 'ThrustCurve.org password reset',
          text: `
You (or someone pretending to be you) requested that your ThrustCurve.org password be reset.
Please click this link or paste it into your browser address bar to choose a new password:

${link}

If you did not request this, please ignore this email and your password will remain unchanged.
`,
          html: `
<p>You (or someone pretending to be you) requested that your ThrustCurve.org password be reset.
Please click this link or paste it into your browser address bar to choose a new password:</p>
<p style="font-size: large;"><a href="${link}">${link}</a></p>
<p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
<p><img width="200" height="40" src="${origin}/images/footer-logo.png" alt="ThrustCurve.org"></p>
`,
        }).then(() => {
          res.render('mystuff/forgotpasswd', locals(req, defaults, {
            title: 'Forgot Password',
            submitLink: forgotLink,
            email: email,
            isSent: true,
          }));
        }).catch(e => {
          res.status(e.status || 500);
          res.render('error', {
            title: 'Email Error',
            layout: 'mystuff',
            url: req.url,
            error: e,
          });
        });
      }));
    });
  }));
});

/*
 * /mystuff/resetpasswd.html
 * Renders with mystuff/resetpasswd.hbs template.
 */
function getTokenUser(req, res, next) {
  var token = req.body.token || req.query.token || req.query.t;
  if (token)
    token = token.trim();

  if (token == null || token === '') {
    res.render('mystuff/forgotpasswd', locals(req, defaults, {
      title: 'Forgot Password',
      submitLink: forgotLink,
      errors: [ "Password reset link invalid." ]
    }));
  } else {
    req.db.Contributor.findOne({
      resetToken: token,
      resetExpires: { $gt: Date.now() }
    }).exec(req.success(function(user) {
      if (user == null) {
        res.render('mystuff/forgotpasswd', locals(req, defaults, {
          title: 'Forgot Password',
          submitLink: forgotLink,
          errors: [ "Password reset link expired." ]
        }));
      } else {
        next(token, user);
      }
    }));
  }
}

router.get(resetLink, function(req, res, next) {
  getTokenUser(req, res, function(token, user) {
    res.render('mystuff/resetpasswd', locals(req, defaults, {
      title: 'Reset Password',
      submitLink: resetLink,
      token: token,
    }));
  });
});

router.post(resetLink, function(req, res, next) {
  getTokenUser(req, res, function(token, user) {
    var errors = [],
        password, confirm;

    password = req.body.password;
    if (password == null || password === '') {
      errors.push('Please enter a password to protect your account.');
    } else {
      confirm = req.body.password2;
      if (confirm != password)
        errors.push('Please confirm your password by entering it twice.');
    }

    if (errors.length > 0) {
      res.render('mystuff/resetpasswd', locals(req, defaults, {
        title: 'Reset Password',
        submitLink: resetLink,
        token: token,
        errors: errors
      }));
    } else {
      // update the user and log them in
      user.resetToken = undefined;
      user.resetExpires = undefined;
      user.lastLogin = new Date();
      user.password = password;
      user.save(req.success(function(updated) {
        req.login(updated, function(err) {
          if (err)
            return next(err);

          res.redirect(profileLink);
        });
      }));
    }
  });
});


/*
 * /mystuff/verify.html
 * Renders with mystuff/verify.hbs template.
 */
router.get(verifyLink, authenticated, function(req, res, next) {
  let token = req.query.token || req.query.t;
  if (token)
    token = token.trim();

  let errors = [];
  if (token != null && token !== '') {
    if (token === req.user.verifyToken && req.user.verifyExpires > Date.now()) {
      req.user.verified = true;
      req.user.verifyToken = null;
      req.user.verifyExpires = null;
      req.user.save(req.success(function(updated) {
        res.redirect(303, profileLink);
      }));
      return;
    }
    errors.push['Email verification link expired.'];
  }

  // generate a token and email it
  crypto.randomBytes(20, function(err, buf) {
    const token = buf.toString('hex');

    req.user.verifyToken = token;
    req.user.verifyExpires = Date.now() + 30 * 60 * 1000; // 30m
    req.user.save(req.success(function(updated) {
      const link = 'https://' + req.headers.host + verifyLink + "?t=" + token;

      sendgrid.setApiKey(config.sendGridApiKey);
      sendgrid.send({
        to: req.user.email,
        from: 'noreply@thrustcurve.org',
        subject: 'ThrustCurve.org email verification',
        text: `
You requested that your ThrustCurve.org email address be verified.
Please click this link or paste it into your browser address bar to complete the process:

${link}
`,
        html: `
<p>You requested that your ThrustCurve.org email address be verified.
Please click this link or paste it into your browser address bar to complete the process:</p>
<p style="font-size: large;"><a href="${link}">${link}</a></p>
<p><img width="200" height="40" src="https://www.thrustcurve.org/images/footer-logo.png" alt="ThrustCurve.org"></p>
`,
      }).then(() => {
        res.render('mystuff/verifyemail', locals(req, defaults, {
          title: 'Verify Email',
          email: req.user.email,
          isSent: true,
          errors,
        }));
      }).catch(e => {
        res.status(e.status || 500);
        res.render('error', {
          title: 'Email Error',
          layout: 'mystuff',
          url: req.url,
          error: e,
        });
      });
    }));
  });
});


/*
 * /mystuff/favorites.html
 * Renders with mystuff/favorites.hbs template.
 */
router.get('/mystuff/favorites.html', authenticated, function(req, res, next) {
  req.db.FavoriteMotor.find({ _contributor: req.user._id }).exec(req.success(function(favorites) {
    req.db.MotorView.find({ _contributor: req.user._id }).sort({ updatedAt: -1 }).limit(100).exec(req.success(function(recents) {
      var ids = [], id, i;

      // colect IDs of favorite motors
      for (i = 0; i < favorites.length; i++)
        ids.push(favorites[i]._motor.toString());

      // filter out favorites and de-dup
      if (recents.length > 0) {
        for (i = 0; i < recents.length; ) {
          id = recents[i]._motor.toString();
          if (ids.indexOf(id) < 0) {
            // add to motor IDs
            ids.push(id);
            i++;
          } else {
            // remove from recents
            recents.splice(i, 1);
          }
        }
      }

      // fetch needed motors
      req.db.Motor.find({ '_id': { $in: ids } }).populate('_manufacturer', 'abbrev').exec(req.success(function(motors) {
        var map = {}, id, i;

        // hand-populate favorites and recents
        for (i = 0; i < motors.length; i++) {
          id = motors[i]._id.toString();
          map[id] = motors[i];
        }
        for (i = 0; i < favorites.length; i++) {
          id = favorites[i]._motor.toString();
          favorites[i]._motor = map[id];
        }
        for (i = 0; i < recents.length; i++) {
          id = recents[i]._motor.toString();
          recents[i]._motor = map[id];
        }

        res.render('mystuff/favorites', locals(req, defaults, {
          title: 'Favorite Motors',
          favorites: favorites,
          recents: recents,
        }));
      }));
    }));
  }));
});

function addFavorite(req, res, motor) {
  if (!req.db.isId(motor)) {
    // invalid motor ID
    res.status(404).send('Invalid motor ID');
  } else {
    req.db.FavoriteMotor.findOne({ _contributor: req.user._id, _motor: motor }, req.success(function(favorite) {
      if (favorite) {
        // already a favorite
        res.redirect(favoritesLink);
      } else {
        favorite = new req.db.FavoriteMotor({
          _contributor: req.user._id,
          _motor: motor
        });
        favorite.save(req.success(function(saved) {
          // now is a favorite
          res.redirect(favoritesLink);
        }));
      }
    }));
  }
}

router.get('/mystuff/addfavorite.html', authenticated, function(req, res, next) {
  addFavorite(req, res, req.query.motor);
});
router.post('/mystuff/addfavorite.html', authenticated, function(req, res, next) {
  addFavorite(req, res, req.body.motor);
});

function removeFavorite(req, res, motor) {
  if (!req.db.isId(motor)) {
    // invalid motor ID
    res.redirect(favoritesLink);
  } else {
    req.db.FavoriteMotor.remove({ _contributor: req.user._id, _motor: motor }, req.success(function() {
      res.redirect(favoritesLink);
    }));
  }
}

router.get('/mystuff/removefavorite.html', authenticated, function(req, res, next) {
  removeFavorite(req, res, req.query.motor);
});
router.post('/mystuff/removefavorite.html', authenticated, function(req, res, next) {
  removeFavorite(req, res, req.body.motor);
});


/*
 * /mystuff/rockets.html
 * Renders with mystuff/rockets.hbs template.
 */
router.get(rocketsLink, authenticated, function(req, res, next) {
  req.db.Rocket.find({ _contributor: req.user._id }, req.success(function(rockets) {
    let lengthUnit = units.getUnitPref('length').label,
        massUnit = units.getUnitPref('mass').label;
    res.render('mystuff/rockets', locals(req, defaults, {
      title: 'My Rockets',
      rockets: rockets,
      isDeleted: req.query.result == 'deleted',
      lengthUnits: units.length,
      massUnits: units.mass,
      bodyDiameterUnit: lengthUnit,
      mmtDiameterUnit: 'mm',
      weightUnit: massUnit,
      searchLink,
    }));
  }));
});


/*
 * /mystuff/publicrockets.html
 * Renders with mystuff/publicrockets.hbs template.
 */
router.get(searchLink, authenticated, function(req, res, next) {
  let q = { public: true, _contributor: { $ne: req.user._id } };

  let criteria = 0;
  if (req.query.name != null && req.query.name.trim() !== '') {
    q.name = new RegExp(req.query.name.trim().replace(/[?.*+{}\[\]()|\\^$]/g, "\\$&"), "i");
    criteria++;
  }
  if (req.query.bodyDiameter > 0 && req.query.bodyDiameterUnit != null) {
    let v = units.convertUnitToMKS(req.query.bodyDiameter, 'length', req.query.bodyDiameterUnit);
    q.bodyDiameterMKS = { $gt: v * 0.95, $lt: v * 1.05 };
    criteria++;
  }
  if (req.query.mmtDiameter > 0 && req.query.mmtDiameterUnit != null) {
    let v = units.convertUnitToMKS(req.query.mmtDiameter, 'length', req.query.mmtDiameterUnit);
    q.mmtDiameterMKS = { $gt: v - metadata.MotorDiameterTolerance, $lt: v + metadata.MotorDiameterTolerance };
    criteria++;
  }

  const title = "Search Public Rockets",
        template = 'mystuff/publicrockets';

  if (criteria > 0) {
    req.db.Rocket.find(q, undefined, { sort: { updatedAt: -1 } })
                 .populate('_contributor').exec(req.success(function(rockets) {
      rockets.forEach(r => r.copyLink = '/mystuff/rocket/' + r._id + '/copy.html');
      res.render(template, locals(req, defaults, {
        title,
        publicCount: rockets.length,
        publicRockets: rockets,
        searched: true,
      }));
    }));
  } else {
    res.render(template, locals(req, defaults, {
      title,
      publicCount: 0,
      searched: false,
    }));
  }
});


/*
 * /mystuff/rocket/id/
 * Renders with mystuff/rocketdetails.hbs template.
 */
router.get('/mystuff/rocket/:id/', authenticated, function(req, res, next) {
  var id = req.params.id;
  if (req.db.isId(id)) {
    req.db.Rocket.findOne({ _contributor: req.user._id, _id: id }, req.success(function(rocket) {
      var mmtDiameter, mmtLength;

      if (rocket == null) {
        res.redirect(303, rocketsLink);
        return;
      }

      mmtDiameter = units.convertUnitToMKS(rocket.mmtDiameter, 'length', rocket.mmtDiameterUnit);
      mmtLength = units.convertUnitToMKS(rocket.mmtLength, 'length', rocket.mmtLengthUnit);

      metadata.getRocketMotors(req, rocket, function(fit) {
        if (fit.count > 0) {
          let prefs = req.user.preferences || {};
          let types = fit.types.map(t => {
            return {
              value: t,
              checked: prefs.ignoreTypes == null || prefs.ignoreTypes.indexOf(t) < 0,
            };
          });
          let manufacturers = fit.manufacturers.map(m => {
            return {
              _id: m._id,
              name: m.name,
              abbrev: m.abbrev,
              checked: prefs.ignoreManufacturers == null || prefs.ignoreManufacturers.indexOf(m.abbrev) < 0,
            };
          });
          res.render('mystuff/rocketdetails', locals(req, defaults, {
            title: rocket.name,
            rocket: rocket,
            mmtDiameter: mmtDiameter,
            mmtLength: mmtLength,
            fit: fit,

            motorCount: fit.count,

            classes: fit.impulseClasses,
            classCount: fit.impulseClasses.length,
            classRange: fit.classRange,

            types: types,
            typeCount: fit.types.length,
            singleType: fit.types.length == 1 ? fit.types[0] : undefined,

            manufacturers: manufacturers,
            manufacturerCount: fit.manufacturers.length,
            singleManufacturer: fit.manufacturers.length == 1 ? fit.manufacturers[0] : undefined,

            result: req.query.result,
            isCreated: req.query.result == 'created',
            isSaved: req.query.result == 'saved',
            isUnchanged: req.query.result == 'unchanged',
            editLink: '/mystuff/rocket/' + id + '/edit.html',
            deleteLink: '/mystuff/rocket/' + id + '/delete.html',
            copyLink: '/mystuff/rocket/' + id + '/copy.html',
            guideLink: '/motors/guide.html',
          }));
        } else {
          res.render('mystuff/rocketdetails', locals(req, defaults, {
            title: rocket.name,
            rocket: rocket,
            fit: fit,
            result: req.query.result,
            isCreated: req.query.result == 'created',
            isSaved: req.query.result == 'saved',
            isUnchanged: req.query.result == 'unchanged',
            editLink: '/mystuff/rocket/' + id + '/edit.html',
            deleteLink: '/mystuff/rocket/' + id + '/delete.html',
            copyLink: '/mystuff/rocket/' + id + '/copy.html',
          }));
        }
      });
    }));
  } else {
    res.redirect(303, rocketsLink);
  }
});

/*
 * /mystuff/rocket/id/edit.html
 * Renders with mystuff/editrocket.hbs template.
 */
router.get('/mystuff/rocket/:id/edit.html', authenticated, function(req, res, next) {
  var id = req.params.id;
  metadata.getAllMotors(req, function(metadata) {
    if (req.db.isId(id)) {
      req.db.Rocket.findOne({ _contributor: req.user._id, _id: id }, req.success(function(rocket) {
        if (rocket == null) {
          res.redirect(303, rocketsLink);
          return;
        }
        res.render('mystuff/editrocket', locals(req, defaults, {
          title: 'Edit Rocket',
          isNew: false,
          rocket: rocket,
          lengthUnits: units.length,
          massUnits: units.mass,
          finishes: metadata.CdFinishes,
          mmtDiametersMM: metadata.diametersMM(),
          mmtDiameterIsMM: rocket.mmtDiameterUnit === 'mm',
          submitLink: '/mystuff/rocket/' + id + '/edit.html',
          adapterLink: '/mystuff/rocket/' + id + '/adapter.html',
          cancelLink: '/mystuff/rocket/' + id + '/',
        }));
      }));
    } else {
      // add new rocket
      var lengthUnit = units.getUnitPref('length').label,
          massUnit = units.getUnitPref('mass').label,
          guideDefault = units.defaultGuideLength();

      res.render('mystuff/editrocket', locals(req, defaults, {
        title: 'Add Rocket',
        isNew: true,
        rocket: {
          'public': true,
          bodyDiameterUnit: lengthUnit,
          weightUnit: massUnit,
          mmtDiameter: 18,
          mmtDiameterUnit: 'mm',
          mmtLengthUnit: lengthUnit,
          mmtCount: 1,
          cd: 0.6,
          guideLength: guideDefault.value,
          guideLengthUnit: guideDefault.unit,
        },
        lengthUnits: units.length,
        massUnits: units.mass,
        finishes: metadata.CdFinishes,
        mmtDiametersMM: metadata.diametersMM(),
        mmtDiameterIsMM: true,
        submitLink: '/mystuff/rocket/new/edit.html',
        cancelLink: '/mystuff/rockets.html',
      }));
    }
  });
});
router.get('/updaterocket.jsp', function(req, res, next) {
  var id = req.query.id;
  if (id && /^[1-9][0-9]*$/.test(id)) {
    // old-style MySQL row ID; go to rocket edit
    req.db.Rocket.findOne({ migratedId: parseInt(id) }, req.success(function(found) {
      if (found)
        res.redirect(301, '/mystuff/rocket/' + found._id + '/edit.html');
      else
        res.redirect(303, rocketsLink);
    }));
  } else {
    res.redirect(301, rocketsLink);
  }
});

function doSubmitRocket(req, res, rocket) {
  var isNew = false, isChanged = false,
      errors = [], url, v;

  if (rocket == null) {
    rocket = {
      _contributor: req.user._id
    };
    isNew = true;
  }

  // non-numeric values
  [ 'name',
    'website',
    'comments',
  ].forEach(function(p) {
    var s;
    if (req.hasBodyProperty(p)) {
      s = req.body[p].trim();
      if (s === '') {
        if (rocket[p] != null) {
          rocket[p] = undefined;
          isChanged = true;
        }
      } else {
        if (rocket[p] == null || req.body[p] != rocket[p].toString()) {
          rocket[p] = req.body[p];
          isChanged = true;
        }
      }
    }
  });
  if (rocket.name == null || rocket.name === '') {
    errors.push('Rocket name is required.');
  }
  if (rocket.website != null && !schema.UrlRegex.test(rocket.website)) {
    errors.push('Web page is not a valid URL.');
  }

  // public flag
  v = req.body.public == 'on' || req.body.public == 'true';
  if (rocket.public != v) {
    rocket.public = v;
    isChanged = true;
  }

  // dimensions with units
  [ 'bodyDiameter',
    'weight',
    'mmtDiameter',
    'mmtLength',
    'guideLength',
  ].forEach(function(valueProp) {
    var unitProp = valueProp + 'Unit',
        u, v;

    if (req.hasBodyProperty(valueProp)) {
      v = parseFloat(req.body[valueProp]);
      u = req.body[unitProp];

      if (valueProp == 'weight')
        u = units.mass.get(u);
      else
        u = units.length.get(u);

      if (isNaN(v) || v <= 0 || u == null)
        errors.push('Rocket ' + valueProp + ' (with unit) is required.');
      else if (rocket[valueProp] != v || rocket[unitProp] != u.label) {
        rocket[valueProp] = v;
        rocket[unitProp] = u.label;
        isChanged = true;
      }
    }
  });

  // simple numeric values
  [ 'mmtCount',
    'cd',
  ].forEach(function(p) {
    var v;
    if (req.hasBodyProperty(p)) {
      v = parseFloat(req.body[p]);
      if (isNaN(v) || v <= 0)
        errors.push('Rocket ' + p + ' is required.');
      else if (rocket[p] != v) {
        rocket[p] = v;
        isChanged = true;
      }
    }
  });

  if (isNew)
    url = '/mystuff/rocket/new/edit.html';
  else
    url = '/mystuff/rocket/' + rocket._id + '/edit.html';

  if (errors.length > 0) {
    metadata.getAllMotors(req, function(metadata) {
      res.render('mystuff/editrocket', locals(req, defaults, {
        title: isNew ? 'Add Rocket' : 'Edit Rocket',
        isNew: isNew,
        rocket: rocket,
        lengthUnits: units.length,
        massUnits: units.mass,
        finishes: metadata.CdFinishes,
        mmtDiametersMM: metadata.diametersMM(),
        mmtDiameterIsMM: rocket.mmtDiameterUnit === 'mm',
        errors: errors,
        submitLink: url
      }));
    });
  } else if (isNew) {
    req.db.Rocket.create(new req.db.Rocket(rocket), req.success(function(updated) {
      url = '/mystuff/rocket/' + updated._id + '/';
      res.redirect(303, url + '?result=created');
    }));
  } else {
    url = '/mystuff/rocket/' + rocket._id + '/';
    if (isChanged) {
      rocket.save(req.success(function(updated) {
        res.redirect(303, url + '?result=saved');
      }));
    } else {
      res.redirect(303, url + '?result=unchanged');
    }
  }
}

router.post('/mystuff/rocket/:id/edit.html', authenticated, function(req, res, next) {
  var id = req.params.id;

  if (req.db.isId(id)) {
    req.db.Rocket.findOne({ _contributor: req.user._id, _id: id }, req.success(function(rocket) {
      if (rocket == null)
        res.redirect(303, rocketsLink);
      else
        doSubmitRocket(req, res, rocket);
    }));
  } else {
    doSubmitRocket(req, res);
  }
});

/*
 * /mystuff/rocket/id/copy.html
 * Renders with mystuff/editrocket.hbs template.
 */
router.get('/mystuff/rocket/:id/copy.html', authenticated, function(req, res, next) {
  const id = req.params.id;
  if (req.db.isId(id)) {
    req.db.Rocket.findOne({ $or: [ { _contributor: req.user._id }, { public: true } ], _id: id },
                          req.success(function(rocket) {
      if (rocket == null) {
        res.redirect(303, rocketsLink);
        return;
      }
      metadata.getAllMotors(req, function(metadata) {
        res.render('mystuff/editrocket', locals(req, defaults, {
          title: 'Copy Rocket',
          isNew: true,
          rocket: rocket.toObject(),
          lengthUnits: units.length,
          massUnits: units.mass,
          finishes: metadata.CdFinishes,
          mmtDiametersMM: metadata.diametersMM(),
          mmtDiameterIsMM: rocket.mmtDiameterUnit === 'mm',
          submitLink: '/mystuff/rocket/new/edit.html',
          cancelLink: '/mystuff/rocket/' + id + '/',
        }));
      });
    }));
  } else {
    res.redirect(303, rocketsLink);
  }
});

/*
 * /mystuff/rocket/id/adapter.html
 * Redirects to rocket edit page.
 */
router.post('/mystuff/rocket/:id/adapter.html', authenticated, function(req, res, next) {
  var id = req.params.id;

  if (req.db.isId(id)) {
    req.db.Rocket.findOne({ _contributor: req.user._id, _id: id }, req.success(function(rocket) {
      var index, adapter, isNew, isChanged = false, errors = [];

      if (rocket == null) {
        res.redirect(303, rocketsLink);
        return;
      }

      // get the existing adapter
      if (req.body.index) {
        index = parseInt(req.body.index);
        if (isNaN(index) || index < 0)
          index = -1;
        else
          adapter = rocket.adapters[index];
      }
      if (adapter == null) {
        adapter = {};
        isNew = true;
      }

      // dimensions with units
      [
        'mmtDiameter',
        'mmtLength',
        'weight',
      ].forEach(function(valueProp) {
        var unitProp = valueProp + 'Unit',
            u, v;

        if (req.hasBodyProperty(valueProp)) {
          v = parseFloat(req.body[valueProp]);
          u = req.body[unitProp];

          if (valueProp == 'weight')
            u = units.mass.get(u);
          else
            u = units.length.get(u);

          if (isNaN(v) || v <= 0 || u == null)
            errors.push('Adapter ' + valueProp + ' (with unit) is required.');
          else if (adapter[valueProp] != v || adapter[unitProp] != u.label) {
            adapter[valueProp] = v;
            adapter[unitProp] = u.label;
            isChanged = true;
          }
        }
      });

      if (req.hasBodyProperty('remove')) {
        // remove an adapter
        if (index >= 0 && index < rocket.adapters.length) {
          rocket.adapters.splice(index, 1);
          isChanged = true;
        }
      } else {
        // add/update an adapter
        if (isNew && isChanged)
          rocket.adapters.push(adapter);
      }

      if (!isChanged) {
        res.redirect('/mystuff/rocket/' + rocket._id + '/edit.html?result=unchanged');
        return;
      }

      rocket.save(req.success(function(updated) {
        res.redirect('/mystuff/rocket/' + updated._id + '/edit.html?result=updated');
      }));
    }));
  } else {
    res.redirect(303, rocketsLink);
  }
});

/*
 * /mystuff/rocket/id/delete.html
 * Redirects to rocket list.
 */
router.get('/mystuff/rocket/:id/delete.html', authenticated, function(req, res, next) {
  var id = req.params.id;
  if (req.db.isId(id)) {
    req.db.Rocket.remove({ _contributor: req.user._id, _id: id }, req.success(function(rocket) {
      res.redirect(303, rocketsLink + '?result=deleted');
    }));
  } else {
    res.redirect(303, rocketsLink);
  }
});


/*
 * /mystuff/prefs.html
 * Renders with mystuff/prefs.hbs template.
 */
router.get([preferencesLink, '/mystuff/prefs.html'], authenticated, function(req, res, next) {
  metadata.getAvailableMotors(req, function(cache) {

    // normalize preferences
    var prefs = {},
        unitSet;

    // first get the default units
    if (req.user.preferences.defaultUnits)
      unitSet = units.defaults.get(req.user.preferences.defaultUnits);
    if (unitSet == null)
      unitSet = units.defaults[0];
    prefs.defaultUnits = unitSet.label;

    // resolve each specific unit preference
    [ 'length',
      'mass',
      'force',
      'velocity',
      'acceleration',
      'altitude',
      'temperature'
    ].forEach(function(unit) {
      var prefName = unit + 'Unit',
          prefValue = req.user.preferences[prefName],
          value;

      if (prefValue)
        value = units[unit].get(prefValue);
      if (value == null)
        value = units[unit].get(unitSet[unit]);
      prefs[prefName] = value.label;
    });

    // list available motor types
    prefs.ignoreTypes = req.user.preferences.ignoreTypes || [];
    let chooseTypes = [];
    cache.types.forEach(v => {
      chooseTypes.push({
        value: v,
        selected: !(prefs.ignoreTypes != null && prefs.ignoreTypes.indexOf(v) >= 0),
      });
    });

    // list available manufacturers
    prefs.ignoreManufacturers = req.user.preferences.ignoreManufacturers || [];
    let chooseManufacturers = [];
    cache.manufacturers.forEach(mfr => {
      chooseManufacturers.push({
        name: mfr.name,
        value: mfr.abbrev,
        selected: !(prefs.ignoreManufacturers && prefs.ignoreManufacturers.indexOf(mfr.abbrev) >= 0),
      });
    });

    // list table page lengths
    let tablePageLens = [
      { label: "auto (10 or 20)", value: null },
      { label: "10 rows", value: 10 },
      { label: "20 rows", value: 20 },
      { label: "50 rows", value: 50 },
      { label: "all rows", value: -1 },
    ];
    if (typeof req.user.preferences.tablePageLen === 'number')
      prefs.tablePageLen = req.user.preferences.tablePageLen;

    res.render('mystuff/preferences', locals(req, defaults, {
      title: 'Preferences',
      units: units,
      defaults: units.defaults,
      prefs: prefs,
      chooseTypes,
      chooseManufacturers,
      tablePageLens,
      submitLink: preferencesLink,
    }));
  });
});

router.post(preferencesLink, authenticated, function(req, res, next) {
  metadata.getAvailableMotors(req, function(cache) {
    var change = false;

    [ 'defaultUnits',
      'lengthUnit',
      'massUnit',
      'forceUnit',
      'velocityUnit',
      'accelerationUnit',
      'altitudeUnit',
      'temperatureUnit'
    ].forEach(function(pref) {
      var value = req.body[pref];
      if (value != null && value !== '' && value != req.user.preferences[pref]) {
        req.user.preferences[pref] = value;
        change = true;
      }
    });

    [ 'Types',
      'Manufacturers'
    ].forEach(suffix => {
      let all = cache[suffix.toLowerCase()];
      if (suffix == 'Manufacturers')
        all = all.map(mfr => mfr.abbrev);

      let chosen = req.body['choose' + suffix];
      if (chosen == null)
        chosen = [];
      else if (typeof chosen === 'string')
        chosen = [chosen];

      let ignored = [];
      all.forEach(opt => {
        if (chosen.indexOf(opt) < 0)
          ignored.push(opt);
      });

      let prefName = 'ignore' + suffix;
      if (req.user.preferences[prefName] == null || req.user.preferences[prefName].length < 1) {
        if (ignored.length > 0) {
          req.user.preferences[prefName] = ignored;
          change = true;
        }
      } else {
        if (ignored.join() != req.user.preferences[prefName].join()) {
          req.user.preferences[prefName] = ignored;
          change = true;
        }
      }
    });

    let tablePageLen = null;
    if (req.body.tablePageLen != null) {
      tablePageLen = parseInt(req.body.tablePageLen);
      if (!isFinite(tablePageLen))
        tablePageLen = null;
    }
    if ((tablePageLen == null && req.user.preferences.tablePageLen != null) ||
        (tablePageLen != null && tablePageLen != req.user.preferences.tablePageLen)) {
      req.user.preferences.tablePageLen = tablePageLen;
      change = true;
    }

    if (change) {
      req.user.save(req.success(function(updated) {
        res.redirect(preferencesLink + '?result=saved');
      }));
    } else {
      res.redirect(preferencesLink + '?result=unchanged');
    }
  });
});


/*
 * /mystuff/profile.html
 * Renders with mystuff/profile.hbs template.
 */
router.get(profileLink, authenticated, function(req, res, next) {
  var perms = [],
      key, i;

  if (req.user && req.user.permissions) {
    for (i = 0; i < schema.PermissionInfo.length; i++) {
      key = schema.PermissionInfo[i].key;
      if (req.user.permissions[key] === true)
	perms.push(schema.PermissionInfo[i]);
    }
  }
  res.render('mystuff/profile', locals(req, defaults, {
    title: 'My Profile',
    info: req.user,
    perms: perms,
    submitLink: profileLink,
  }));
});
router.get(['/updatecontrib.jsp'], function(req, res, next) {
  res.redirect(301, profileLink);
});

router.post(profileLink, authenticated, function(req, res, next) {
  // collect parameters
  var info = req.user, errors = [],
      change = false, changeEmail = false,
      v;

  if (req.hasBodyProperty('name')) {
    v = req.body.name.trim();
    if (v === '') {
      errors.push('Please enter your name for public display.');
    } else {
      if (v != info.name) {
        info.name = v;
        change = true;
      }
    }
  }

  if (req.hasBodyProperty('email')) {
    v = req.body.email.trim();
    if (v === '' || !schema.EmailRegex.test(v)) {
      errors.push('Please enter your email address as your login name.');
    } else {
      if (v != info.email) {
        info.email = v;
        change = changeEmail = true;
      }
    }

    v = req.body.showEmail == 'true' || req.body.showEmail == 'on';
    if (v != info.showEmail) {
      info.showEmail = v;
      change = true;
    }
  }

  if (req.hasBodyProperty('organization')) {
    v = req.body.organization.trim();
    if (v == null || v === '' || v == '-') {
      if (info.organization != null) {
        info.organization = undefined;
        change = true;
      }
    } else if (v != info.organization) {
      info.organization = v;
      change = true;
    }
  }

  if (req.hasBodyProperty('website')) {
    v = req.body.website.trim();
    if (v == null || v === '' || v == '-') {
      if (info.website != null) {
        info.website = undefined;
        change = true;
      }
    } else if (!schema.UrlRegex.test(v)) {
      errors.push('Please enter a valid URL for your web site.');
    } else {
      if (v != info.website) {
        info.website = v;
        change = true;
      }
    }
  }

  if (req.hasBodyProperty('password')) {
    v = req.body.password;
    if (v == null || v === '') {
      errors.push('A password is required to protect your account.');
    } else {
      info.password = v;
      change = true;

      v = req.body.password2;
      if (v != info.password)
        errors.push('Please confirm your password by entering it twice.');
    }
  }

  // if no changes, don't do anything
  if (!change && errors.length < 1) {
    res.render('mystuff/profile', locals(req, defaults, {
      title: 'My Profile',
      info: info,
      errors: errors,
      result: 'unchanged',
      submitLink: profileLink,
    }));
    return;
  }

  // error handling and update
  var submit = function() {
    if (errors.length > 0) {
      res.render('mystuff/profile', locals(req, defaults, {
        title: 'My Profile',
        info: info,
        errors: errors,
        submitLink: profileLink,
      }));
    } else {
      info.save(req.success(function(updated) {
        res.render('mystuff/profile', locals(req, defaults, {
          title: 'My Profile',
          info: updated,
          errors: errors,
          result: 'saved',
          submitLink: profileLink,
        }));
      }));
    }
  };

  if (changeEmail && errors.length < 1) {
    // email will no longer be verified
    info.verified = false;
    // make sure the email isn't already in use
    req.db.Contributor.findOne({ email: info.email }, req.success(function(existing) {
      if (existing && existing._id.toString() != info._id.toString())
        errors.push('That new email address is already registered.');
      submit();
    }));
  } else {
    submit();
  }
});

/*
 * /mystuff/logout.html
 * Log the current user out, redirects to index.
 */
router.get('/mystuff/logout.html', function(req, res, next) {
  req.logout();
  res.redirect('/');
});


module.exports = router;
