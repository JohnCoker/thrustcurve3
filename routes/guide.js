/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var express = require('express'),
    router = express.Router(),
    units = require('../lib/units'),
    schema = require('../database/schema'),
    metadata = require('./metadata.js'),
    locals = require('./locals.js');

var defaults = {
  layout: 'motors',
};


/*
 * /motors/guide.html
 * Motor guide setup page, renders with guide/entry.hbs or guide/rocket.hbs templates.
 */
function doEntryPage(req, res, rockets) {
  metadata.getAvailableMotors(req, function(available) {
    res.render('guide/entry', locals(req, defaults, {
      title: "Motor Guide",
      rockets: rockets,
      rocket: {
	cd: 0.6,
	guideLength: 1,
	guideLengthUnit: 'm'
      },
      schema: schema,
      metadata: available,
      lengthUnits: units.length,
      massUnits: units.mass,
      finishes: metadata.CdFinishes,
      submitLink: '/motors/guide.html',
      rocketsLink: '/mystuff/rockets.html',
    }));
  });
}

function doRocketPage(req, res, rockets, rocket) {
  var mmtDiameter, mmtLength;

  mmtDiameter = units.convertUnitToMKS(rocket.mmtDiameter, 'length', rocket.mmtDiameterUnit);
  mmtLength = units.convertUnitToMKS(rocket.mmtLength, 'length', rocket.mmtLengthUnit);

  metadata.getRocketMotors(req, rocket, function(fit) {
    res.render('guide/rocket', locals(req, defaults, {
      title: rocket.name || "motor Guide",
      rockets: rockets,
      rocket: rocket,
      mmtDiameter: mmtDiameter,
      mmtLength: mmtLength,
      fit: fit,

      motorCount: fit.count,

      classes: fit.impulseClasses,
      classCount: fit.impulseClasses.length,
      classRange: fit.classRange,

      types: fit.types,
      typeCount: fit.types.length,
      singleType: fit.types.length == 1 ? fit.types[0] : undefined,

      manufacturers: fit.manufacturers,
      manufacturerCount: fit.manufacturers.length,
      singleManufacturer: fit.manufacturers.length == 1 ? fit.manufacturers[0] : undefined,

      submitLink: '/motors/guide.html',
      editLink: '/mystuff/rocket/' + rocket._id + '/edit.html',
      entryLink: '/motors/guide.html',
    }));
  });
}

router.get('/motors/guide.html', function(req, res, next) {
  if (req.user) {
    req.db.Rocket.find({ _contributor: req.user._id }, undefined, { sort: { name: 1 } }, req.success(function(rockets) {
      if (req.db.isId(req.query.rocket)) {
        // logged in and have starting rocket
        req.db.Rocket.findOne({ _id: req.query.rocket }, req.success(function(rocket) {
          if (rocket != null &&
              rocket._contributor.toString() != req.user._id.toString() &&
              !rocket.public)
            rocket = undefined;
	  if (rocket)
            doRocketPage(req, res, rockets, rocket);
	  else
            doEntryPage(req, res, rockets);
        }));
      } else {
        // logged in, but no starting rocket
        doEntryPage(req, res, rockets);
      }
    }));
  } else if (req.db.isId(req.query.rocket)) {
    // not logged in, but have starting rocket
    req.db.Rocket.findOne({ _id: req.query.rocket }, req.success(function(rocket) {
      if (rocket != null && !rocket.public)
        rocket = undefined;
      if (rocket)
	doRocketPage(req, res, undefined, rocket);
      else
	doEntryPage(req, res);
    }));
  } else {
    // not logged in and no starting rocket
    doEntryPage(req, res);
  }
});
router.get(['/guidepage.jsp', '/motorguide.jsp'], function(req, res, next) {
  res.redirect(301, '/motors/guide.html');
});


/*
 * /motors/guide.html
 * Motor guide execution page, renders with guide/results.hbs.
 */
router.post('/motors/guide.html', function(req, res, next) {
  if (req.db.isId(req.body.rocket)) {
  } else {
  }
});


/*
 * /motors/guidehelp.html
 * Motor guide help page, renders with guide/help.hbs.
 */
router.get('/motors/guidehelp.html', function(req, res, next) {
  res.render('guide/help', locals(req, defaults, "Motor Guide Help"));
});
router.get('/guidehelp.shtml', function(req, res, next) {
  res.redirect(301, '/motors/guidehelp.html');
});


module.exports = router;
