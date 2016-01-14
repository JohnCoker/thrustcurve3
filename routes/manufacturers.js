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

router.get('/manufacturers/list.html', function(req, res, next) {
  req.db.Manufacturer.find({}, undefined, { sort: { name: 1 } }, req.success(function(results) {
    for (var i = 0; i < results.length; i++) {
      if (results[i].website)
        results[i].websiteDomain = results[i].website.replace(/^https?:\/+/i, '')
                                                     .replace(/^www\./, '')
                                                     .replace(/\/.*$/, '');
    }
    res.render('manufacturers/list', locals(defaults, {
      title: 'Motor Manufacturers',
      manufacturers: results
    }));
  }));
});

router.get('/manufacturers/motors.html', function(req, res, next) {
  var id = req.query.id;
  if (id) {
    req.db.Manufacturer.findOne({ _id: id }, req.success(function(manufacturer) {
      var query;
      if (!manufacturer) {
        res.redirect(303, '/manufacturers/list.html');
      } else {
        query = {
          $or: [ { _manufacturer: manufacturer._id }, { _relatedMfr: manufacturer._id } ]
        };
        if (req.query.unavailable !== '' && req.query.unavailable !== 'true')
          query.availability = { $in: req.db.schema.MotorAvailableEnum };
        req.db.Motor.find(query, undefined, { sort: { totalImpulse: 1, designation: 1 } }, req.success(function(motors) {
          res.render('manufacturers/motors', locals(defaults, {
            title: 'Motors by ' + manufacturer.abbrev,
            manufacturer: manufacturer,
            motors: motors,
          }));
        }));
      }
    }));
  } else {
    res.redirect(303, '/manufacturers/list.html');
  }
});

router.get('/manufacturers/edit.html', function(req, res, next) {
  var id = req.query.id;
  if (id) {
    req.db.Manufacturer.findOne({ _id: id }, req.success(function(result) {
      if (result) {
        res.render('manufacturers/edit', locals(defaults, {
          title: 'Edit ' + result.abbrev,
          manufacturer: result,
          isEdit: true
        }));
      } else {
        res.render('manufacturers/edit', locals(defaults, {
          title: 'New Manufacturer',
          manufacturer: { active: true },
          isNew: true
        }));
      }
    }));
  } else {
    res.render('manufacturers/edit', locals(defaults, {
      title: 'New Manufacturer',
      manufacturer: { active: true },
      isNew: true
    }));
  }
});

router.post('/manufacturers/edit.html', function(req, res, next) {
});

// old site compatibility
router.get(['/manufacturers.shtml'], function(req, res, next) {
  var id = req.query.id;
  if (id && /^[1-9][0-9]?$/.test(id)) {
    // old-style MySQL row ID; go to motor list
    req.db.Manufacturer.findOne({ migratedId: id }, req.success(function(result) {
      if (result)
        res.redirect(301, '/manufacturers/motors.html?id=' + result._id);
      else
        res.redirect(301, '/manufacturers/list.html');
    }));
  } else {
    res.redirect(301, '/manufacturers/list.html');
  }
});

module.exports = router;
