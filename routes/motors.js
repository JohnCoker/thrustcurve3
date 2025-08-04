/*
 * Copyright 2016-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const _ = require('underscore'),
      https = require('https'),
      express = require('express'),
      crypto = require('node:crypto'),
      fileUpload = require('express-fileupload'),
      router = express.Router(),
      errors = require('../lib/errors'),
      metadata = require('../lib/metadata'),
      units = require('../lib/units'),
      helpers = require('../lib/helpers'),
      ranking = require('../database/ranking'),
      parsers = require('../simulate/parsers'),
      analyze = require('../simulate/analyze'),
      graphs = require('../render/graphs'),
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
      var q = req.db.Motor.findOne({ _manufacturer: manufacturer._id,
                                     $or: [
                                       { designation: req.params.desig },
                                       { altDesignation: req.params.desig },
                                     ],
                                   });
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
          getClassCount(req, motor.impulseClass, function(classCount) {
            req.db.MotorCert.count({ _motor: motor._id }, req.success(function(certCount) {
              cb(motor, manufacturer, { classCount, certCount });
            }));
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

const MOTORCATO = 'https://www.motorcato.org';

router.get('/motors/:mfr/:desig/', function(req, res, next) {
  getMotor(req, res, true, true, function(motor, manufacturer, info) {
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

        // edit link on notes
        notes.forEach(n => {
          n.editNoteLink = '/notes/motor/' + n._id + '/edit.html';
        });

        var details = locals(req, defaults, {
          title: req.helpers.motorFullName(manufacturer, motor),
          manufacturer: manufacturer,
          motor: motor,
          certified: motor._certOrg != null && motor._certOrg.abbrev != 'UNC',
          simfiles: simfiles,
          initialThrust: initialThrust,
          notes: notes,
          classCount: info.classCount,
          isCompare: info.classCount >= 5,
          certCount: info.certCount,
          hasCerts: info.certCount > 0,
          isReloadCase: motor.type == 'reload' && motor.caseInfo,
          editLink: req.helpers.motorLink(manufacturer, motor) + 'edit.html',
          certLink: req.helpers.motorLink(manufacturer, motor) + 'cert.html',
          addCertLink: req.helpers.motorLink(manufacturer, motor) + 'addcert.html',
          addNoteLink: '/notes/motor/' + motor._id + '/add.html',
        });
        if (simfiles.length > 0)
          details.thrustCurveLink = req.helpers.motorLink(manufacturer, motor) + 'thrustcurve.svg';

        function finish() {
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
        }

        // get MESS status
        let url = (MOTORCATO + '/api/1/motor?manufacturer=' + encodeURIComponent(manufacturer.name) +
                   '&motor=' + motor.commonName);
        const get = https.get(url, res => {
          if (res.statusCode != 200)
            return finish();
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              let json = JSON.parse(data);
              if (json != null && json.result != null) {
                details.mess = {
                  failureCount: json.result.failureCount,
                  searchUrl: MOTORCATO + json.result.searchURL,
                  reportUrl: (MOTORCATO + '/report?manufacturer=' +
                              encodeURIComponent(json.result.manufacturer) +
                              '&motor=' + encodeURIComponent(json.result.motor) +
                              '&type=' + encodeURIComponent(motor.type)),
                };
                if (req.user != null) {
                  details.mess.reportUrl += ('&name=' + encodeURIComponent(req.user.name) +
                                             '&email=' + encodeURIComponent(req.user.email));
                }
              }
            } catch (e) {}
            finish();
          });
        });
        get.on('error', e => finish())
           .end();
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

router.get('/motors/:mfr/:desig/thrustcurve.svg', function(req, res, next) {
  getMotor(req, res, true, true, function(motor, manufacturer) {
    req.db.SimFile.find({ _motor: motor._id }, undefined, { sort: { updatedAt: -1 } }).exec(req.success(function(simfiles) {
      let data = simfiles.reduce((prev, simfile) => {
        if (prev != null)
          return prev;
        return parsers.parseData(simfile.format, simfile.data, new errors.Collector());
      }, null);
      if (data == null) {
        res.status(400).send('no simfiles to graph');
        return;
      }

      let unit;
      if (req.query && req.query.unit)
        unit = req.query.unit;
      graphs.sendThrustCurve(res, {
        data,
        width: 750,
        height: 450,
        unit: unit,
      });
    }));
  });
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

    // find bounds
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
  // determine the motor statistic
  if (!req.query.stat) {
    res.status(404).send('motor statistic not specified');
    return;
  }

  let stat;
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

  let format;
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
      if (histogram == null) {
        res.status(404).send('too little data for ' + stat);
        return;
      }
      graphs.sendHistogram(res, {
        histogram,
        primary: primary[stat],
        format: format,
      });
    });
  });
});


/*
 * /motors/search.html
 * General motor search, renders with motors/search.hbs template. Note that if a numeric search value is repeated,
 * the values are interpreted as a range.
 */
function doSearch(req, res, params) {
  metadata.getPropellantInfo(req, function(propInfo) {
    metadata.getMotors(req, function(all, available) {
      var query = {},
          sort = { totalImpulse: 1, designation: 1 },
          options,
          hasParams, failed, isFresh, paramNames,
          keys, m, i;

      params = _.extend({}, params);
      hasParams = false;
      failed = false;
      isFresh = true;
      keys = Object.keys(params);
      if (keys.length > 0)
        isFresh = false;
      for (i = 0; i < keys.length; i++) {
        let k = keys[i];
        let v = params[k];
        if (v == null) {
          delete params[k];
          continue;
        }
        let a;
        if (Array.isArray(v)) {
          a = v.filter(e => e.trim() !== '');
          if (a.length == 0) {
            delete params[k];
            continue;
          }
          v = params[k] = a[0].trim();
          if (a.length == 1)
            a = undefined;
        } else {
          v = v.trim();
          if (v === '') {
            delete params[k];
            continue;
          }
        }

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
          let min = 9e9, max = 0;
          if (a) {
            a.forEach(function(v) {
              v = parseFloat(v);
              if (v > 0) {
                if (v > 1)
                  v /= 1000;
                min = Math.min(v, min);
                max = Math.max(v, max);
              } else
                failed = true;
            });
          } else {
            v = parseFloat(v);
            if (v > 0) {
              if (v > 1)
                v /= 1000;
              min = max = v;
            } else
              failed = true;
          }
          query.diameter = { $gt: min - metadata.MotorDiameterTolerance, $lt: max + metadata.MotorDiameterTolerance };

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
          let cn = v.toUpperCase();
          if (metadata.isCommonName(cn))
            query.$or = [ { commonName: cn }, { altName: cn } ];
          else
            query.$text = { $search: v };

        } else if (k == 'availability') {
          if (v == 'available')
            query.availability = { $in: req.db.schema.MotorAvailableEnum };
          else if (v == 'all')
            ; // no restriction
          else
            query.availability = v;

        } else if (k == 'sparky') {
          if (v == 'regular' || v == 'false')
            query.sparky = false;
          else if (v == 'sparky' || v == 'false')
            query.sparky = true;

        } else if (k == 'class1') {
          if (v == 'true' || v == 'on' || v == 'class1')
            query.propellantWeight = { $lte: 0.125 };
          else if (v == 'false' || v == 'off' || v == 'regular')
            query.propellantWeight = { $gt: 0.125 };

        } else if (k == 'hazmatExempt') {
          if (v == 'regular' || v == 'false' || v == 'off')
            query.hazmatExempt = false;
          else if (v == 'exempt' || v == 'true' || v == 'on')
            query.hazmatExempt = true;

        } else if (k == 'csfmApproved') {
          if (v == 'unapproved' || v == 'false' || v == 'off')
            query.csfmApproved = false;
          else if (v == 'approved' || v == 'true' || v == 'on')
            query.csfmApproved = true;

        } else if (req.db.Motor.schema.paths.hasOwnProperty(k)) {
          if (req.db.Motor.schema.paths[k].instance == 'Number') {
            if (a) {
              let min = 9e9, max = 0;
              a.forEach(function(v) {
                v = parseFloat(v);
                if (v > 0) {
                  min = Math.min(v, min);
                  max = Math.max(v, max);
                } else
                  failed = true;
              });
              query[k] = { $gt: min * 0.99, $lt: max * 1.01 };
            } else {
              let op = '=';
              if (/^[<>]/.test(v)) {
                op = v[0];
                v = v.substring(1).trim();
              }
              v = parseFloat(v);
              if (isFinite(v)) {
                if (op == '<')
                  query[k] = { $lt: v * 1.01 };
                else if (op == '>')
                  query[k] = { $gt: v * 0.99 };
                else
                  query[k] = { $gt: v * 0.95, $lt: v * 1.05 };
              } else
                failed = true;
            }
          } else {
            query[k] = v;
          }

        } else if (k == 'flameColor' || k == 'smokeColor') {
          // handle later

        } else {
          delete params[k];
        }
      }

      // apply flame and/or smoke color
      if (query.propellantInfo == null && (params.flameColor || params.smokeColor)) {
        let matches = [];
        propInfo.forEach(info => {
          let match = true;
          if (params.flameColor != null && params.flameColor != info.flameColor)
            match = false;
          if (params.smokeColor != null && params.smokeColor != info.smokeColor)
            match = false;
          if (match)
            matches.push(info.name);
        });
        query.propellantInfo = { $in: matches };
      }

      // see if we have any selective query parameters
      keys = Object.keys(query);
      if (keys.length > 1 || (keys.length == 1 && keys[0] != 'availability'))
        hasParams = true;

      // always initialize radio parameters
      if (!params.hasOwnProperty('sparky'))
        params.sparky = 'all';
      if (!params.hasOwnProperty('class1'))
        params.class1 = 'all';
      if (!params.hasOwnProperty('hazmatExempt'))
        params.hazmatExempt = 'all';
      if (!params.hasOwnProperty('csfmApproved'))
        params.csfmApproved = 'all';
      if (!params.hasOwnProperty('availability')) {
        params.availability = 'available';
        if (hasParams)
          query.availability = { $in: req.db.schema.MotorAvailableEnum };
      }

      // collect query parameter names
      keys = Object.keys(params);
      paramNames = '';
      for (i = 0; i < keys.length; i++) {
        if (i > 0)
          paramNames += ", ";
        paramNames += keys[i].replace(/[A-Z]/, function(l) { return ' ' + l; })
                             .replace(/^[a-z]/, function(l) { return l.toUpperCase(); });
      }

      // set up propellant flame and smoke colors
      function colors(dest, which) {
        const key = which + 'Color';
        let map = new Map();
        propInfo.forEach(info => {
          let v = info[key];
          if (v == null || v === '')
            return;
          let e = map.get(v);
          if (e == null) {
            e = {
              manufacturers: [],
              name: v,
            };
            map.set(v, e);
          }
          let mfr = all.manufacturers.byId(info._manufacturer);
          if (mfr && e.manufacturers.indexOf(mfr.abbrev) < 0)
            e.manufacturers.push(mfr.abbrev);
        });
        map.forEach(e => dest.push(e));
        dest.sort((a, b) => a.name.localeCompare(b.name));
      }
      let flameColors = [], smokeColors = [];
      colors(flameColors, 'flame');
      colors(smokeColors, 'smoke');

      if (failed) {
        res.render('motors/search', locals(req, defaults, {
          title: 'Search Results',
          allMotors: all,
          availableMotors: available,
          flameColors,
          smokeColors,
          params: params,
          multiParams: keys.length > 1,
          paramNames: paramNames,
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
            res.render('motors/search', locals(req, defaults, {
              title: 'Search Results',
              allMotors: all,
              availableMotors: available,
              flameColors,
              smokeColors,
              params: params,
              multiParams: keys.length > 1,
              paramNames: paramNames,
              results: results,
              isFresh: isFresh,
              isSearchDone: true,
              isNoneFound: results.length < 1
            }));
          }
        }));
      } else {
        // render search page without doing query
        res.render('motors/search', locals(req, defaults, {
          title: 'Attribute Search',
          allMotors: all,
          availableMotors: available,
          flameColors,
          smokeColors,
          params: params,
          multiParams: keys.length > 1,
          paramNames: paramNames,
          isFresh: isFresh,
          isSearchDone: false
        }));
      }
    });
  });
}

router.get(searchLink, function(req, res, next) {
  doSearch(req, res, req.query);
});
router.get('/searchpage.jsp', function(req, res, next) {
  res.redirect(301, searchLink);
});
router.get('/cgi-bin/search.pl', function(req, res, next) {
  // minor adjustments to old search
  let query = '';
  Object.keys(req.query).forEach(p => {
    let v = req.query[p];
    if (v == null || v === '' || v === '(all)')
      return;
    if (p === 'class')
      p = 'impulseClass';
    if (p === 'diameter' && /^\d+$/.test(v))
      v = v / 1000;
    query += (query === '' ? '?' : '&') + p + '=' + encodeURIComponent(v);
  });
  res.redirect(301, searchLink + query);
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
        res.render('motors/missingdata', locals(req, defaults, {
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
  let classStat = {
    field: 'impulseClass',
    label: 'Impulse Class',
    missing: 0,
  };
  stats.push(classStat);
  let caseStat = {
    field: 'caseInfo',
    label: 'Motor Case',
    missing: 0,
  };
  stats.push(caseStat);
  let propellantStat = {
    field: 'propellantInfo',
    label: 'Propellant Type',
    missing: 0,
  };
  stats.push(propellantStat);

  // also make sure impulseClass is set
  or.push({ impulseClass: { $not: { $regex: /^[A-O]$/ } } });

  // search for all available motors with a missing or invalid value for any of those stats
  query = {
    $or: or,
    availability: { $in: req.db.schema.MotorAvailableEnum }
  };
  req.db.Motor.find(query, undefined, { sort: { totalImpulse: 1, designation: 1 } })
              .populate('_manufacturer')
              .exec(req.success(function(results) {
    for (let i = 0; i < results.length; i++) {
      let motor = results[i];
      let missing = [];
      let names = '';

      const addMissing = function(stat) {
        missing.push(stat.field);
        stat.missing++;

        if (names !== '')
          names += ', ';
        names += stat.label;
      };

      // numeric stats
      for (let j = 0; j < stats.length; j++) {
        let stat = stats[j];
        let v = motor[stat.field];
        if (stat.min > 0 && (v == null || v < stat.min))
          addMissing(stat);
      }

      // other stats
      if (motor.impulseClass !== motor.commonName.replace(/^[^A-Z]*([A-Z]).*$/, '$1'))
        addMissing(classStat);
      if (motor.type == 'reload' && motor.caseInfo == null)
        addMissing(caseStat);
      if (motor.propellantInfo == null)
        addMissing(propellantStat);

      motor.missingStats = missing;
      motor.missingStatNames = names;
    }

    res.render('motors/missingstats', locals(req, defaults, {
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
      function get(id) {
        if (id == null)
          return;
        id = id.toString();
        for (var k = 0; k < motors.length; k++) {
          if (motors[k]._id.toString() == id)
            return motors[k];
        }
      }
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

      res.render('motors/popular', locals(req, defaults, {
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

      res.render('motors/recent', locals(req, defaults, {
        title: 'Recently Viewed',
        motors: motors,
        impulseClasses: classes,
        suggestClasses: suggestions,
      }));
    }));
  } else {
    res.render('motors/recent', locals(req, defaults, {
      title: 'Recently Viewed',
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
const comp_impulseBurnTimeImg = '/motors/compare-impulseBurnTime.svg',
      comp_impulseAvgThrustImg = '/motors/compare-impulseAvgThrust.svg',
      comp_thrustCurveImg = '/motors/compare-thrustCurve.svg';

function compare(req, res, ids) {
  if (typeof ids === 'string') {
    ids = ids.trim().split(/ *, */);
  }
  if (Array.isArray(ids) && ids.length > 0) {
    let oids = [];
    let mids = [];
    ids.forEach(id => {
      if (req.db.isId(id))
        oids.push(id);
      else if (/^[1-9]\d*/.test(id))
        mids.push(id);
    });
    let q = {};
    if (oids.length > 0 && mids.length > 0) {
      q = { $or: [ { _id: { $in: oids } }, { migratedId: { $in: mids } } ] };
    } else if (mids.length > 0) {
      q = { migratedId: { $in: mids } };
    } else {
      q = { _id: { $in: ids } };
    }
    req.db.Motor.find(q).populate('_manufacturer').exec(req.success(function(motors) {
      var classes = extractClasses(motors),
          query = '?', i;

      for (i = 0; i < motors.length; i++) {
        if (i > 0)
          query += '&';
        query += 'motors=' + motors[i]._id;
      }

      res.render('motors/compare', locals(req, defaults, {
        title: 'Compare Motors',
        motors: motors,
        impulseClasses: classes,
        multiClasses: classes.length > 1,
        singleClass: classes.length == 1 ? classes[0].letter : undefined,
        impulseBurnTimeImg: comp_impulseBurnTimeImg + query,
        impulseAvgThrustImg: comp_impulseAvgThrustImg + query,
        thrustCurveImg: comp_thrustCurveImg + query,
        canCompare: motors.length > 1,
      }));
    }));
  } else {
    res.render('motors/compare', locals(req, defaults, {
      title: 'Compare Motors',
      motors: [],
      impulseClasses: [],
      multiClasses: false,
      canCompare: false,
    }));
  }
}
router.get('/motors/compare.html', function(req, res, next) {
  compare(req, res, req.query.motors);
});
router.post('/motors/compare.html', function(req, res, next) {
  compare(req, res, req.body.motors);
});

router.get(comp_impulseBurnTimeImg, function(req, res, next) {
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

router.get(comp_impulseAvgThrustImg, function(req, res, next) {
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

router.get(comp_thrustCurveImg, function(req, res, next) {
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
          width: 800,
          height: 500,
        });
      }));
    }));
  } else {
    res.status(400).send('no motors to compare');
  }
});


/*
 * /motors/merge.html
 * Merge multiple motors into a single thrust curve.
 */
function merge(req, res, params, submit) {
  delete req.session.mergedId;
  delete req.session.graphData;

  // collect the inputs
  let inputs = [];
  if (params.motors != null && params.motors.length > 0) {
    if (Array.isArray(params.motors)) {
      params.motors.forEach(id => {
        if (req.db.isId(id))
          inputs.push({ motorId: id, count: 1, offset: 0 });
      });
    } else if (req.db.isId(params.motors)) {
      inputs.push({ motorId: params.motors, count: 1, offset: 0 });
    }
  } else {
    let count = parseInt(params.count) || 100;
    for (let i = 0; i <= count; i++) {
      let id = params['motor' + i.toFixed()];
      if (req.db.isId(id)) {
        let count = parseInt(params['count' + i.toFixed()]) || 1;
        let offset = parseFloat(params['offset' + i.toFixed()]) || 0;
        inputs.push({ motorId: id, count, offset });
      }
    }
  }
  inputs.forEach((input, i) => input.n = i + 1)

  // query the motors
  let q = { _id: { $in: inputs.map(i => i.motorId) } };
  req.db.Motor.find(q).populate('_manufacturer').exec(req.success(function(found) {
    const allErrors = [];
    const outputs = {
      title: 'Merge Motors',
      inputs,
      count: inputs.length,
      multiInputs: inputs.length > 1,
      errors: allErrors,
    };
    if (inputs.length < 1 && submit) {
      allErrors.push('No motors selected for merge.');
    }
    let ids = [];
    inputs.forEach(input => {
      input.motor = found.find(m => m._id.toString() == input.motorId);
      if (input.motor == null)
        allErrors.push('Motor ID "' + input.motorId + '" not found.');
      else
        ids.push(input.motor._id);
    });
    if (submit && allErrors.length === 0) {
      req.db.SimFile.find({ _motor: { $in: ids } }, undefined, { sort: { updatedAt: -1 } })
                    .exec(req.success(function(simfiles) {
        inputs.forEach(input => {
          let file = simfiles.find(f => f._motor.toString() == input.motorId);
          if (file == null)
            allErrors.push('No simulator file for ' + input.motor.designation + '.');
          else {
            input.file = file;
            let e = new errors.Collector();
            let parsed = parsers.parseData(file.format, file.data, e);
            if (parsed) {
              input.info = parsed.info;
              input.points = parsed.points;
            } else {
              e.errors.forEach(info => allErrors.push(input.motor.designation + ': ' + info.message + '.'));
            }
          }
        });
        if (allErrors.length === 0) {
          function e(code, msg) {
            allErrors.push('Merge error: ' + msg + '.');
          }
          outputs.merged = parsers.mergeData(inputs, e);
          if (outputs.merged) {
            let graph = graphs.thrustCurve({
              data: outputs.merged,
              width: 750,
              height: 450,
            });
            req.session.mergedId = crypto.randomUUID();
            if (graph) {
              req.session.mergedGraph = graph.render();
              outputs.curveUrl = '/motors/merged/' + req.session.mergedId + '/curve.svg';
            }
            outputs.simfiles = [];
            parsers.AllFormats.forEach(fmt => {
              let file = fmt.print(outputs.merged);
              if (file) {
                req.session['merged' + fmt.format] = file;
                outputs.simfiles.push({
                  format: fmt.format,
                  url: '/motors/merged/' + req.session.mergedId + '/merged' + fmt.extension,
                });
              }
            });
          }
        }
        res.render('motors/merge', locals(req, defaults, outputs));
      }));
    } else {
      res.render('motors/merge', locals(req, defaults, outputs));
    }
  }));
}

router.get('/motors/merge.html', function(req, res, next) {
  merge(req, res, req.query, req.query.submit == 'true');
});
router.post('/motors/merge.html', function(req, res, next) {
  merge(req, res, req.body, true);
});
router.get('/motors/merged/:id/:file', function(req, res, next) {
  const id = req.params.id;
  if (!/^[a-z0-9-]+$/.test(id) || req.session.mergedId != id) {
    res.status(404).end();
    return;
  }

  let file = req.params.file;
  let m;
  if ((m = /^[a-z0-9_-]+\.svg$/.exec(file)) && req.session.mergedGraph) {
    res.type(graphs.SVG)
       .end(req.session.mergedGraph);
    return;
  }
  const fmt = parsers.AllFormats.find(fmt => file.endsWith(fmt.extension));
  if (fmt != null && req.session['merged' + fmt.format]) {
    res.type(fmt.mimeType)
       .set('Content-Disposition', 'attachment; filename="' + file.replace(/^.*\//, '') + '"')
       .end(req.session['merged' + fmt.format]);
    return;
  }
  res.status(404).end();
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

        res.render('motors/updates', locals(req, defaults, {
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
      res.render('motors/edit', locals(req, defaults, {
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
            res.render('motors/edit', locals(req, defaults, {
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
            res.render('motors/edit', locals(req, defaults, {
              title: 'New Motor',
              manufacturer: manufacturer,
              motor: {
                _manufacturer: manufacturer._id,
                availability: 'regular',
              },
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
  let isNew = false, isChanged = false;

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
    if (req.hasBodyProperty(p)) {
      let s = req.body[p].trim();
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
  if (!req.hasBodyProperty('impulseClass') && motor.commonName != null) {
    let cls = motor.commonName.replace(/^(1\/[248])?([A-O]).*$/, '$2');
    if (cls.length == 1 && motor.impulseClass != cls) {
      motor.impulseClass = cls;
      isChanged = true;
    }
  }

  // date values
  [ 'certDate',
  ].forEach(function(p) {
    if (req.hasBodyProperty(p)) {
      let s = req.body[p].trim();
      if (s === '') {
        if (motor[p] != null) {
          motor[p] = undefined;
          isChanged = true;
        }
      } else {
        let d = new Date(s + 'Z')
        if (motor[p] == null || motor[p].toISOString() != d.toISOString().replace(/T.*$/, '')) {
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
    if (req.hasBodyProperty(p)) {
      let s = req.body[p].trim();
      if (s === '') {
        if (motor[p] != null) {
          motor[p] = undefined;
          isChanged = true;
        }
      } else {
        let n = parseValue(s);
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
    if (req.hasBodyProperty(p)) {
      let s = req.body[p].trim();
      if (s === '') {
        if (motor[p] != null) {
          motor[p] = undefined;
          isChanged = true;
        }
      } else {
        let n = parseMMGS(s);
        if (n != motor[p]) {
          motor[p] = n;
          isChanged = true;
        }
      }
    }
  });

  // boolean values
  [ 'delayAdjustable',
    'sparky',
    'hazmatExempt',
    'csfmApproved',
  ].forEach(function(p) {
    if (req.hasBodyProperty(p)) {
      let s = req.body[p].trim();
      let b = s > 0 || s == 'true' || s == 'on';
      if (b !== motor[p]) {
        motor[p] = b;
        isChanged = true;
      }
    } else if (req.hasBodyProperty(p + '-present')) {
      if (motor[p] !== false) {
        motor[p] = false;
        isChanged = true;
      }
    }
  });

  req.db.Manufacturer.findOne({ _id: motor._manufacturer }, req.success(function(manufacturer) {
    let url;
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

/*
 * /motors/:mfr/:desig/cert.html
 * View certification documents.
 */
router.get('/motors/:mfr/:desig/cert.html', function(req, res, next) {
  getMotor(req, res, false, false, function(motor, manufacturer) {
    req.db.MotorCert.find({ _motor: motor._id }, undefined, { sort: { certDate: -1 } })
                    .populate('_contributor _certOrg')
                    .exec(req.success(function(certs) {
      let added;
      if (req.query && req.query.added) {
        certs.forEach(cert => {
          if (cert._id.toString() === req.query.added) {
            cert.added = true;
            added = cert;
          }
        });
      }
      res.render('motors/cert', locals(req, defaults, {
        title: req.helpers.motorFullName(manufacturer, motor) + ' Certification',
        manufacturer: manufacturer,
        motor: motor,
        certs: certs,
        certCount: certs.length,
        hasCerts: certs.length > 0,
        added: added,
        motorLink: req.helpers.motorLink(manufacturer, motor),
        addCertLink: req.helpers.motorLink(manufacturer, motor) + 'addcert.html',
      }));
    }));
  });
});

router.get('/motors/:mfr/:desig/addcert.html', authorized('motors'), function(req, res, next) {
  metadata.get(req, function(caches) {
    getMotor(req, res, false, false, function(motor, manufacturer) {
      res.render('motors/addcert', locals(req, defaults, {
        title: 'Upload Certification Doc.',
        manufacturer: manufacturer,
        motor: motor,
        certOrgs: caches.certOrgs.filter(o => o.abbrev != 'UNC'),
        isErrors: false,
        submitLink: req.helpers.motorLink(manufacturer, motor) + 'addcert.html',
      }));
    });
  });
});

function upload() {
  return fileUpload({
    limits: { fileSize: 500000 },
    abortOnLimit: true,
    debug: false,
  });
}

router.post('/motors/:mfr/:desig/addcert.html', authorized('motors'), upload(), function(req, res, next) {
  metadata.get(req, function(caches) {
    getMotor(req, res, false, false, function(motor, manufacturer) {
      let certOrg, certDate, file, isErrors = false;
      if (!req.hasBodyProperty("certOrg") || (certOrg = caches.certOrgs.byId(req.body.certOrg)) == null)
        isErrors = true;
      if (!req.hasBodyProperty("certDate") || (certDate = new Date(req.body.certDate)) == 'Invalid Date')
        isErrors = true;
      if (req.files == null || req.files.file == null)
        isErrors = true;
      else
        file = req.files.file;
      if (isErrors) {
        res.render('motors/addcert', locals(req, defaults, {
          title: 'Upload Certification Doc.',
          manufacturer: manufacturer,
          motor: motor,
          certOrgs: caches.certOrgs.filter(o => o.abbrev != 'UNC'),
          isErrors: true,
          submitLink: req.helpers.motorLink(manufacturer, motor) + 'addcert.html',
        }));
      } else {
        let cert = new req.db.MotorCert({
          _motor: motor,
          _contributor: req.user,
          _certOrg: certOrg,
          certDate,
          contentType: file.mimetype,
          fileName: file.name,
          content: file.data,
        });
        cert.save(req.success(function(updated) {
          res.redirect(301, req.helpers.motorLink(manufacturer, motor) + 'cert.html?added=' + updated._id);
        }));
      }
    });
  });
});

router.get("/motors/cert/:id/:file", function(req, res, next) {
  let id = req.params.id;
  if (!req.db.isId(id)) {
    res.status(404).send('missing certification ID');
    return;
  }
  req.db.MotorCert.findOne({ _id: id }, req.success(function(cert) {
    if (cert == null) {
      res.status(404).send('unknown certification ID');
      return;
    }
    res.type(cert.contentType)
       .send(cert.content);
  }));
});

module.exports = router;
