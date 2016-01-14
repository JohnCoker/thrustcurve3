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

router.get('/info/api.html', function(req, res, next) {
  res.render('info/api', locals(defaults, 'ThrustCurve API'));
});
router.get(['/searchapi.html', '/searchapi.shtml'], function(req, res, next) {
  res.redirect(301, '/info/api.html');
});

router.get('/info/background.html', function(req, res, next) {
  res.render('info/background', locals(defaults, 'About this Site'));
});
router.get('/background.shtml', function(req, res, next) {
  res.redirect(301, '/info/background.html');
});

router.get('/info/certification.html', function(req, res, next) {
  res.render('info/certification', locals(defaults, 'Motor Certification'));
});
router.get('/certification.shtml', function(req, res, next) {
  res.redirect(301, '/info/certification.html');
});

router.get('/info/contribute.html', function(req, res, next) {
  res.render('info/contribute', locals(defaults, 'Contribute Data'));
});
router.get('/contribute.shtml', function(req, res, next) {
  res.redirect(301, '/info/contribute.html');
});

router.get('/info/glossary.html', function(req, res, next) {
  res.render('info/glossary', locals(defaults, 'Rocket Motor Jargon'));
});
router.get('/glossary.shtml', function(req, res, next) {
  res.redirect(301, '/info/glossary.html');
});

router.get('/info/mobile.html', function(req, res, next) {
  res.render('info/mobile', locals(defaults, 'Smart Phone App'));
});
router.get('/mobile.shtml', function(req, res, next) {
  res.redirect(301, '/info/mobile.html');
});

router.get('/info/motorstats.html', function(req, res, next) {
  res.render('info/motorstats', locals(defaults, 'Motor Statistics'));
});
router.get('/motorstats.shtml', function(req, res, next) {
  res.redirect(301, '/info/motorstats.html');
});

router.get('/info/raspformat.html', function(req, res, next) {
  res.render('info/raspformat', locals(defaults, 'RASP File Format'));
});
router.get('/raspformat.shtml', function(req, res, next) {
  res.redirect(301, '/info/raspformat.html');
});

router.get('/info/simulation.html', function(req, res, next) {
  res.render('info/simulation', locals(defaults, 'Flight Simulation'));
});
router.get('/simulation.shtml', function(req, res, next) {
  res.redirect(301, '/info/simulation.html');
});

router.get('/info/simulators.html', function(req, res, next) {
  res.render('info/simulators', locals(defaults, 'Flight Simulators'));
});
router.get('/simulators.shtml', function(req, res, next) {
  res.redirect(301, '/info/simulators.html');
});

router.get('/info/tctracer.html', function(req, res, next) {
  res.render('info/tctracer', locals(defaults, 'Thrust Curve Tracer'));
});
router.get('/tctracer.shtml', function(req, res, next) {
  res.redirect(301, '/info/tctracer.html');
});

module.exports = router;
