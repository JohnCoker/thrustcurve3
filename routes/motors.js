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

var searchLink = '/motors/search.html';

router.get('/motors/:mfr/:desig/', function(req, res, next) {
  req.db.Manufacturer.findOne({ abbrev: req.params.mfr }, req.success(function(manufacturer) {
    if (manufacturer == null)
      res.redirect(303, searchLink);
    else {
      req.db.Motor.findOne({ designation: req.params.desig }).populate('_relatedMfr _certOrg').exec(req.success(function(motor) {
        if (motor == null)
          res.redirect(303, searchLink);
        else {
          req.db.SimFile.find({ _motor: motor._id }, undefined, { sort: { updatedAt: -1 } }).populate('_contributor').exec(req.success(function(simfiles) {
            req.db.MotorNote.find({ _motor: motor._id }, undefined, { sort: { updatedAt: -1 } }).populate('_contributor').exec(req.success(function(notes) {
              res.render('motors/details', locals(defaults, {
                title: manufacturer.abbrev + ' ' + motor.designation,
                manufacturer: manufacturer,
                motor: motor,
                simfiles: simfiles,
                notes: notes,
                editLink: req.helpers.motorLink(manufacturer, motor) + 'edit.html'
              }));
            }));
          }));
        }
      }));
    }
  }));
});
router.get('/motorsearch.jsp', function(req, res, next) {
  var id = req.query.id;
  if (id && /^[1-9][0-9]*$/.test(id)) {
    // old-style MySQL row ID; go to motor details
    req.db.Motor.findOne({ migratedId: parseInt(id) }).populate('_manufacturer').exec(req.success(function(result) {
      if (result)
        res.redirect(301, req.helpers.motorLink(result));
      else
        res.redirect(303, searchLink);
    }));
  } else {
    res.redirect(301, searchLink);
  }
});

router.get(searchLink, function(req, res, next) {
  res.render('motors/search', locals(defaults, 'Motor Search'));
});
router.get('/searchpage.jsp', function(req, res, next) {
  res.redirect(301, searchLink);
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
