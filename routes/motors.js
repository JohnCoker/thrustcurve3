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

router.get('/motors/search.html', function(req, res, next) {
  res.render('motors/search', locals(defaults, 'Motor Search'));
});
router.get(['/searchpage.jsp', '/motorsearch.jsp'], function(req, res, next) {
  res.redirect(301, '/motors/search.html');
});

router.get('/motors/guide.html', function(req, res, next) {
  res.render('motors/guide', locals(defaults, 'Motor Guide'));
});
router.get(['/guidepage.jsp', '/motorguide.jsp'], function(req, res, next) {
  res.redirect(301, '/motors/guide.html');
});

router.get('/motors/browser.html', function(req, res, next) {
  res.render('motors/browser', locals(defaults, 'Motor Browser'));
});
router.get(['/browser.shtml', '/browser.jsp'], function(req, res, next) {
  res.redirect(301, '/motors/browser.html');
});

router.get('/motors/missingdata.html', function(req, res, next) {
  res.render('motors/missingdata', locals(defaults, 'Motor Without Data'));
});
router.get(['/missingdata.jsp'], function(req, res, next) {
  res.redirect(301, '/motors/missingdata.html');
});

router.get('/motors/popular.html', function(req, res, next) {
  res.render('motors/popular', locals(defaults, 'Popular Motors'));
});

router.get('/motors/updates.html', function(req, res, next) {
  res.render('motors/updates', locals(defaults, 'Recent Updates'));
});
router.get(['/updates.jsp'], function(req, res, next) {
  res.redirect(301, '/motors/updates.html');
});

module.exports = router;
