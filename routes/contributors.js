/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      units = require('../lib/units'),
      metadata = require('../lib/metadata'),
      locals = require('./locals.js');

const defaults = {
  layout: 'info',
};

const listLink = '/contributors/list.html';

/*
 * /contributors/list.html
 * List of all contributors, renders with contributors/list.hbs template.
 */
router.get(listLink, function(req, res, next) {
  req.db.SimFile.aggregate([ { $group: { _id: '$_contributor', count: { $sum: 1 } } } ], req.success(function(results) {
    var ids = [], map = {}, total = 0,
        i;
    for (i = 0; i < results.length; i++) {
      ids.push(results[i]._id);
      map[results[i]._id.toString()] = results[i].count;
      total += results[i].count;
    }
    req.db.Contributor.find({ _id: { $in: ids } }).exec(req.success(function(contributors) {
      var i;
      for (i = 0; i < contributors.length; i++)
        contributors[i].count = map[contributors[i]._id.toString()];
      contributors.sort(function(a, b) {
        if (a.count > b.count)
          return -1;
        if (a.count < b.count)
          return 1;
        if (a.name < b.name)
          return -1;
        if (a.name > b.name)
          return 1;
        return 0;
      });
      res.render('contributors/list', locals(defaults, {
        title: 'Data Contributors',
        contributors: contributors,
        total: total
      }));
    }));
  }));
});
router.get('/contribsearch.jsp', function(req, res, next) {
  res.redirect(301, listLink);
});


/*
 * /contributors/:id/
 * Details of a contributor, renders with contributors/details.hbs template.
 */
router.get('/contributors/:id/', function(req, res, next) {
  var id;
  if (req.db.isId(req.query.id))
    id = req.query.id;
  else if (req.db.isId(req.params.id))
    id = req.params.id;
  else {
    res.render('contributors/details', locals(defaults, 'Contributor Details'));
    return;
  }

  metadata.getManufacturers(req, function(mfrs) {
    req.db.Contributor.findOne({ _id: id }, req.success(function(contributor) {
      if (contributor) {
        req.db.SimFile.find({ _contributor: contributor._id }).populate('_motor').exec(req.success(function(simfiles) {
          var m, i;
          for (i = 0; i < simfiles.length; i++) {
            m = mfrs.byId(simfiles[i]._motor._manufacturer);
            if (m != null)
              simfiles[i]._motor._manufacturer = m;
          }
          req.db.Rocket.find({ _contributor: contributor._id, public: true }, req.success(function(rockets) {
            res.render('contributors/details', locals(defaults, {
              title: contributor.name,
              contributor: contributor,
              simfiles: simfiles,
              rockets: rockets
            }));
          }));
        }));
      } else {
        res.render('contributors/details', locals(defaults, 'Contributor Details'));
      }
    }));
  });
});

/*
 * /contributors/:id/rockets/:id
 * Details of a rocket, renders with mystuff/rocketdetails.hbs template.
 */
router.get('/contributors/:cid/rockets/:rid', function(req, res, next) {
  if (req.db.isId(req.params.cid) && req.db.isId(req.params.rid)) {
    req.db.Rocket.findOne({ _contributor: req.params.cid, _id: req.params.rid }).populate('_contributor').exec(req.success(function(rocket) {
      if (rocket == null) {
        res.redirect(302, listLink);
        return;
      }
      metadata.getRocketMotors(req, rocket, function(fit) {
        res.render('mystuff/rocketdetails', locals(req, defaults, {
          title: rocket.name,
          rocket: rocket,
          mmtDiameter: units.convertUnitToMKS(rocket.mmtDiameter, 'length', rocket.mmtDiameterUnit),
          mmtLength: units.convertUnitToMKS(rocket.mmtLength, 'length', rocket.mmtLengthUnit),
          public: true,

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

          guideLink: '/motors/guide.html'
        }));
      });
    }));
  } else {
    res.redirect(302, listLink);
  }
});

module.exports = router;
