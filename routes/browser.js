/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const _ = require('underscore'),
      express = require('express'),
      router = express.Router(),
      async = require('async'),
      units = require('../lib/units'),
      ErrorCollector = require('../lib/errors').Collector,
      metadata = require('../lib/metadata'),
      schema = require('../database/schema'),
      parsers = require('../simulate/parsers'),
      flightsim = require('../simulate/flightsim'),
      analyze = require('../simulate/analyze'),
      spreadsheet = require('../render/spreadsheet'),
      locals = require('./locals.js');

const defaults = {
  layout: 'motors',
};

const browserPage = '/motors/browser.html';

// https://bost.ocks.org/mike/shuffle/
function shuffle(array) {
  var m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}

/*
 * /motors/browser.html
 * Motor browser, renders with motors/browser.hbs template.
 */
router.get(browserPage, function(req, res, next) {
  metadata.get(req, function(caches) {
    var mfrs = [],
        i;

    for (i = 0; i < caches.manufacturers.length; i++) {
      if (caches.manufacturers[i].active)
        mfrs.push(caches.manufacturers[i]);
    }
    shuffle(mfrs);

    res.render('browser/intro', locals(defaults, {
      title: 'Motor Browser',
      motorCount: caches.availableMotors.count,
      manufacturers: mfrs,
      advancedLink: browserPage + '?advanced',
      impulseLink: browserPage + '?1category',
      typeLink: browserPage + '?1type',
      manufacturerLink: browserPage + '?1manufacturer',
    }));
  });
});
router.get(['/browser.shtml', '/browser.jsp'], function(req, res, next) {
  res.redirect(301, '/motors/browser.html');
});


module.exports = router;
