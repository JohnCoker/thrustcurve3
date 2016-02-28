/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var express = require('express'),
    router = express.Router(),
    metadata = require('../lib/metadata'),
    locals = require('./locals.js');

var defaults = {
  layout: 'info',
};

var listLink = '/manufacturers/';

function mfrQuery(req) {
  if (req.db.isId(req.query.id))
    return { _id: req.query.id };

  if (req.db.isId(req.params.id))
    return { _id: req.params.id };

  var name = req.params.name;
  if (!name)
    name = 'none';
  return { $or: [ { name: name }, { abbrev: name } ] };
}

function motorsLink(mfr) {
  return '/manufacturers/' + mfr.abbrev + '/motors.html';
}

/*
 * /manufacturers/
 * Manufacturer list, renders with manufacturers/list.hbs template.
 */
router.get([listLink, '/manufacturers/list.html'], function(req, res, next) {
  req.db.Manufacturer.find({}, undefined, { sort: { name: 1 } }, req.success(function(results) {
    for (var i = 0; i < results.length; i++) {
      results[i].motorsLink = req.helpers.manufacturerLink(results[i]);
      results[i].editLink = '/manufacturers/' + results[i]._id + '/edit.html';
    }
    res.render('manufacturers/list', locals(defaults, {
      title: 'Motor Manufacturers',
      manufacturers: results,
      newLink: '/manufacturers/new/edit.html'
    }));
  }));
});


/*
 * /manufacturers/:name/details.html
 * General info for a manufacturer, renders with manufacturers/details.hbs template.
 */
router.get('/manufacturers/:name/details.html', function(req, res, next) {
  req.db.Manufacturer.findOne(mfrQuery(req), req.success(function(manufacturer) {
    var motorsQuery, unavailable;

    if (!manufacturer) {
      res.redirect(303, listLink);
      return;
    }

    // always find by manufacturer
    motorsQuery = {
      $or: [ { _manufacturer: manufacturer._id }, { _relatedMfr: manufacturer._id } ]
    };

    // only for available motors unless requested
    unavailable = false;
    if (req.query.hasOwnProperty('unavailable')) {
      if (req.query.unavailable === '' || req.query.unavailable == 'true')
        unavailable = true;
    } else {
      if (!manufacturer.active)
        unavailable = true;
    }
    if (!unavailable)
        motorsQuery.availability = { $in: req.db.schema.MotorAvailableEnum };

    req.db.Motor.find(motorsQuery)
                .select('impulseClass')
                .exec(req.success(function(motors) {
       var counts = {}, classes = [], cls, range, i;

      // group motors by impulse class
      for (i = 0; i < motors.length; i++) {
        cls = motors[i].impulseClass;
        if (counts.hasOwnProperty(cls))
          counts[cls]++;
        else
          counts[cls] = 1;
      }
      for (i = 'A'.charCodeAt(0); i < 'Z'.charCodeAt(0); i++) {
        cls = String.fromCharCode(i);
        if (counts.hasOwnProperty(cls)) {
          classes.push({
            letter: cls,
            count: counts[cls],
            motorsLink: motorsLink(manufacturer) + '?impulseClass=' + cls + (unavailable ? '&unavailable' : ''),
          });
        }
      }
      if (classes.length > 0) {
        range = classes[0].letter;
        if (classes.length == 2)
          range += ', ' + classes[1].letter;
        else if (classes.length > 2)
          range += ' … ' + classes[classes.length - 1].letter;
      }

      res.render('manufacturers/details', locals(defaults, {
        title: manufacturer.name,
        manufacturer: manufacturer,
        impulseRange: range,
        impulseClasses: classes,
        totalCount: motors.length,
        unavailable: unavailable,
        unavailableLink: req.helpers.manufacturerLink(manufacturer) + '?unavailable',
        motorsLink: motorsLink(manufacturer) + (unavailable ? '&unavailable' : ''),
        editLink: '/manufacturers/' + manufacturer._id + '/edit.html'
      }));
    }));
  }));
});


/*
 * /manufacturers/:name/motors.html
 * Motor list for a manufacturer, renders with manufacturers/motors.hbs template.
 */
router.get('/manufacturers/:name/motors.html', function(req, res, next) {
  req.db.Manufacturer.findOne(mfrQuery(req), req.success(function(manufacturer) {
    var motorsQuery, impulseClass, unavailable;

    if (!manufacturer) {
      res.redirect(303, listLink);
      return;
    }

    // always find by manufacturer
    motorsQuery = {
      $or: [ { _manufacturer: manufacturer._id }, { _relatedMfr: manufacturer._id } ]
    };

    // optionally for a single impulse class
    if (req.query.hasOwnProperty('impulseClass') && /^[A-Z]$/i.test(req.query.impulseClass)) {
      impulseClass = req.query.impulseClass.toUpperCase();
      motorsQuery.impulseClass = impulseClass;
    }

    // only for available motors unless requested
    unavailable = false;
    if (req.query.hasOwnProperty('unavailable')) {
      if (req.query.unavailable === '' || req.query.unavailable == 'true')
        unavailable = true;
    }
    if (!unavailable)
        motorsQuery.availability = { $in: req.db.schema.MotorAvailableEnum };

    req.db.Motor.find(motorsQuery, undefined, { sort: { totalImpulse: 1, designation: 1 } }, req.success(function(motors) {
      res.render('manufacturers/motors', locals(defaults, {
        title: manufacturer.abbrev + (impulseClass ? ' ' + impulseClass : '') + ' Motors',
        manufacturer: manufacturer,
        motors: motors,
        impulseClass: impulseClass,
        unavailable: unavailable,
        unavailableLink: motorsLink(manufacturer) + '?unavailable' + (impulseClass ? '&impulseClass=' + impulseClass : '')
      }));
    }));
  }));
});


/*
 * /manufacturers/:name/edit.html
 * Edit manufacturer info, renders with manufacturers/edit.hbs template.
 */
router.get('/manufacturers/:id/edit.html', function(req, res, next) {
  req.db.Manufacturer.findOne(mfrQuery(req), req.success(function(result) {
    if (result) {
      res.render('manufacturers/edit', locals(defaults, {
        title: 'Edit ' + result.abbrev,
        manufacturer: result,
        isEdit: true,
        submitLink: '/manufacturers/' + result._id + '/edit.html',
        isCreated: req.query.result == 'created',
        isSaved: req.query.result == 'saved',
        isUnchanged: req.query.result == 'unchanged'
      }));
    } else {
      res.render('manufacturers/edit', locals(defaults, {
        title: 'New Manufacturer',
        manufacturer: { active: true },
        isNew: true,
        submitLink: '/manufacturers/new/edit.html'
      }));
    }
  }));
});

router.post('/manufacturers/:id/edit.html', function(req, res, next) {
  req.db.Manufacturer.findOne(mfrQuery(req), req.success(function(manufacturer) {
    var isNew = false, isChanged = false,
        aliases;

    if (manufacturer == null) {
      manufacturer = {
        aliases: [],
        active: true
      };
      isNew = true;
    }

    ['name', 'abbrev', 'website'].forEach(function(p) {
      if (req.body.hasOwnProperty(p) && req.body[p] != manufacturer[p]) {
        manufacturer[p] = req.body[p];
        isChanged = true;
      }
    });

    if (req.body.aliases) {
      aliases = req.body.aliases.split(/ *,[ ,]*/);
      if (aliases.join() != manufacturer.aliases.join()) {
        manufacturer.aliases = aliases;
        isChanged = true;
      }
    }

    if (req.body.active) {
      if (!manufacturer.active) {
        manufacturer.active = true;
        isChanged = true;
      }
    } else {
      if (manufacturer.active) {
        manufacturer.active = false;
        isChanged = true;
      }
    }

    if (isNew) {
      req.db.Manufacturer.create(new req.db.Manufacturer(manufacturer), req.success(function(updated) {
        res.redirect(303, '/manufacturers/' + updated._id + '/edit.html?result=created');
      }));
    } else if (isChanged) {
      manufacturer.save(req.success(function() {
        res.redirect(303, '/manufacturers/' + manufacturer._id + '/edit.html?result=saved');
      }));
    } else {
      res.redirect(303, '/manufacturers/' + manufacturer._id + '/edit.html?result=unchanged');
    }

    if (isNew || isChanged)
      metadata.flush();
  }));
});


/*
 * Old site compatibility:
 * /manufacturers.html
 * Either manufacturer list or motors for a manufacturer.
 */
router.get(['/manufacturers.shtml'], function(req, res, next) {
  var id = req.query.id;
  if (id && /^[1-9][0-9]?$/.test(id)) {
    // old-style MySQL row ID; go to motor list
    req.db.Manufacturer.findOne({ migratedId: id }, req.success(function(result) {
      if (result)
        res.redirect(301, req.helpers.manufacturerLink(result));
      else
        res.redirect(303, listLink);
    }));
  } else {
    res.redirect(301, listLink);
  }
});

module.exports = router;
