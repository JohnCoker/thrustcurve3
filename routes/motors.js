/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var express = require('express'),
    router = express.Router(),
    metadata = require('./metadata.js'),
    locals = require('./locals.js');

var defaults = {
  layout: 'motors',
};

var searchLink = '/motors/search.html';


/*
 * /motors/:mfr/:desig/
 * Specific motor details, renders with motors/details.hbs template.
 */
var classCounts = {};

function getClassCount(req, cls, cb) {
  if (classCounts.hasOwnProperty(cls)) {
    cb(classCounts[cls]);
    return;
  }

  req.db.Motor.count({ impulseClass: cls }, req.success(function(count) {
    classCounts[cls] = count;
    cb(count);
  }));
}

function getMotor(req, res, parents, redirect, cb) {
  req.db.Manufacturer.findOne({ abbrev: req.params.mfr }, req.success(function(manufacturer) {
    if (manufacturer == null) {
      if (redirect)
        res.redirect(303, searchLink);
      else
        res.status(404).send('unknown manufacturer abbreviation ' + req.params.mfr);
    }
    else {
      var q = req.db.Motor.findOne({ _manufacturer: manufacturer._id, designation: req.params.desig });
      if (parents)
        q = q.populate('_relatedMfr _certOrg');
      q.exec(req.success(function(motor) {
        if (motor == null) {
          if (redirect)
            res.redirect(303, searchLink);
          else
            res.status(404).send('unknown motor designation ' + req.params.desig);
        } else {
          // count all the motors in this class
          getClassCount(req, motor.impulseClass, function(count) {
            cb(motor, manufacturer, count);
          });
        }
      }));
    }
  }));
}

router.get('/motors/:mfr/:desig/', function(req, res, next) {
  getMotor(req, res, true, true, function(motor, manufacturer, classCount) {
    req.db.SimFile.find({ _motor: motor._id }, undefined, { sort: { updatedAt: -1 } }).populate('_contributor').exec(req.success(function(simfiles) {
      req.db.MotorNote.find({ _motor: motor._id }, undefined, { sort: { updatedAt: -1 } }).populate('_contributor').exec(req.success(function(notes) {
        res.render('motors/details', locals(defaults, {
          title: manufacturer.abbrev + ' ' + motor.designation,
          manufacturer: manufacturer,
          motor: motor,
          simfiles: simfiles,
          notes: notes,
          classCount: classCount,
          isCompare: classCount >= 5,
          isReloadCase: motor.type == 'reload' && motor.caseInfo,
          editLink: req.helpers.motorLink(manufacturer, motor) + 'edit.html'
        }));
      }));
    }));
  });
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

var classHistograms = {};

function getHistogram(req, cls, stat, cb) {
  var key = cls + ':' + stat;
  if (classHistograms.hasOwnProperty(key)) {
    cb(classHistograms[key]);
    return;
  }

  var q = { impulseClass: cls };
  q[stat] = { $gt: 0 };
  req.db.Motor.find(q, '_id ' + stat, req.success(function(all) {
    var min = all[0][stat], max = all[0][stat],
        range, histogram, v, i, j;

    if (all.length < 3) {
      classHistograms[key] = null;
      cb(null);
      return;
    }

    for (i = 1; i < all.length; i++) {
      v = all[i][stat];
      if (v < min)
        min = v;
      if (v > max)
        max = v;
    }
    range = max - min;
    range += range / 1000;

    // generate histogram
    histogram = {
      cls: cls,
      stat: stat,
      n: all.length >= 50 ? 10 : 5,
      buckets: [],
      minX: min,
      maxX: max,
      rangeX: range,
      count: 0,
      maxY: 0
    };
    for (i = 0; i < histogram.n; i++)
      histogram.buckets[i] = 0;
    for (i = 0; i < all.length; i++) {
      v = all[i][stat];
      j = Math.floor(((v - min) / range) * histogram.n);
      histogram.buckets[j]++;
      if (histogram.buckets[j] > histogram.maxY)
        histogram.maxY = histogram.buckets[j];
      histogram.count++;
    }

    classHistograms[key] = histogram;
    cb(histogram);
  }));
}

router.get('/motors/:mfr/:desig/compare.svg', function(req, res, next) {
  var stat;

  // determine the motor statistic
  if (!req.query.stat) {
    res.status(404).send('motor statistic not specified');
    return;
  }
  if (req.query.stat == 'impulse')
    stat = 'totalImpulse';
  else if (req.query.stat == 'thrust')
    stat = 'avgThrust';
  else if (req.query.stat == 'burn')
    stat = 'burnTime';
  else
    stat = req.query.stat;
  if (!req.db.Motor.schema.paths.hasOwnProperty(stat)) {
    res.status(404).send('unknown motor statistic ' + stat);
    return;
  }

  // load this motor
  getMotor(req, res, false, false, function(primary) {
    // get the histogram for this impulse class and stat
    getHistogram(req, primary.impulseClass, stat, function(histogram) {
      var graph, w, x, x1, y, i;

      if (histogram == null) {
        res.status(404).send('too little data for ' + stat);
        return;
      }

      graph = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 100 100" preserveAspectRatio="none">\n';

      // draw baseline
      graph += '  <line x1="0" y1="99.5" x2="100" y2="99.5" stroke="#ccc" stroke-width="1" />\n';

      // graph histogram
      x = 0;
      w = (100 - (histogram.n - 1)) / histogram.n;
      for (i = 0; i < histogram.n; i++) {
        x1 = x + w;

        if (histogram.buckets[i] > 0) {
          y = 2 + 98 * (histogram.buckets[i] / histogram.maxY);
          graph += '  <rect x="' + x + '" y="' + (100 - y) + '" width="' + w + '" height="' + y + '" fill="#ccc" />\n';
        }

        x = x1 + 1;
      }

      // graph primary motor's value
      if (primary[stat] > 0) {
        x = (100 * (primary[stat] - histogram.minX) / histogram.rangeX) - 0.5;
        graph += '  <line x1="' + x + '" y1="1" x2="' + x + '" y2="99" stroke="#9e1a20" stroke-width="1" />\n';
      }

      graph += '</svg>';
      res.status(200).type('svg').send(graph);
    });
  });
});


/*
 * /motors/search.html
 * General motor search, renders with motors/search.hbs template.
 */
function doSearch(req, res, params) {
  metadata.getMotors(req, function(all, available) {
    var query = {},
        hasParams, failed, isFresh,
        keys, k, v, m, i;

    hasParams = false;
    failed = false;
    isFresh = true;
    if (params) {
      keys = Object.keys(params);
      if (keys.length > 0)
        isFresh = false;
      for (i = 0; i < keys.length; i++) {
        k = keys[i];
        v = params[k];
        if (v == null)
          continue;
        v = v.toString().trim();
        if (v === '')
          continue;

        if (k == 'manufacturer' || k == 'mfr') {
          m = all.manufacturers.byName(v);
          if (m != null)
            query._manufacturer = m._id;
          else
            failed = true;

        } else if (k == 'certOrg' || k == 'cert') {
          m = all.certOrgs.byName(v);
          if (m != null)
            query._certOrg = m._id;
          else
            failed = true;

        } else if (k == 'name') {
          query.$or = [
            { designation: v.toUpperCase() },
            { altDesignation: v.toUpperCase() },
            { commonName: v.toUpperCase() },
            { altName: v.toUpperCase() },
          ];

        } else if (k == 'diameter') {
          v = parseFloat(v);
          if (v > 0) {
            if (v > 1)
              v /= 1000;
            query.diameter = { $gt: v - 0.0015, $lt: v + 0.0015 };
          } else
            failed = true;

        } else if (k == 'availability') {
          if (v == null || v == 'available')
            query.availability = { $in: req.db.schema.MotorAvailableEnum };
          else if (v == 'all')
            ; // no restriction
          else
            query.availability = v;

        } else if (req.db.Motor.schema.paths.hasOwnProperty(k)) {
          if (req.db.Motor.schema.paths[k].instance == 'Number') {
            v = parseFloat(v);
            if (v > 0) {
              query[k] = { $gt: v * 0.95, $lt: v * 1.05 };
            } else
              failed = true;
          } else {
            query[k] = v;
          }
        }
      }

      // see if we have any selective query parameters
      keys = Object.keys(query);
      if (keys.length > 1 || (keys.length == 1 && keys[0] != 'availability'))
        hasParams = true;
    } else {
      params = {};
    }

    // always create an availability parameter
    if (!params.hasOwnProperty('availability'))
      params.availability = 'available';

    if (failed) {
      res.render('motors/search', locals(defaults, {
        title: 'Search Results',
        allMotors: all,
        availableMotors: available,
        params: params,
        results: [],
        isFresh: isFresh,
        isSearchDone: true,
        isNoneFound: true
      }));
    } else if (hasParams) {
      // perform search
      req.db.Motor.find(query, undefined, { sort: { totalImpulse: 1, designation: 1 } }).populate('_manufacturer _relatedMfr').exec(req.success(function(results) {
        if (results.length == 1) {
          res.redirect(303, req.helpers.motorLink(results[0]));
        } else {
          res.render('motors/search', locals(defaults, {
            title: 'Search Results',
            allMotors: all,
            availableMotors: available,
            params: params,
            results: results,
            isFresh: isFresh,
            isSearchDone: true,
            isNoneFound: results.length < 1
          }));
        }
      }));
    } else {
      // render search page without doing query
      res.render('motors/search', locals(defaults, {
        title: 'Attribute Search',
        allMotors: all,
        availableMotors: available,
        params: params,
        isFresh: isFresh,
        isSearchDone: false
      }));
    }
  });
}

router.get(searchLink, function(req, res, next) {
  doSearch(req, res, req.query);
});
router.get('/searchpage.jsp', function(req, res, next) {
  res.redirect(301, searchLink);
});

router.post(searchLink, function(req, res, next) {
  doSearch(req, res, req.body);
});

/*
 * /motors/guide.html
 * General motor guide, renders with motors/guide.hbs template.
 */
router.get('/motors/guide.html', function(req, res, next) {
  res.render('motors/guide', locals(defaults, 'Motor Guide'));
});
router.get(['/guidepage.jsp', '/motorguide.jsp'], function(req, res, next) {
  res.redirect(301, '/motors/guide.html');
});


/*
 * /motors/browser.html
 * Motor browser, renders with motors/browser.hbs template.
 */
router.get('/motors/browser.html', function(req, res, next) {
  res.render('motors/browser', locals(defaults, 'Motor Browser'));
});
router.get(['/browser.shtml', '/browser.jsp'], function(req, res, next) {
  res.redirect(301, '/motors/browser.html');
});


/*
 * /motors/missingdata.html
 * Motors without data, renders with motors/missingdata.hbs template.
 */
router.get('/motors/missingdata.html', function(req, res, next) {
  res.render('motors/missingdata', locals(defaults, 'Motor Without Data'));
});
router.get(['/missingdata.jsp'], function(req, res, next) {
  res.redirect(301, '/motors/missingdata.html');
});


/*
 * /motors/popular.html
 * Most popular motors, renders with motors/popular.hbs template.
 */
router.get('/motors/popular.html', function(req, res, next) {
  res.render('motors/popular', locals(defaults, 'Popular Motors'));
});


/*
 * /motors/updates.html
 * Recent motor updates, renders with motors/updates.hbs template.
 */
router.get('/motors/updates.html', function(req, res, next) {
  res.render('motors/updates', locals(defaults, 'Recent Updates'));
});
router.get(['/updates.jsp'], function(req, res, next) {
  res.redirect(301, '/motors/updates.html');
});


/*
 * /motors/:mfr/:desig/edit.html
 * Edit motor info, renders with motors/edit.hbs template.
 */
function toMMGS(v) {
  if (v == null || typeof v != 'number' || isNaN(v))
    return;
  else
    return v * 1000;
}

router.get('/motors/:mfr/:desig/edit.html', function(req, res, next) {
  metadata.get(req, function(caches) {
    if (!req.params.mfr || req.params.mfr == '-') {
      // create a new motor without a manufacturer
      res.render('motors/edit', locals(defaults, {
        title: 'New Motor',
        motor: { availability: 'regular' },
        isNew: true,
        submitLink: '/motors/-/new/edit.html',
        manufacturers: caches.manufacturers,
        certOrgs: caches.certOrgs,
        allMotors: caches.allMotors,
        schema: req.db.schema
      }));
      return;
    }

    req.db.Manufacturer.findOne({ abbrev: req.params.mfr }, req.success(function(manufacturer) {
      if (manufacturer != null) {
        req.db.Motor.findOne({ _manufacturer: manufacturer._id, designation: req.params.desig }, req.success(function(motor) {
          if (motor) {
            // convert to mm/g/s
            motor.diameter = toMMGS(motor.diameter);
            motor.length = toMMGS(motor.length);
            motor.totalWeight = toMMGS(motor.totalWeight);
            motor.propellantWeight = toMMGS(motor.propellantWeight);

            // edit this data
            res.render('motors/edit', locals(defaults, {
              title: 'Edit ' + motor.designation,
              manufacturer: manufacturer,
              motor: motor,
              isEdit: true,
              submitLink: req.helpers.motorLink(manufacturer, motor) + 'edit.html',
              isCreated: req.query.result == 'created',
              isSaved: req.query.result == 'saved',
              isUnchanged: req.query.result == 'unchanged',
              manufacturers: caches.manufacturers,
              certOrgs: caches.certOrgs,
              allMotors: caches.allMotors,
              schema: req.db.schema
            }));
          } else {
            // create a new motor for this manufacturer
            res.render('motors/edit', locals(defaults, {
              title: 'New Motor',
              manufacturer: manufacturer,
              motor: { availability: 'regular' },
              isNew: true,
              submitLink: '/motors/' + encodeURIComponent(manufacturer.abbrev) + '/new/edit.html',
              manufacturers: caches.manufacturers,
              certOrgs: caches.certOrgs,
              allMotors: caches.allMotors,
              schema: req.db.schema
            }));
          }
        }));
      } else {
        res.redirect(303, '/manufacturers/');
      }
    }));
  });
});

function parseValue(s) {
  var n;
  if (s == null)
    return;
  s = s.trim();
  if (s === '')
    return;

  n = parseFloat(s);
  if (isNaN(n) || n <= 0)
    return;
  else
    return Math.round(n * 100) / 100;
}

function parseMMGS(s) {
  var n;
  if (s == null)
    return;
  s = s.trim();
  if (s === '')
    return;

  n = parseFloat(s);
  if (isNaN(n) || n <= 0)
    return;
  else
    return Math.round(n * 10) / 10000;
}

function doSubmit(req, res, motor) {
  var isNew = false, isChanged = false;

  if (motor == null) {
    motor = {};
    isNew = true;
  }

  // non-numeric values
  [ '_manufacturer',
    '_relatedMfr',
    '_certOrg',
    'designation',
    'altDesignation',
    'commonName',
    'altName',
    'impulseClass',
    'type',
    'delays',
    'certDesignation',
    'caseInfo',
    'propellantInfo',
    'dataSheet',
    'availability',
  ].forEach(function(p) {
    var s;
    if (req.body.hasOwnProperty(p)) {
      s = req.body[p].trim();
      if (s === '') {
        if (motor[p] != null) {
          motor[p] = undefined;
          isChanged = true;
        }
      } else {
        if (motor[p] == null || req.body[p] != motor[p].toString()) {
          motor[p] = req.body[p];
          isChanged = true;
        }
      }
    }
  });

  // date values
  [ 'certDate',
  ].forEach(function(p) {
    var s, d;
    if (req.body.hasOwnProperty(p)) {
      s = req.body[p].trim();
      if (s === '') {
        if (motor[p] != null) {
          motor[p] = undefined;
          isChanged = true;
        }
      } else {
        d = new Date(s);
        if (motor[p] == null || d.toISOString() != d.toISOString()) {
          motor[p] = d;
          isChanged = true;
        }
      }
    }
  });

  // numeric values
  [ 'avgThrust',
    'maxThrust',
    'totalImpulse',
    'burnTime',
    'isp',
  ].forEach(function(p) {
    var s, n;
    if (req.body.hasOwnProperty(p)) {
      s = req.body[p].trim();
      if (s === '') {
        if (motor[p] != null) {
          motor[p] = undefined;
          isChanged = true;
        }
      } else {
        n = parseValue(s);
        if (n != motor[p]) {
          motor[p] = n;
          isChanged = true;
        }
      }
    }
  });

  // numeric values, convert mm/g/s
  [ 'diameter',
    'length',
    'totalWeight',
    'propellantWeight',
  ].forEach(function(p) {
    var s, n;
    if (req.body.hasOwnProperty(p)) {
      s = req.body[p].trim();
      if (s === '') {
        if (motor[p] != null) {
          motor[p] = undefined;
          isChanged = true;
        }
      } else {
        n = parseMMGS(s);
        if (n != motor[p]) {
          motor[p] = n;
          isChanged = true;
        }
      }
    }
  });

  req.db.Manufacturer.findOne({ _id: motor._manufacturer }, req.success(function(manufacturer) {
    var url;
    if (manufacturer)
      url = '/motors/' + encodeURIComponent(manufacturer.abbrev) + '/' + encodeURIComponent(motor.designation) + '/edit.html';
    else
      url = '/motors/-/' + encodeURIComponent(motor.designation) + '/edit.html';
    if (isNew) {
      req.db.Motor.create(new req.db.Motor(motor), req.success(function(updated) {
        res.redirect(303, url + '?result=created');
      }));
    } else {
      if (isChanged) {
        motor.save(req.success(function(updated) {
          res.redirect(303, url + '?result=saved');
        }));
      } else {
        res.redirect(303, url + '?result=unchanged');
      }
    }
  }));
}

router.post('/motors/:mfr/:desig/edit.html', function(req, res, next) {
  console.log(req.body);
  if (req.db.isId(req.body._id)) {
    // edit existing motor
    req.db.Motor.findOne({ _id: req.body._id }, req.success(function(motor) {
      if (motor == null)
        res.redirect(303, searchLink);
      else
        doSubmit(req, res, motor);
    }));
  } else {
    // add new motor
    doSubmit(req, res);
  }
});

module.exports = router;
