/*
 * Copyright 2016-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var express = require('express'),
    router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'ThrustCurve Home',
    layout: 'home',
    year: new Date().getFullYear(),
  });
});
router.get(['/index.html', '/index.shtml'], function(req, res, next) {
  res.redirect(301, '/');
});

module.exports = router;
