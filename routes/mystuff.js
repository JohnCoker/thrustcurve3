/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      passport = require('passport'),
      schema = require('../database/schema'),
      locals = require('./locals.js'),
      authenticated = require('./authenticated.js');

const loginLink = '/mystuff/login.html',
      registerLink = '/mystuff/register.html',
      forgotLink = '/mystuff/forgotpasswd.html',
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
  res.render('mystuff/forgotpasswd', locals(defaults, {
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
  res.render('mystuff/favorites', locals(defaults, 'My Favorites'));
});


/*
 * /mystuff/rockets.html
 * Renders with mystuff/rockets.hbs template.
 */
router.get('/mystuff/rockets.html', authenticated, function(req, res, next) {
  res.render('mystuff/rockets', locals(defaults, 'My Rockets'));
});
router.get(['/updaterocket.jsp'], function(req, res, next) {
  res.redirect(301, '/mystuff/rockets.html');
});


/*
 * /mystuff/preferences.html
 * Renders with mystuff/preferences.hbs template.
 */
router.get(['/mystuff/prefs.html', '/mystuff/preferences.html'], authenticated, function(req, res, next) {
  res.render('mystuff/prefs', locals(defaults, 'My Preferences'));
});


/*
 * /mystuff/profile.html
 * Renders with mystuff/profile.hbs template.
 */
router.get(profileLink, authenticated, function(req, res, next) {
  res.render('mystuff/profile', locals(defaults, 'My Profile'));
});
router.get(['/updatecontrib.jsp'], function(req, res, next) {
  res.redirect(301, profileLink);
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
