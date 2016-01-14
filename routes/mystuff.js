/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var express = require('express'),
    router = express.Router(),
    locals = require('./locals.js');

var defaults = {
  layout: 'info',
};

router.get('/mystuff/login.html', function(req, res, next) {
  res.render('mystuff/login', locals(defaults, 'Login'));
});
router.get('login.jsp', function(req, res, next) {
  res.redirect(301, '/mystuff/login.html');
});

router.get('/mystuff/register.html', function(req, res, next) {
  res.render('mystuff/register', locals(defaults, 'Register'));
});
router.get(['/register.jsp'], function(req, res, next) {
  res.redirect(301, '/mystuff/register.html');
});

router.get('/mystuff/favorites.html', function(req, res, next) {
  res.render('mystuff/favorites', locals(defaults, 'My Favorites'));
});

router.get('/mystuff/rockets.html', function(req, res, next) {
  res.render('mystuff/rockets', locals(defaults, 'My Rockets'));
});
router.get(['/updaterocket.jsp'], function(req, res, next) {
  res.redirect(301, '/mystuff/rockets.html');
});

router.get(['/mystuff/prefs.html', '/mystuff/preferences.html'], function(req, res, next) {
  res.render('mystuff/prefs', locals(defaults, 'My Preferences'));
});

router.get('/mystuff/profile.html', function(req, res, next) {
  res.render('mystuff/profile', locals(defaults, 'My Profile'));
});


module.exports = router;
