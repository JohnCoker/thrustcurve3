/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      passport = require('passport'),
      schema = require('../database/schema'),
      units = require('../lib/units'),
      locals = require('./locals.js'),
      authenticated = require('./authenticated.js');

const loginLink = '/mystuff/login.html',
      registerLink = '/mystuff/register.html',
      forgotLink = '/mystuff/forgotpasswd.html',
      preferencesLink = '/mystuff/preferences.html',
      profileLink = '/mystuff/profile.html';

const defaults = {
  layout: 'mystuff'
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
  res.render('mystuff/login', locals(defaults, {
    title: 'Log In',
    layout: 'info',
    submitLink: loginLink,
    registerLink: registerLink,
    forgotLink: forgotLink,
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
  res.render('mystuff/register', locals(defaults, {
    title: 'Register',
    layout: 'info',
    info: { showEmail: true },
    submitLink: registerLink,
    loginLink: loginLink,
    forgotLink: forgotLink,
    redirect: getRedirect(req),
  }));
});
router.get(['/register.jsp'], function(req, res, next) {
  res.redirect(301, registerLink);
});

router.post(registerLink, function(req, res, next) {
  // collect parameters
  var info = {}, errors = [],
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

  if (errors.length > 0) {
    res.render('mystuff/register', locals(defaults, {
      title: 'Register',
      layout: 'info',
      info: info,
      errors: errors,
      submitLink: registerLink,
      loginLink: loginLink,
      forgotLink: forgotLink,
    }));
    return;
  }

  // make sure the email isn't already in use
  req.db.Contributor.findOne({ email: info.email }, req.success(function(existing) {
    if (existing) {
      res.render('mystuff/forgotpasswd', {
        title: 'Forgot Password',
        layout: 'info',
        email: info.email,
        errors: ['Email address already registered.'],
        submitLink: forgotLink,
        loginLink: loginLink,
        registerLink: registerLink,
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
});


/*
 * /mystuff/forgotpasswd.html
 * Renders with mystuff/forgotpasswd.hbs template.
 */
router.get('/mystuff/forgotpasswd.html', authenticated, function(req, res, next) {
  res.render('mystuff/forgotpasswd', locals(req, defaults, {
    title: 'Forgot Password',
    submitLink: forgotLink,
    loginLink: loginLink,
    registerLink: registerLink,
  }));
});


/*
 * /mystuff/favorites.html
 * Renders with mystuff/favorites.hbs template.
 */
router.get('/mystuff/favorites.html', authenticated, function(req, res, next) {
  res.render('mystuff/favorites', locals(req, defaults, 'My Favorites'));
});


/*
 * /mystuff/rockets.html
 * Renders with mystuff/rockets.hbs template.
 */
router.get('/mystuff/rockets.html', authenticated, function(req, res, next) {
  res.render('mystuff/rockets', locals(req, defaults, 'My Rockets'));
});
router.get(['/updaterocket.jsp'], function(req, res, next) {
  res.redirect(301, '/mystuff/rockets.html');
});


/*
 * /mystuff/prefs.html
 * Renders with mystuff/prefs.hbs template.
 */
router.get([preferencesLink, '/mystuff/prefs.html'], authenticated, function(req, res, next) {
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
    'altitude'
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

  res.render('mystuff/preferences', locals(req, defaults, {
    title: 'Preferences',
    units: units,
    defaults: units.defaults,
    prefs: prefs,
    submitLink: preferencesLink,
  }));
});

router.post([preferencesLink], authenticated, function(req, res, next) {
  var change = false;

  [ 'defaultUnits',
    'lengthUnit',
    'massUnit',
    'forceUnit',
    'velocityUnit',
    'accelerationUnit',
    'altitudeUnit'
  ].forEach(function(pref) {
    var value = req.body[pref];
    if (value != null && value !== '' && value != req.user.preferences[pref]) {
      req.user.preferences[pref] = value;
      change = true;
    }
  });

  if (change) {
    req.user.save(req.success(function(updated) {
      res.redirect(preferencesLink + '?result=saved');
    }));
  } else {
    res.redirect(preferencesLink + '?result=unchanged');
  }
});


/*
 * /mystuff/profile.html
 * Renders with mystuff/profile.hbs template.
 */
router.get(profileLink, authenticated, function(req, res, next) {
  res.render('mystuff/profile', locals(req, defaults, {
    title: 'My Profile',
    info: req.user,
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

  if (req.body.hasOwnProperty('name')) {
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

  if (req.body.hasOwnProperty('email')) {
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

  if (req.body.hasOwnProperty('organization')) {
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

  if (req.body.hasOwnProperty('website')) {
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

  if (req.body.hasOwnProperty('password')) {
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

  // make sure the email isn't already in use
  if (changeEmail && errors.length < 1) {
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
