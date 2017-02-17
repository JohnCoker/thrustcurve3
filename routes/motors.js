/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const _ = require('underscore'),
      express = require('express'),
      router = express.Router(),
      errors = require('../lib/errors'),
      metadata = require('../lib/metadata'),
      units = require('../lib/units'),
      helpers = require('../lib/helpers'),
      ranking = require('../database/ranking'),
      parsers = require('../simulate/parsers'),
      analyze = require('../simulate/analyze'),
      graphs = require('../render/graphs'),
      svg = require('../render/svg'),
      locals = require('./locals.js'),
      authorized = require('./authorized.js');

const MaxViewed = 100,            // maximum recorded in recent views
      LastViewed = MaxViewed / 4; // threshold for de-duping recorded views

const defaults = {
  layout: 'motors',
};

const searchLink = '/motors/search.html';


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

function recordView(req, motor, source) {
  // don't record bot views
  if (req.isBot())
    return;

  // don't record multiple views in quick succession
  var seen = false, i;
  if (req.session.motorsViewed == null)
    req.session.motorsViewed = [];
  else {
    i = req.session.motorsViewed.indexOf(motor._id.toString());
    if (i >= 0) {
      req.session.motorsViewed.splice(i, 1);
      seen = i < LastViewed;
    }
    if (req.session.motorsViewed.length >= MaxViewed)
      req.session.motorsViewed.length = MaxViewed - 1;
  }
  req.session.motorsViewed.splice(0, 0, motor._id.toString());
  req.session.touch();
  if (seen)
    return;

  // guess source if possible
  if (source == null) {
    if (req.query && req.query.source && req.db.schema.MotorViewSourceEnum.indexOf(req.query.source) >= 0)
      // check query parameter (from redirect)
      source = req.query.source;
    else {
      // check referring page to determine source
      var ref = req.header('Referer');
      if (ref) {
        if (/manufacturers\/.*motors\.html/.test(ref))
          source = 'manufacturer';
        else if (/motors\/search\.html/.test(ref))
          source = 'search';
        else if (/motors\/guide\.html/.test(ref))
          source = 'guide';
        else if (/motors\/browser\.html/.test(ref))
          source = 'browser';
        else if (/motors\/popular\.html/.test(ref))
          source = 'popular';
        else if (/mystuff\/favorites\.html/.test(ref))
          source = 'favorite';
        else if (/updates\.html/.test(ref))
          source = 'updates';
      }
    }
  }

  // record this view
  var view = new req.db.MotorView({
    _motor: motor._id,
    _contributor: req.user ? req.user._id : undefined,
    source: source
  });
  req.db.MotorView.create(view);
}

router.get('/motors/:mfr/:desig/', function(req, res, next) {
  getMotor(req, res, true, true, function(motor, manufacturer, classCount) {
    req.db.SimFile.find({ _motor: motor._id }, undefined, { sort: { updatedAt: -1 } }).populate('_contributor').exec(req.success(function(simfiles) {
      req.db.MotorNote.find({ _motor: motor._id }, undefined, { sort: { updatedAt: -1 } }).populate('_contributor').exec(req.success(function(notes) {
        var initialThrust, parsed, stats, n, i;

        // record the motor view
        recordView(req, motor);

        // calculate initial thrust
        if (simfiles.length > 0) {
          initialThrust = 0;
          n = 0;
          for (i = 0; i < simfiles.length; i++) {
            parsed = parsers.parseData(simfiles[i].format, simfiles[i].data, new errors.Collector());
            if (parsed != null) {
              stats = analyze.stats(parsed, null);
              if (stats != null && stats.initialThrust > 0) {
                initialThrust += stats.initialThrust;
                n++;
              }
            }
          }
          if (n > 1)
            initialThrust /= n;
        }

        var details = locals(defaults, {
          title: req.helpers.motorFullName(manufacturer, motor),
          manufacturer: manufacturer,
          motor: motor,
          simfiles: simfiles,
          initialThrust: initialThrust,
          notes: notes,
          classCount: classCount,
          isCompare: classCount >= 5,
          isReloadCase: motor.type == 'reload' && motor.caseInfo,
          editLink: req.helpers.motorLink(manufacturer, motor) + 'edit.html'
        });

        if (req.user) {
          // check if this is a favorite motor
          details.username = req.user.name;
          details.addFavoriteLink = '/mystuff/addfavorite.html?motor=' + motor._id;
          details.removeFavoriteLink = '/mystuff/removefavorite.html?motor=' + motor._id;
          req.db.FavoriteMotor.findOne({ _contributor: req.user._id, _motor: motor._id }, req.success(function(favorite) {
            details.favorite = favorite;
            res.render('motors/details', details);
          }));
        } else {
          // render the motor details (no user)
          res.render('motors/details', details);
        }
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
  var stat, format;

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
  if (stat == 'totalImpulse')
    format = function(v) { return units.formatPrefFromMKS(v, 'force', false) + 's'; };
  else if (/Thrust/.test(stat))
    format = function(v) { return units.formatPrefFromMKS(v, 'force', false); };
  else if (stat == 'burnTime')
    format = helpers.formatDuration;
  else
    format = function(v) { return v.toFixed(); };

  // load this motor
  getMotor(req, res, false, false, function(primary) {
    // get the histogram for this impulse class and stat
    getHistogram(req, primary.impulseClass, stat, function(histogram) {
      var width, height, image, em, descender, w, x, x1, y, i;

      if (histogram == null) {
        res.status(404).send('too little data for ' + stat);
        return;
      }

      width = 200;
      height = 100;
      image = new svg.Image(width, height);

      em = 10;
      descender = 1;
      image.font = em + 'px Helvetica';

      // draw baseline
      image.strokeStyle = '#ccc';
      image.moveTo(0, height - 0.5 - em);
      image.lineTo(width, height - 0.5 - em);
      image.stroke();

      // minimum value on left
      image.fillStyle = 'black';
      image.textAlign = 'left';
      image.fillText(format(histogram.minX), 0, height - descender);

      // maximum value on left
      image.textAlign = 'right';
      image.fillText(format(histogram.maxX), width, height - descender);

      // graph histogram
      image.fillStyle = '#ccc';
      x = 0;
      w = (width - (histogram.n - 1)) / histogram.n;
      for (i = 0; i < histogram.n; i++) {
        x1 = x + w;
        if (histogram.buckets[i] > 0) {
          y = 2 + (height - 2 - em) * (histogram.buckets[i] / histogram.maxY);
          image.fillRect(x, (height - em - y), w, y);
        }
        x = x1 + 1;
      }

      // graph primary motor's value
      if (primary[stat] > 0) {
        image.strokeStyle = '#9e1a20';
        image.beginPath();
        x = 0.5 + ((width - 1) * (primary[stat] - histogram.minX) / histogram.rangeX);
                image.moveTo(x, 1);
        image.lineTo(x, height - 1 - em);
        image.stroke();
      }

      res.status(200).type(image.format).send(image.render());
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
        sort = { totalImpulse: 1, designation: 1 },
        options,
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

        } else if (k == 'designation') {
          v = metadata.toDesignation(v);
          query.$or = [
            { designation: v },
            { altDesignation: v },
          ];

        } else if (k == 'commonName') {
          v = metadata.toCommonName(v);
          query.$or = [
            { commonName: v },
            { altName: v },
          ];

        } else if (k == 'name') {
          query.$or = [
            { designation: metadata.toDesignation(v) },
            { altDesignation: metadata.toDesignation(v) },
            { commonName: metadata.toCommonName(v) },
            { altName: metadata.toCommonName(v) },
          ];

        } else if (k == 'diameter') {
          v = parseFloat(v);
          if (v > 0) {
            if (v > 1)
              v /= 1000;
            query.diameter = { $gt: v - metadata.MotorDiameterTolerance, $lt: v + metadata.MotorDiameterTolerance };
          } else
            failed = true;

        } else if (k == 'impulseClass') {
          v = metadata.toImpulseClass(v);
          query.impulseClass = v;

        } else if (k == 'length') {
          v = parseFloat(v);
          if (v > 0)
            query.length = { $lt: v + metadata.MotorDiameterTolerance };
          else
            failed = true;

        } else if (k == 'text') {
          if (v)
            query.$text = { $search: v };
          else
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
    if (!req.hasParamsProperty('availability')) {
      params.availability = 'available';
      if (hasParams)
        query.availability = { $in: req.db.schema.MotorAvailableEnum };
    }

    if (failed) {
      res.render('motors/search', locals(defaults, {
        title: 'Search Results',
        allMotors: all,
        availableMotors: available,
        params: _.extend({}, params),
        results: [],
        isFresh: isFresh,
        isSearchDone: true,
        isNoneFound: true
      }));
    } else if (hasParams) {
      // perform search
      req.db.Motor.find(query, options).sort(sort).populate('_manufacturer _relatedMfr').exec(req.success(function(results) {
        if (results.length == 1) {
          // record this as a search view
          recordView(req, results[0], 'search');

          // redirect to single result
          res.redirect(303, req.helpers.motorLink(results[0]));
        } else {
          // show multiple search results
          res.render('motors/search', locals(defaults, {
            title: 'Search Results',
            allMotors: all,
            availableMotors: available,
            params: _.extend({}, params),
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
        params: _.extend({}, params),
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
 * /motors/missingdata.html
 * Motors without data, renders with motors/missingdata.hbs template.
 */
router.get('/motors/missingdata.html', function(req, res, next) {
  // get the motor IDs that have data files
  req.db.SimFile.distinct('_motor', req.success(function(ids) {
    // now query all available motors with IDs not in this set
    var query = {
      _id: { $nin: ids },
      availability: { $in: req.db.schema.MotorAvailableEnum }
    };
    req.db.Motor.find(query, undefined, { sort: { totalImpulse: 1, designation: 1 } })
                .populate('_manufacturer')
                .exec(req.success(function(results) {
        res.render('motors/missingdata', locals(defaults, {
          title: 'Motors Without Data',
          results: results,
        }));
      }));
  }));
});
router.get(['/missingdata.jsp'], function(req, res, next) {
  res.redirect(301, '/motors/missingdata.html');
});


/*
 * /motors/missingstats.html
 * Motors with missing statistics, renders with motors/missingstats.hbs template.
 */
const ignoreStats = ['isp'];

router.get('/motors/missingstats.html', function(req, res, next) {
  var or = [], stats = [],
      query, keys, info, c, i;

  // find all numeric statistic elements of motors for which we have a minimum valid value
  keys = Object.keys(req.db.Motor.schema.paths);
  for (i = 0; i < keys.length; i++) {
    if (ignoreStats.indexOf(keys[i]) >= 0)
      continue;

    info = req.db.Motor.schema.paths[keys[i]];
    if (info.instance == 'Number' && info.options.min != null) {
      stats.push({
        field: keys[i],
        label: keys[i][0].toUpperCase() + keys[i].substring(1).replace(/([A-Z])/g, ' $1'),
        min: info.options.min,
        missing: 0,
      });

      if (!info.isRequired) {
        c = {};
        c[info.path] = null;
        or.push(c);
      }

      c = {};
      c[info.path] = { $lt: info.options.min };
      or.push(c);
    }
  }

  // search for all available motors with a missing or invalid value for any of those stats
  query = {
    $or: or,
    availability: { $in: req.db.schema.MotorAvailableEnum }
  };
  req.db.Motor.find(query, undefined, { sort: { totalImpulse: 1, designation: 1 } })
              .populate('_manufacturer')
              .exec(req.success(function(results) {
    var motor, missing, names, stat, v, i, j;

    for (i = 0; i < results.length; i++) {
      motor = results[i];
      missing = [];
      names = '';
      for (j = 0; j < stats.length; j++) {
        stat = stats[j];
        v = motor[stat.field];
        if (v == null || v < stat.min) {
          missing.push(stat.field);
          stat.missing++;

          if (names !== '')
            names += ', ';
          names += stat.label;
        }
      }
      motor.missingStats = missing;
      motor.missingStats.names = names;
    }

    res.render('motors/missingstats', locals(defaults, {
      title: 'Motors Missing Statistics',
      allStats: stats,
      missingStats: _.filter(stats, function(s) { return s.missing > 0; }),
      results: results,
    }));
  }));

});
router.get(['/missingstats.jsp'], function(req, res, next) {
  res.redirect(301, '/motors/missingstats.html');
});


/*
 * /motors/popular.html
 * Most popular motors, renders with motors/popular.hbs template.
 */
router.get('/motors/popular.html', function(req, res, next) {
  ranking.build(req.db, req.success(function(ranking) {
    var motorIds = [],
        p, i;

    // collect all motors needed
    p = ranking.overall;
    for (i = 0; i < p.motors.length; i++) {
      if (motorIds.indexOf(p.motors[i]._motor) < 0)
        motorIds.push(p.motors[i]._motor);
    }
    ranking.categories.forEach(function(p) {
      for (i = 0; i < p.motors.length; i++) {
        if (motorIds.indexOf(p.motors[i]._motor) < 0)
          motorIds.push(p.motors[i]._motor);
      }
    });

    // get all the motors in one query
    req.db.Motor.find({ _id: { $in: motorIds } }).populate('_manufacturer').exec(req.success(function(motors) {
      // populate motors manually
      var get = function(id) {
        if (id == null)
          return;
        id = id.toString();
        for (var k = 0; k < motors.length; k++) {
          if (motors[k]._id.toString() == id)
            return motors[k];
        }
        return id;
      };
      p = ranking.overall;
      for (i = 0; i < p.motors.length; i++) {
        p.motors[i].motor = get(p.motors[i]._motor);
        p.motors[i].rank = i + 1;
      }
      ranking.categories.forEach(function(p) {
        for (i = 0; i < p.motors.length; i++) {
          p.motors[i].motor = get(p.motors[i]._motor);
          p.motors[i].rank = i + 1;
        }
      });

      res.render('motors/popular', locals(defaults, {
        title: 'Popular Motors',
        asOf: ranking.asOf,
        overall: ranking.overall,
        categories: ranking.categories,
      }));
    }));
  }));
});


/*
 * /motors/recent.html
 * Most recently viewed motors, renders with motors/recent.hbs template.
 */
function extractClasses(motors) {
  var counts = {}, classes = [],
      cls, i;

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
        multi: counts[cls] > 1,
      });
    }
  }
  return classes;
}

router.get('/motors/recent.html', function(req, res, next) {
  if (req.session.motorsViewed && req.session.motorsViewed.length > 0) {
    req.db.Motor.find({ _id: { $in: req.session.motorsViewed } })
                .populate('_manufacturer')
                .exec(req.success(function(motors) {
      var classes, suggestions, i;

      // sort and limit length
      for (i = 0; i < motors.length; i++)
        motors[i].recentOrder = req.session.motorsViewed.indexOf(motors[i]._id.toString());
      motors.sort(function(a, b) {
        return a.recentOrder - b.recentOrder;
      });
      if (motors.length > LastViewed)
        motors.length = LastViewed;

      // suggest classes to compare
      classes = extractClasses(motors);
      suggestions = [];
      if (classes.length > 1) {
        for (i = 0; i < classes.length; i++) {
          if (classes[i].count > 2)
            suggestions.push(classes[i]);
        }
        suggestions.sort(function(a,b) {
          if (a.count != b.count)
            return b.count - a.count;
          return a.letter - b.letter;
        });
        if (suggestions.length > 3)
          suggestions.length = 3;
      }

      res.render('motors/recent', locals(defaults, {
        title: 'Most Recently Viewed',
        motors: motors,
        impulseClasses: classes,
        suggestClasses: suggestions,
      }));
    }));
  } else {
    res.render('motors/recent', locals(defaults, {
      title: 'Most Recently Viewed',
      motors: [],
      impulseClasses: [],
      suggestClasses: [],
    }));
  }
});


/*
 * /motors/compare.html
 * Compare different motors, renders with motors/compare.hbs template.
 */
const impulseBurnTimeImg = '/motors/compare-impulseBurnTime.svg',
      impulseAvgThrustImg = '/motors/compare-impulseAvgThrust.svg',
      thrustCurveImg = '/motors/compare-thrustCurve.svg';

function compare(req, res, ids) {
  if (ids && ids.length > 0) {
    req.db.Motor.find({ _id: { $in: ids } }).populate('_manufacturer').exec(req.success(function(motors) {
      var classes = extractClasses(motors),
          query = '?', i;

      for (i = 0; i < motors.length; i++) {
        if (i > 0)
          query += '&';
        query += 'motors=' + motors[i]._id;
      }

      res.render('motors/compare', locals(defaults, {
        title: 'Compare Motors',
        motors: motors,
        impulseClasses: classes,
        multiClasses: classes.length > 1,
        singleClass: classes.length == 1 ? classes[0].letter : undefined,
        impulseBurnTimeImg: impulseBurnTimeImg + query,
        impulseAvgThrustImg: impulseAvgThrustImg + query,
        thrustCurveImg: thrustCurveImg + query,
      }));
    }));
  } else {
    res.render('motors/compare', locals(defaults, {
      title: 'Compare Motors',
      motors: [],
      impulseClasses: [],
      multiClasses: false,
    }));
  }
}
router.get('/motors/compare.html', function(req, res, next) {
  compare(req, res, req.query.motors);
});
router.post('/motors/compare.html', function(req, res, next) {
  compare(req, res, req.body.motors);
});

router.get(impulseBurnTimeImg, function(req, res, next) {
  var ids = req.query.motors;
  if (ids && ids.length > 0) {
    req.db.Motor.find({ _id: { $in: ids } }).select('_id commonName impulseClass totalImpulse burnTime').exec(req.success(function(motors) {
      graphs.sendImpulseComparison(res, {
        motors: motors,
        stat: 'burnTime'
      });
    }));
  } else {
    res.status(400).send('no motors to compare');
  }
});

router.get(impulseAvgThrustImg, function(req, res, next) {
  var ids = req.query.motors;
  if (ids && ids.length > 0) {
    req.db.Motor.find({ _id: { $in: ids } }).select('_id commonName impulseClass totalImpulse avgThrust').exec(req.success(function(motors) {
      graphs.sendImpulseComparison(res, {
        motors: motors,
        stat: 'avgThrust'
      });
    }));
  } else {
    res.status(400).send('no motors to compare');
  }
});

router.get(thrustCurveImg, function(req, res, next) {
  var ids = req.query.motors;
  if (ids && ids.length > 0) {
    req.db.Motor.find({ _id: { $in: ids } }).select('_id commonName burnTime').exec(req.success(function(motors) {
      req.db.SimFile.find({ _motor: { $in: ids } }, undefined, { sort: { updatedAt: -1 } }).exec(req.success(function(simfiles) {
        var i, j;

        for (i = 0; i < motors.length; i++) {
          for (j = 0; j < simfiles.length; j++) {
            if (simfiles[j]._motor.toString() == motors[i]._id.toString()) {
              motors[i].data = parsers.parseData(simfiles[j].format, simfiles[j].data, new errors.Collector());
              break;
            }
          }
        }
        graphs.sendThrustCurveComparison(res, {
          motors: motors,
          width: 600,
          height: 400,
        });
      }));
    }));
  } else {
    res.status(400).send('no motors to compare');
  }
});


/*
 * /motors/updates.html
 * Recent motor updates, renders with motors/updates.hbs template.
 */
router.get('/motors/updates.html', function(req, res, next) {
  metadata.getManufacturers(req, function(manufacturers) {
    req.db.Motor.find({}, undefined, { sort: { updatedAt: -1 } })
                .select('_manufacturer designation type diameter updatedAt')
                .limit(20)
                .exec(req.success(function(motors) {
      req.db.SimFile.find({}, undefined, { sort: { updatedAt: -1 } })
                    .select('_motor _contributor format updatedAt')
                    .limit(20)
                    .populate('_motor _contributor')
                    .exec(req.success(function(simfiles) {
        var i;

        // populate the manufacturers
        for (i = 0; i < motors.length; i++) {
          if (!motors[i].populated('_manufacturer'))
            motors[i]._manufacturer = manufacturers.byId(motors[i]._manufacturer);
        }
        for (i = 0; i < simfiles.length; i++) {
          if (!simfiles[i]._motor.populated('_manufacturer'))
            simfiles[i]._motor._manufacturer = manufacturers.byId(simfiles[i]._motor._manufacturer);
        }

        res.render('motors/updates', locals(defaults, {
          title: 'Recent Updates',
          motors: motors,
          simfiles: simfiles
        }));
      }));
    }));
  });
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

router.get('/motors/:mfr/:desig/edit.html', authorized('motors'), function(req, res, next) {
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
    if (req.hasBodyProperty(p)) {
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
    if (req.hasBodyProperty(p)) {
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
    if (req.hasBodyProperty(p)) {
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
    if (req.hasBodyProperty(p)) {
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

router.post('/motors/:mfr/:desig/edit.html', authorized('motors'), function(req, res, next) {
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
