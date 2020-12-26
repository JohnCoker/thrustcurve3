/*
 * Copyright 2016-2020 John Coker for ThrustCurve.org
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
      csv = require('../render/csv'),
      graphs = require('../render/graphs'),
      helpers = require('../lib/helpers'),
      locals = require('./locals.js');

const MinGuideVelocity = 14.9,
      MinThrustWeight = 4.5;

function minAltitude(motor) {
  return 10.0 * (Math.log(motor.totalImpulse) / Math.log(2));
}

const defaults = {
  layout: 'motors',
};

const guidePage = '/motors/guide.html';

// statistics to show in top and compare pages
const RESULT_STATS = [
  {
    get: r => r.simulation.maxAltitude,
    label: 'Altitude',
    format: helpers.formatAltitude,
  },
  {
    get: r => r.simulation.maxVelocity,
    label: 'Velocity',
    format: helpers.formatVelocity,
  },
  {
    get: r => r.simulation.maxAcceleration,
    label: 'Acceleration',
    format: helpers.formatAcceleration,
  },
  {
    get: r => r.simulation.integratedImpulse,
    label: 'Impulse',
    format: helpers.formatImpulse,
  },
  {
    get: r => r.simulation.apogeeTime,
    label: 'Apogee Time',
    format: helpers.formatDuration,
  },
  {
    get: r => r.thrustWeight,
    label: 'Thrust:Weight',
    format: helpers.formatRatio,
  },
  {
    get: r => r.simulation.guideVelocity,
    label: 'Guide Velocity',
    format: helpers.formatVelocity,
  },
  {
    get: r => r.simulation.burnoutTime,
    label: 'Burn Time',
    format: helpers.formatDuration,
  },
  {
    get: r => r.optimalDelay,
    label: 'Coast Time',
    format: helpers.formatDuration,
  },
];
RESULT_STATS[0].first = true;
RESULT_STATS[1].second = true;
RESULT_STATS.forEach((stat, i) => {
  stat.index = i;
  Object.freeze(stat);
});
RESULT_STATS.byLabel = function(name) {
  return this.filter(stat => stat.label.toLowerCase() === name.trim().toLowerCase())[0];
};
Object.freeze(RESULT_STATS);

/*
 * /motors/guide.html
 * Motor guide setup page, renders with guide/entry.hbs or guide/rocket.hbs templates.
 */
function doEntryPage(req, res, rockets) {
  metadata.getAvailableMotors(req, function(available) {
    let q = { public: true };
    if (req.user != null)
      q._contributor = { $ne: req.user._id };
    req.db.Rocket.find(q, undefined, { sort: { updatedAt: -1 } })
                 .populate('_contributor').exec(req.success(function(pubRockets) {
      var lengthUnit = units.getUnitPref('length').label,
          massUnit = units.getUnitPref('mass').label,
          tempUnit = units.getUnitPref('temperature').label,
          altUnit = units.getUnitPref('altitude').label,
          guideDefault = units.defaultGuideLength();

      res.render('guide/entry', locals(req, defaults, {
        title: "Motor Guide",
        rockets: rockets,
        rocket: {
          bodyDiameterUnit: lengthUnit,
          weightUnit: massUnit,
          mmtDiameterUnit: 'mm',
          mmtLengthUnit: lengthUnit,
          cd: 0.6,
          guideLength: guideDefault.value,
          guideLengthUnit: guideDefault.unit,
        },
        conditions: {
          temperature: tempUnit === '℉' ? 75 : 20,
          temperatureUnit: tempUnit,
          altitude: 0,
          altitudeUnit: altUnit,
        },
        schema: schema,
        metadata: available,
        lengthUnits: units.length,
        massUnits: units.mass,
        temperatureUnits: units.temperature,
        altitudeUnits: units.altitude,
        finishes: metadata.CdFinishes,
        submitLink: guidePage,
        rocketsLink: '/mystuff/rockets.html',
        publicCount: pubRockets.length,
        publicRockets: pubRockets,
      }));
    }));
  });
}

function doRocketPage(req, res, rockets, rocket) {
  var mmtDiameter, mmtLength, tempUnit, altUnit, ignoreTypes, ignoreManufacturers;

  mmtDiameter = units.convertUnitToMKS(rocket.mmtDiameter, 'length', rocket.mmtDiameterUnit);
  mmtLength = units.convertUnitToMKS(rocket.mmtLength, 'length', rocket.mmtLengthUnit);
  tempUnit = units.getUnitPref('temperature').label;
  altUnit = units.getUnitPref('altitude').label;
  if (req.user != null && req.user.preferences != null) {
    ignoreTypes = req.user.preferences.ignoreTypes || [];
    ignoreManufacturers = req.user.preferences.ignoreManufacturers || [];
  } else {
    ignoreTypes = [];
    ignoreManufacturers = [];
  }

  metadata.getRocketMotors(req, rocket, function(fit) {
    let editLink;
    if (req.user && req.user._id.toString() == rocket._contributor.toString())
      editLink = '/mystuff/rocket/' + rocket._id + '/edit.html';
    res.render('guide/rocket', locals(req, defaults, {
      title: rocket.name || "motor Guide",
      rockets: rockets,
      rocket: rocket,
      mmtDiameter: mmtDiameter,
      mmtLength: mmtLength,
      fit: fit,
      conditions: {
        temperature: tempUnit === '℉' ? 75 : 20,
        temperatureUnit: tempUnit,
        altitude: 0,
        altitudeUnit: altUnit,
      },
      temperatureUnits: units.temperature,
      altitudeUnits: units.altitude,

      motorCount: fit.count,

      classes: fit.impulseClasses,
      classCount: fit.impulseClasses.length,
      classRange: fit.classRange,

      types: fit.types,
      typeCount: fit.types.length,
      singleType: fit.types.length == 1 ? fit.types[0] : undefined,
      chosenTypes: fit.types.map(t => {
        return {
          value: t,
          selected: ignoreTypes.indexOf(t) < 0,
        };
      }),

      manufacturers: fit.manufacturers,
      manufacturerCount: fit.manufacturers.length,
      singleManufacturer: fit.manufacturers.length == 1 ? fit.manufacturers[0] : undefined,
      chosenManufacturers: fit.manufacturers.map(m => {
        return {
          value: m,
          selected: ignoreManufacturers.indexOf(m.abbrev) < 0,
        };
      }),

      submitLink: guidePage,
      editLink: editLink,
      entryLink: guidePage,
    }));
  });
}

router.get(guidePage, function(req, res, next) {
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
  res.redirect(301, guidePage);
});


/*
 * /motors/guide.html
 * Motor guide execution page, redirects to /motors/guide/id/summary.html.
 */
function getMMTs(rocket, adapters, errors) {
  var mmts = [], main = true,
      d, l, w, n, a, i;

  // add chosen adapters
  if (adapters && adapters.length > 0) {
    main = false;
    for (i = 0; i < adapters.length; i++) {
      n = adapters[i];
      if (n === '' || n == '-') {
        main = true;
      } else {
        a = rocket.adapters[parseInt(n)];
        if (a == null)
          errors.push('Invalid motor adapter selected.');
        else {
          d = units.convertUnitToMKS(a.mmtDiameter, 'length', a.mmtDiameterUnit);
          if (isNaN(d) || d <= 0)
            errors.push('Motor adapter has no MMT diameter.');

          l = units.convertUnitToMKS(a.mmtLength, 'length', a.mmtLengthUnit);
          if (isNaN(l) || l <= 0)
            errors.push('Motor adapter has no MMT length.');

          w = units.convertUnitToMKS(a.weight, 'mass', a.weightUnit);
          if (isNaN(w) || w <= 0)
            errors.push('Motor adapter has no weight.');

          mmts.push({
            name: units.formatUnit(a.mmtDiameter, 'length', a.mmtDiameterUnit) + ' adapter',
            adapter: true,
            diameter: d,
            length: l,
            weight: w
          });
        }
      }
    }
  }

  // add main MMT
  if (main) {
    d = units.convertUnitToMKS(rocket.mmtDiameter, 'length', rocket.mmtDiameterUnit);
    if (isNaN(d) || d <= 0)
      errors.push('Rocket has no MMT diameter.');
    l = units.convertUnitToMKS(rocket.mmtLength, 'length', rocket.mmtLengthUnit);
    if (isNaN(l) || l <= 0)
      errors.push('Rocket has no MMT length.');
    mmts.push({
      name: units.formatUnit(rocket.mmtDiameter, 'length', rocket.mmtDiameterUnit) + ' MMT',
      adapter: false,
      diameter: d,
      length: l,
      weight: 0
    });
  }

  // sort by diameter descending
  if (mmts.length > 1) {
    mmts.sort(function(a, b) {
      return b.diameter - a.diameter;
    });
  }

  return mmts;
}

function doRunGuide(req, res, rocket) {
  // get metadata on available motors
  metadata.getAvailableMotors(req, function(available) {
    var errors = [], warnings = [],
        inputs, cluster, conditions,
        mmts, steps, results, totalFit, totalSim, totalFail, totalPass, g, i;

    // collect rocket inputs
    inputs = {};
    inputs.rocketMass = units.convertUnitToMKS(rocket.weight, 'mass', rocket.weightUnit);
    if (inputs.rocketMass == null || isNaN(inputs.rocketMass) || inputs.rocketMass <= 0)
      errors.push('No rocket dry weight specified.');

    inputs.bodyDiameter = units.convertUnitToMKS(rocket.bodyDiameter, 'length', rocket.bodyDiameterUnit);
    if (inputs.bodyDiameter == null || isNaN(inputs.bodyDiameter) || inputs.bodyDiameter <= 0)
      errors.push('No rocket body diameter specified.');

    inputs.cd = rocket.cd;
    if (inputs.cd == null || isNaN(inputs.cd) || inputs.cd < 0.1)
      errors.push('No rocket coefficient of drag specified.');

    inputs.guideLength = units.convertUnitToMKS(rocket.guideLength, 'length', rocket.guideLengthUnit);
    if (inputs.guideLength == null || isNaN(inputs.guideLength) || inputs.guideLength <= 0) {
      g = units.defaultGuideLength();
      inputs.guideLength = g.mks;
      warnings.push('No guide length specified; using ' + units.formatUnit(g.value, 'length', g.unit) + '.');
    }

    if (rocket.mmtCount > 1.5)
      cluster = inputs.cluster = Math.round(rocket.mmtCount);
    else
      cluster = 1;

    Object.freeze(inputs);

    // collect launch conditions
    conditions = {
      temp: units.convertUnitToMKS(req.body.temperature, 'temperature', req.body.temperatureUnit),
      baseAlt: units.convertUnitToMKS(req.body.altitude, 'altitude', req.body.altitudeUnit),
    };
    if (conditions.temp == null || isNaN(conditions.temp))
      conditions.temp = flightsim.DefaultConditions.temp;
    if (conditions.baseAlt == null || isNaN(conditions.baseAlt))
      conditions.baseAlt = flightsim.DefaultConditions.baseAlt;
    Object.freeze(conditions);

    // collect selected MMT and adapters
    mmts = getMMTs(rocket, req.body.adapters, errors);
    if (mmts == null || mmts.length < 1)
      errors.push('No MMT dimensions and no adapters specified.');

    // build motor filter
    function buildFilter(cb) {
      let filter = {}, filterCount = 0;

      // add selected impulse class(es) to filter
      if (req.body.classes && req.body.classes.length > 0) {
        if (Array.isArray(req.body.classes))
          filter.impulseClass = { $in: req.body.classes };
        else
          filter.impulseClass = req.body.classes;
      } else if (req.body.class)
        filter.impulseClass = req.body.class;
      if (filter.impulseClass)
        filterCount++;
  
      // add selected motor type(s) to filter
      if (req.body.types && req.body.types.length > 0) {
        if (Array.isArray(req.body.types))
          filter.type = { $in: req.body.types };
        else
          filter.type = req.body.types;
      } else if (req.body.type)
        filter.type = req.body.type;
      if (filter.type)
        filterCount++;
  
      // add selected manufacturer(s) to filter
      if (req.body.manufacturers && req.body.manufacturers.length > 0) {
        if (Array.isArray(req.body.manufacturers))
          filter._manufacturer = { $in: req.body.manufacturers };
        else
          filter._manufacturer = req.body.manufacturers;
      } else if (req.body.manufacturer)
        filter._manufacturer = req.body.manufacturer;
      if (filter._manufacturer)
        filterCount++;
  
      // limit to available motors
      if (!req.body.allMotors)
        filter.availability = { $in: schema.MotorAvailableEnum };
  
      // limit to favorites
      if (req.user != null && req.body.favoriteMotors) {
        req.db.FavoriteMotor.find({ _contributor: req.user._id })
                            .exec(req.success(function(favorites) {
          filter._id = { $in: favorites.map(f => f._motor) };
          Object.freeze(filter);
          cb(filter, filterCount);
        }));
      } else {
        Object.freeze(filter);
        cb(filter, filterCount);
      }
    }
    buildFilter((filter, filterCount) => {
      // count the number of motors that match the filter
      req.db.Motor.count(filter, req.success(function(filterMatch) {
        if (filterMatch < 1)
          errors.push('No motors match the filter criteria.');
  
        // bail out if we have input errors
        if (errors.length > 0) {
          res.render('guide/failed', locals(req, defaults, {
            title: "Motor Guide",
            rocket: rocket,
            copnditions: conditions,
            errors: errors,
            warnings: warnings,
            schema: schema,
            metadata: available,
            lengthUnits: units.length,
            massUnits: units.mass,
            temperatureUnits: units.temperature,
            altitudeUnits: units.altitude,
            finishes: metadata.CdFinishes,
            submitLink: guidePage,
            rocketsLink: '/mystuff/rockets.html',
          }));
          return;
        }
  
        // set up steps to run, each producing results
        steps = [];
        results = [];
        totalFit = totalSim = totalFail = totalPass = 0;
  
        // one step per motor mount
        for (i = 0; i < mmts.length; i++) {
          steps.push(function() {
            var mmt = mmts[i];
            return function(cb) {
              var query;
  
              // query all motors that fit this MMT
              query = _.extend({}, filter, {
                diameter: { $gt: mmt.diameter - metadata.MotorDiameterTolerance, $lt: mmt.diameter + metadata.MotorDiameterTolerance },
                length: { $lt: mmt.length + metadata.MotorDiameterTolerance },
              });
              req.db.Motor.find(query)
                .sort({ totalImpulse: 1 })
                .exec(req.success(function(motors) {
                  var mmtInputs, simCount = 0, passCount = 0, failCount = 0;
  
                  // adjust inputs to account for MMT weight (in case of adapter)
                  mmtInputs = _.extend({}, inputs, { rocketMass: inputs.rocketMass + cluster * mmt.weight });
  
                  // query all sim files for the motors that fit
                  req.db.SimFile.find({ _motor: { $in: _.pluck(motors, '_id') } })
                    .sort({ updatedAt: -1 })
                    .exec(req.success(function(simfiles) {
                      var motor, result, motorFiles, simmed, data, simInputs, simOutput, simErrors, i, j;
  
                      // for each motor, get what info we can
                      for (i = 0; i < motors.length; i++) {
                        motor = motors[i];
  
                        // simulation inputs for this motor
                        simInputs = _.extend({}, mmtInputs, {
                          motorInitialMass: cluster * flightsim.motorInitialMass(motor),
                          motorBurnoutMass: cluster * flightsim.motorBurnoutMass(motor)
                        });
  
                        // set up result info
                        result = {
                          _motor: motor._id,
                          mmt: mmt.name,
                          thrustWeight: (cluster * motor.avgThrust / flightsim.GravityMSL) / (mmtInputs.rocketMass + simInputs.motorInitialMass)
                        };
  
                        // for each motor, run the first simulation we can
                        motorFiles = _.filter(simfiles, function(f) { return f._motor.toString() == motor._id.toString(); });
                        simmed = false;
                        for (j = 0; j < motorFiles.length && !simmed; j++) {
                          // parse the data in the sim file
                          data = parsers.parseData(motorFiles[j].format, motorFiles[j].data, new ErrorCollector());
                          if (data != null) {
                            if (cluster > 1)
                              data = analyze.scale(data, cluster);
                            simErrors = new ErrorCollector();
                            simOutput = flightsim.simulate(simInputs, data, conditions, simErrors);
                            if (simOutput != null) {
                              result.simulation = simOutput;
                              if (result.simulation.apogeeTime > result.simulation.burnoutTime)
                                result.optimalDelay = result.simulation.apogeeTime - result.simulation.burnoutTime;
                              simmed = true;
                            }
                          }
                        }
                        if (simmed)
                          simCount++;
  
                        // determine if this motor works or not
                        if (result.simulation) {
                          // simulation; check guide velocity and min altitude
                          if (result.simulation.guideVelocity < MinGuideVelocity)
                            result.reason = 'slow off guide';
                          else if (result.simulation.maxAltitude && result.maxAltitude < minAltitude(motor))
                            result.reason = 'apogee too low';
                        } else {
                          // no simulation; check thrust/weight ratio
                          if (result.ThrustWeight < MinThrustWeight)
                            result.reason = 'thrust:weight';
                        }
                        if (result.reason) {
                          result.pass = false;
                          failCount++;
                        } else {
                          result.pass = true;
                          passCount++;
                        }
                        results.push(result);
                      }
  
                      mmt.fit = motors.length;
                      mmt.sim = simCount;
                      mmt.pass = passCount;
                      mmt.fail = failCount;
  
                      totalFit += motors.length;
                      totalSim += simCount;
                      totalPass += passCount;
                      totalFail += failCount;
  
                      cb(null, mmt.name);
                    }));
                }));
            };
          }());
        }
  
        // save and redirect to summary page
        steps.push(function(cb) {
          var result;
  
          result = new req.db.GuideResult({
            _rocket: rocket._id,
            _contributor: req.user ? req.user._id : undefined,
            public: req.user == null || !!rocket.public,
            inputs: inputs,
            conditions: conditions,
            mmts: mmts,
            warnings: warnings,
            filters: filterCount,
            filtered: filterMatch,
            fit: totalFit,
            sim: totalSim,
            pass: totalPass,
            fail: totalFail,
            results: results
          });
          req.db.GuideResult.create(result, req.success(function(saved) {
            res.redirect('/motors/guide/' + saved._id + '/summary.html');
            cb(null, 'saved');
          }));
        });
        async.series(steps);
      }));
    });
  });
}

router.post(guidePage, function(req, res, next) {
  var entered;

  if (req.db.isId(req.body.rocket)) {
    req.db.Rocket.findOne({ _id: req.body.rocket }, req.success(function(rocket) {
      if (rocket == null)
        res.redirect(guidePage);
      else
        doRunGuide(req, res, rocket);
    }));
  } else {
    // build a rocket from the entered values
    entered = {
      bodyDiameter: parseFloat(req.body.bodyDiameter),
      bodyDiameterUnit: req.body.bodyDiameterUnit,
      weight: parseFloat(req.body.weight),
      weightUnit: req.body.weightUnit,
      mmtDiameter: parseFloat(req.body.mmtDiameter),
      mmtDiameterUnit: req.body.mmtDiameterUnit,
      mmtLength: parseFloat(req.body.mmtLength),
      mmtLengthUnit: req.body.mmtLengthUnit,
      cd: parseFloat(req.body.cd),
      guideLength: parseFloat(req.body.guideLength),
      guideLengthUnit: req.body.guideLengthUnit,
    };

    doRunGuide(req, res, entered);
  }
});

/*
 * /motors/guide/id/summary.html.
 * Motor guide summary results page, renders with guide/summary.hbs.
 */
function loadGuideResult(req, res, cb) {
  if (!req.db.isId(req.params.id)) {
    res.redirect(guidePage);
    return;
  }

  req.db.GuideResult.findOne({ _id: req.params.id }, req.success(function(result) {
    // make sure viewer can access the result
    if (result == null) {
      res.status(404).send();
      return;
    }
    if (!result.public && (req.user == null || req.user._id.toString() != result._contributor.toString())) {
      res.status(403).send();
      return;
    }

    // get metadata on manufacturers
    metadata.getManufacturers(req, function(manufacturers) {
      // get all motors that fit
      req.db.Motor.find({ _id: { $in: _.pluck(result.results, '_motor') } }, req.success(function(motors) {
        // complete result elements
        result.results.forEach(r => {
          // set motor and manufacturer
          let m = _.find(motors, function(v) { return v._id.toString() == r._motor.toString(); });
          if (m) {
            r.motor = m;
            r.manufacturer = manufacturers.byId(m._manufacturer);
          }

          r.fail = !r.pass;
          r.detailsLink = '/motors/guide/' + req.params.id + '/details/' + r._motor.toString();
        });

        // load rocket if there is one
        if (result._rocket) {
          req.db.Rocket.findOne({ _id: result._rocket }, req.success(function(rocket) {
            result.rocket = rocket;
            cb(result);
          }));
        } else {
          cb(result);
        }
      }));
    });
  }));
}

function doSummaryPage(req, res, rockets) {
  loadGuideResult(req, res, function(result) {
    var passResults = _.where(result.results, { pass: true });
    res.render('guide/summary', locals(req, defaults, {
      title: "Motor Guide Results",
      rockets: rockets,
      result: result,
      anyResults: result.results.length > 0,
      passResults: passResults,
      multiDiam: _.uniq(_.map(passResults, r => r.motor.diameter)).length > 1,
      completeLink: '/motors/guide/' + result._id + '/complete.html',
      spreadsheetLink: '/motors/guide/' + result._id + '/spreadsheet.xlsx',
      csvLink: '/motors/guide/' + result._id + '/spreadsheet.csv',
      topLink: '/motors/guide/' + result._id + '/top.html',
      plotLink: '/motors/guide/' + result._id + '/plot.html',
      restartLink: result._rocket ? (guidePage + '?rocket=' + result._rocket) : guidePage,
    }));
  });
}

router.get('/motors/guide/:id/summary.html', function(req, res, next) {
  if (req.user) {
    req.db.Rocket.find({ _contributor: req.user._id }, undefined, { sort: { name: 1 } }, req.success(function(rockets) {
      doSummaryPage(req, res, rockets);
    }));
  } else {
    doSummaryPage(req, res);
  }
});

/*
 * /motors/guide/id/top.html.
 * Motor guide top stats page, renders with guide/top.hbs.
 */
function doTopPage(req, res, rockets) {
  loadGuideResult(req, res, function(result) {
    let tables = [];
    if (result.sim > 1) {
      let simmed = result.results.filter(r => r.pass && r.simulation != null);
      RESULT_STATS.forEach(stat => {
        const max = simmed.reduce((max, one) => {
          let v = stat.get(one);
          return v > max ? v : max;
        }, 0);

        function table(sort) {
          let adjective;
          if (/Time$/.test(stat.label))
            adjective = sort > 0 ? "Longest" : "Shortest";
          else
            adjective = sort > 0 ? "Highest" : "Lowest";

          const sorted = simmed.slice();
          sorted.sort((r1, r2) => {
            const v1 = stat.get(r1),
                  v2 = stat.get(r2);
            if (v1 === v2)
              return 0;
            if (v1 == null)
              return 1;
            if (v2 == null)
              return -1;
            if (v1 < v2)
              return sort;
            if (v1 > v2)
              return -sort;
            return 0;
          });

          let rows = [];
          sorted.forEach((one, i) => {
            if (simmed.length > 12 && i >= 10)
              return;
            let v = stat.get(one);
            if (v == null || !isFinite(v) || v < 0)
              v = 0;
            rows.push({
              index: i,
              _motor: one._motor,
              motor: one.motor,
              detailsLink: '/motors/guide/' + req.params.id + '/details/' + one._motor.toString(),
              manufacturer: one.manufacturer,
              value: v,
              formatted: stat.format(v),
              percent: Math.round(100 * (max > 0 ? v / max : 1)),
            });
          });
          if (sorted.length > 12)
            sorted.length = 10;
          return {
            label: adjective + ' ' + stat.label,
            rows,
            max,
          };
        }

        tables.push(table(1));
        tables.push(table(-1));
      });
    }
    res.render('guide/top', locals(req, defaults, {
      title: "Motor Guide Top Motors",
      rockets: rockets,
      result,
      tables,
      summaryLink: '/motors/guide/' + result._id + '/summary.html',
    }));
  });
}

router.get('/motors/guide/:id/top.html', function(req, res) {
  if (req.user) {
    req.db.Rocket.find({ _contributor: req.user._id }, undefined, { sort: { name: 1 } }, req.success(function(rockets) {
      doTopPage(req, res, rockets);
    }));
  } else {
    doTopPage(req, res);
  }
});

/*
 * /motors/guide/id/plot.html.
 * Motor guide plot motors page, renders with guide/plot.hbs.
 */
function doPlotPage(req, res, rockets) {
  loadGuideResult(req, res, function(result) {
    res.render('guide/plot', locals(req, defaults, {
      title: "Motor Guide Motor Plot",
      rockets: rockets,
      result,
      stats: RESULT_STATS,
      firstStat: RESULT_STATS[0],
      secondStat: RESULT_STATS[1],
      summaryLink: '/motors/guide/' + result._id + '/summary.html',
      chartLink: '/motors/guide/' + result._id + '/plot.svg',
    }));
  });
}

router.get('/motors/guide/:id/plot.html', function(req, res) {
  if (req.user) {
    req.db.Rocket.find({ _contributor: req.user._id }, undefined, { sort: { name: 1 } }, req.success(function(rockets) {
      doPlotPage(req, res, rockets);
    }));
  } else {
    doPlotPage(req, res);
  }
});

router.get('/motors/guide/:id/plot.svg', function(req, res) {
  const xStat = RESULT_STATS.byLabel(req.query.x);
  const yStat = RESULT_STATS.byLabel(req.query.y);
  if (xStat == null || yStat == null) {
    req.status(400).send("invalid x,y statistics");
    return;
  }

  loadGuideResult(req, res, function(result) {
    let title;
    if (result.rocket && result.rocket.name)
      title = result.rocket.name + ' Motor Plot';
    else
      title = 'Motor Guide Plot';

    let points = [];
    if (result.sim > 0) {
      let simmed = result.results.filter(r => r.pass && r.simulation != null);
      simmed.forEach(one => {
        points.push({
          x: xStat.get(one),
          y: yStat.get(one),
          label: one.motor.designation,
          link: one.detailsLink,
        });
      });
    }

    graphs.sendScatter(res, {
      title: title,
      width: 600,
      height: 450,
      xLegend: xStat.label,
      yLegend: yStat.label,
      points: points,
    });
  });
});

/*
 * /motors/guide/id/complete.html.
 * Motor guide complete results page, renders with guide/complete.hbs.
 */
function doCompletePage(req, res, rockets) {
  loadGuideResult(req, res, function(result) {
    var adapters = false,
        i;

    for (i = 0; i < result.mmts.length; i++) {
      if (result.mmts[i].adapter)
        adapters = true;
    }

    res.render('guide/complete', locals(req, defaults, {
      title: "Motor Guide Complete Results",
      rockets: rockets,
      result: result,
      allResults: result.results,
      multiMMT: result.mmts.length > 1,
      adapters: adapters,
      minGuideVelocity: MinGuideVelocity,
      minThrustWeight: MinThrustWeight,
      summaryLink: '/motors/guide/' + result._id + '/summary.html',
      spreadsheetLink: '/motors/guide/' + result._id + '/spreadsheet.xlsx',
      csvLink: '/motors/guide/' + result._id + '/spreadsheet.csv',
      rocketLink: result.rocket ? '/mystuff/rocket/' + result.rocket._id + '/' : undefined,
      restartLink: result._rocket ? (guidePage + '?rocket=' + result._rocket) : guidePage,
    }));
  });
}

router.get('/motors/guide/:id/complete.html', function(req, res, next) {
  if (req.user) {
    req.db.Rocket.find({ _contributor: req.user._id }, undefined, { sort: { name: 1 } }, req.success(function(rockets) {
      doCompletePage(req, res, rockets);
    }));
  } else {
    doCompletePage(req, res);
  }
});

/*
 * /motors/guide/id/details/motorId
 * Motor guide single run details page, renders with guide/details.hbs.
 */
function loadGuideRun(req, res, cb) {
  loadGuideResult(req, res, result => {
    let run;
    if (req.db.isId(req.params.motorId))
      run = result.results.find(r => r._motor.toString() == req.params.motorId);
    if (run == null) {
      res.status(404).send();
      return;
    }
    run.fullResult = result;
    run.rocket = result.rocket;
    cb(run);
  });
}

router.get('/motors/guide/:id/details/:motorId', function(req, res, next) {
  loadGuideRun(req, res, function(run) {
    const comparePrefix = '/motors/guide/' + req.params.id + '/compare/' + req.params.motorId + '/';
    res.render('guide/details', locals(req, defaults, {
      title: "Motor Guide Run Details",
      rocket: run.rocket,
      motor: run.motor,
      manufacturer: run.manufacturer,
      run,
      otherRunCount: run.fullResult.results.length - 1,
      isCompare: run.simulation != null && run.fullResult.sim > 1,
      guideApogeeImg: comparePrefix + 'maxAltitude.svg',
      guideVelocityImg: comparePrefix + 'maxVelocity.svg',
      guideAccelerationImg: comparePrefix + 'maxAcceleration.svg',
      guideWeightImg: comparePrefix + 'loadedInitialMass.svg',
      summaryLink: '/motors/guide/' + req.params.id + '/summary.html',
      completeLink: '/motors/guide/' + req.params.id + '/complete.html',
    }));
  });
});

router.get('/motors/guide/:id/compare/:motorId/:file', function(req, res, next) {
  let stat = req.params.file.replace(/\..*$/, '');
  let units = stat.replace(/^.*([A-Z][a-z]+)$/, '$1').toLowerCase();
  function get(r) {
    if (r.simulation) {
      if (r.simulation.hasOwnProperty(stat))
        return r.simulation[stat];
      if (r.simulation.inputs && r.simulation.inputs.hasOwnProperty(stat))
        return r.simulation.inputs[stat];
    }
  }
  loadGuideRun(req, res, function(run) {
    // find bounds
    let min, max;
    run.fullResult.results.forEach((r, i) => {
      let v = get(r);
      if (v > 0) {
        if (i === 0)
          min = max = v;
        else {
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
      }
    });
    let range = max - min;
    range += range / 1000;

    // generate histogram
    const N = 5;
    let histogram = {
      stat,
      n: N,
      buckets: _.times(N, () => 0),
      minX: min,
      maxX: max,
      rangeX: range,
      count: 0,
      maxY: 0,
    };
    run.fullResult.results.forEach((r, i) => {
      let v = get(r);
      if (v > 0) {
        let j = Math.floor(((v - min) / range) * histogram.n);
        histogram.buckets[j]++;
        if (histogram.buckets[j] > histogram.maxY)
          histogram.maxY = histogram.buckets[j];
        histogram.count++;
      }
    });

    graphs.sendHistogram(res, {
      histogram: histogram,
      primary: get(run),
      units,
    });
  });
});

/*
 * /motors/guide/id/spreadsheet.xlsx.
 * Motor guide result spreadsheet, serves file directly.
 */
router.get('/motors/guide/:id/spreadsheet.xlsx', function(req, res, next) {
  loadGuideResult(req, res, function(result) {
    var rocketSheet = new spreadsheet.Worksheet('rocket'),
        motorsSheet = new spreadsheet.Worksheet('motors'),
	workbook, row, widths, data, r, i;

    // warnings
    row = 0;
    if (result.warnings && result.warnings.length > 0) {
      for (i = 0; i < result.warnings.length; i++) {
	rocketSheet.setString(row, 0, 'warning: ' + result.warnings[i]);
	row++;
      }
      row++;
    }

    // rocket info
    if (result.rocket) {
      rocketSheet.setString(row, 0, 'Rocket Name');
      rocketSheet.setString(row, 1, result.rocket.name);
      row++;
    }

    rocketSheet.setLabel(row, 0, 'Body Diameter', 'length');
    rocketSheet.setUnit(row, 1, result.inputs.bodyDiameter, 'length');
    row++;

    rocketSheet.setLabel(row, 0, 'Dry Weight', 'mass');
    rocketSheet.setUnit(row, 1, result.inputs.rocketMass, 'mass');
    row++;

    rocketSheet.setLabel(row, 0, 'CD');
    rocketSheet.setNumber(row, 1, result.inputs.cd, -2);
    row++;

    rocketSheet.setLabel(row, 0, 'Guide Length', 'length');
    rocketSheet.setUnit(row, 1, result.inputs.guideLength, 'length');
    row++;

    if (result.inputs.cluster > 1) {
      rocketSheet.setLabel(row, 0, 'Cluster');
      rocketSheet.setNumber(row, 1, result.inputs.cluster, 0);
      row++;
    }

    if (result.conditions.temp != null) {
      rocketSheet.setLabel(row, 0, 'Temperature', 'temperature');
      rocketSheet.setUnit(row, 1, result.conditions.temp, 'temperature');
      row++;
    }

    if (result.conditions.baseAlt != null) {
      rocketSheet.setLabel(row, 0, 'Launch Elevation', 'altitude');
      rocketSheet.setUnit(row, 1, result.conditions.baseAlt, 'altitude');
      row++;
    }

    rocketSheet.setLabel(row, 0, 'Motors Searched');
    rocketSheet.setNumber(row, 1, result.filtered, 0);
    row++;

    rocketSheet.setLabel(row, 0, 'Date Run');
    rocketSheet.setDate(row, 1, result.updatedAt);
    row++;

    // MMTs
    row++;
    rocketSheet.setLabel(row, 0, 'MMT');
    rocketSheet.setLabel(row, 1, 'Diameter ', 'mmt');
    rocketSheet.setLabel(row, 2, 'Length', 'length');
    rocketSheet.setLabel(row, 3, 'Fit');
    rocketSheet.setLabel(row, 4, 'Sim');
    rocketSheet.setLabel(row, 5, 'Pass');
    rocketSheet.setLabel(row, 6, 'Fail');
    row++;
    for (i = 0; i < result.mmts.length; i++) {
      if (result.inputs.cluster > 1)
        rocketSheet.setString(row, 0, result.mmts[i].name + ' ×' + result.inputs.cluster.toFixed());
      else
        rocketSheet.setString(row, 0, result.mmts[i].name);
      rocketSheet.setUnit  (row, 1, result.mmts[i].diameter, 'mmt');
      rocketSheet.setUnit  (row, 2, result.mmts[i].length, 'length');
      rocketSheet.setNumber(row, 3, result.mmts[i].fit, 0);
      rocketSheet.setNumber(row, 4, result.mmts[i].sim, 0);
      rocketSheet.setNumber(row, 5, result.mmts[i].pass, 0);
      rocketSheet.setNumber(row, 6, result.mmts[i].fail, 0);
      row++;
    }
    if (result.mmts.length > 1) {
      rocketSheet.setString(row, 0, 'total');
      rocketSheet.setNumber(row, 3, result.fit, 0);
      rocketSheet.setNumber(row, 4, result.sim, 0);
      rocketSheet.setNumber(row, 5, result.pass, 0);
      rocketSheet.setNumber(row, 6, result.fail, 0);
      row++;
    }

    rocketSheet.setColWidths(15, 15, 15, 8, 8, 8, 8);

    // motor results
    row = 0;
    motorsSheet.setLabel(row,  0, 'Designation');
    motorsSheet.setLabel(row,  1, 'Manufacturer');
    motorsSheet.setLabel(row,  2, 'Diameter');
    motorsSheet.setLabel(row,  3, 'Weight', 'mass');
    motorsSheet.setLabel(row,  4, 'T:W');
    motorsSheet.setLabel(row,  5, 'Liftoff', 'duration');
    motorsSheet.setLabel(row,  6, 'Guide', 'velocity');
    motorsSheet.setLabel(row,  7, 'Burnout', 'altitude');
    motorsSheet.setLabel(row,  8, 'Burnout', 'duration');
    motorsSheet.setLabel(row,  9, 'Apogee', 'altitude');
    motorsSheet.setLabel(row, 10, 'Apogee', 'duration');
    motorsSheet.setLabel(row, 11, 'Velocity', 'velocity');
    motorsSheet.setLabel(row, 12, 'Accel', 'acceleration');
    motorsSheet.setLabel(row, 13, 'Delay', 'duration');
    motorsSheet.setLabel(row, 14, 'Result');
    row++;

    for (i = 0; i < result.results.length; i++) {
      r = result.results[i];
      motorsSheet.setString(row,  0, r.motor.designation);
      motorsSheet.setString(row,  1, r.manufacturer.abbrev);
      motorsSheet.setUnit  (row,  2, r.motor.diameter, 'mmt');

      motorsSheet.setNumber(row,  4, r.thrustWeight, 1);
      if (r.simulation) {
        motorsSheet.setUnit  (row,  3, r.simulation.inputs.loadedInitialMass, 'mass');
        motorsSheet.setNumber(row,  5, r.simulation.liftoffTime, 2);
        motorsSheet.setUnit  (row,  6, r.simulation.guideVelocity, 'velocity');
        motorsSheet.setUnit  (row,  7, r.simulation.burnoutAltitude, 'altitude');
        motorsSheet.setNumber(row,  8, r.simulation.burnoutTime, 1);
        motorsSheet.setUnit  (row,  9, r.simulation.maxAltitude, 'altitude');
        motorsSheet.setNumber(row, 10, r.simulation.apogeeTime, 1);
        motorsSheet.setUnit  (row, 11, r.simulation.maxVelocity, 'velocity');
        motorsSheet.setUnit  (row, 12, r.simulation.maxAcceleration, 'acceleration');
      }
      motorsSheet.setNumber(row, 13, r.optimalDelay, 1);
      motorsSheet.setString(row, 14, r.reason || 'good');
      row++;
    }

    widths = [15, 15, 15];
    for (i = 0; i < 11; i++)
      widths.push(10);
    widths.push(20);
    motorsSheet.setColWidths(widths);

    // entire workbook
    workbook = new spreadsheet.Workbook({
      sheets: [rocketSheet, motorsSheet]
    });
    data = workbook.produce();

    res.type(workbook.mimeType)
       .append('Last-Modified', result.updatedAt)
       .attachment('motorguide.xlsx')
       .end(data, 'binary');
  });
});

/*
 * /motors/guide/id/spreadsheet.csv.
 * Motor guide result spreadsheet, serves file directly.
 */
router.get('/motors/guide/:id/spreadsheet.csv', function(req, res, next) {
  loadGuideResult(req, res, function(result) {
    var file = new csv.File(),
	text, r, i;

    file.colLabel('Designation');
    file.colLabel('Manufacturer');
    file.colLabel('MMT');
    file.colLabel('Weight', 'mass');
    file.colLabel('T:W');
    file.colLabel('Liftoff', 'duration');
    file.colLabel('Guide', 'velocity');
    file.colLabel('Burnout', 'altitude');
    file.colLabel('Burnout', 'duration');
    file.colLabel('Apogee', 'altitude');
    file.colLabel('Apogee', 'duration');
    file.colLabel('Velocity', 'velocity');
    file.colLabel('Accel', 'acceleration');
    file.colLabel('Delay', 'duration');
    file.colLabel('Result');
    file.row();

    for (i = 0; i < result.results.length; i++) {
      r = result.results[i];
      file.col(r.motor.designation);
      file.col(r.manufacturer.abbrev);
      file.col(r.mmt);

      if (r.simulation)
        file.colUnit(r.simulation.inputs.loadedInitialMass, 'mass');
      file.colNumber(r.thrustWeight, 1);
      if (r.simulation) {
        file.colNumber(r.simulation.liftoffTime, 2);
        file.colUnit  (r.simulation.guideVelocity, 'velocity');
        file.colUnit  (r.simulation.burnoutAltitude, 'altitude');
        file.colNumber(r.simulation.burnoutTime, 1);
        file.colUnit  (r.simulation.maxAltitude, 'altitude');
        file.colNumber(r.simulation.apogeeTime, 1);
        file.colUnit  (r.simulation.maxVelocity, 'velocity');
        file.colUnit  (r.simulation.maxAcceleration, 'acceleration');
      }
      file.colNumber(r.optimalDelay, 1);
      file.col(r.reason || 'good');
      file.row();
    }

    text = file.produce();
    res.type(file.mimeType)
       .append('Last-Modified', result.updatedAt)
       .attachment('motorguide.csv')
       .end(text);
  });
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
