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

/*
 * /motors/guide.html
 * Motor guide setup page, renders with guide/entry.hbs or guide/rocket.hbs templates.
 */
function doEntryPage(req, res, rockets) {
  metadata.getAvailableMotors(req, function(available) {
    var lengthUnit = units.getUnitPref('length').label,
        massUnit = units.getUnitPref('mass').label,
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
      schema: schema,
      metadata: available,
      lengthUnits: units.length,
      massUnits: units.mass,
      finishes: metadata.CdFinishes,
      submitLink: guidePage,
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

      submitLink: guidePage,
      editLink: '/mystuff/rocket/' + rocket._id + '/edit.html',
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
    var errors = [], warnings = [], filter = {}, filterCount = 0,
        inputs, mmts, steps, results, totalFit, totalSim, totalFail, totalPass, g, i;

    // collect inputs common to all simulations
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
    Object.freeze(inputs);

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
    filter.availability = { $in: schema.MotorAvailableEnum };
    Object.freeze(filter);

    // collect selected MMT and adapters
    mmts = getMMTs(rocket, req.body.adapters, errors);
    if (mmts == null || mmts.length < 1)
      errors.push('No MMT dimensions and no adapters specified.');

    // count the number of motors that match the filter
    req.db.Motor.count(filter, req.success(function(filterMatch) {
      if (filterMatch < 1)
        errors.push('No motors match the filter criteria.');

      // bail out if we have input errors
      if (errors.length > 0) {
        res.render('guide/failed', locals(req, defaults, {
          title: "Motor Guide",
          rocket: rocket,
          errors: errors,
          warnings: warnings,
          schema: schema,
          metadata: available,
          lengthUnits: units.length,
          massUnits: units.mass,
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
                mmtInputs = _.extend({}, inputs, { rocketMass: inputs.rocketMass + mmt.weight });

                // query all sim files for the motors that fit
                req.db.SimFile.find({ _motor: { $in: _.pluck(motors, '_id') } })
                  .sort({ _motor: 1, updatedAt: -1 })
                  .exec(req.success(function(simfiles) {
                    var motor, result, motorFiles, simmed, data, simInputs, simOutput, simErrors, i, j;

                    // for each motor, get what info we can
                    for (i = 0; i < motors.length; i++) {
                      motor = motors[i];

                      // simulation inputs for this motor
                      simInputs = _.extend({}, mmtInputs, {
                        motorInitialMass: flightsim.motorInitialMass(motor),
                        motorBurnoutMass: flightsim.motorBurnoutMass(motor),
                      });

                      // set up result info
                      result = {
                        _motor: motor._id,
                        mmt: mmt.name,
                        thrustWeight: (motor.avgThrust / flightsim.STP.G) / (mmtInputs.rocketMass + simInputs.motorInitialMass)
                      };

                      // for each motor, run the first simulation we can
                      motorFiles = _.filter(simfiles, function(f) { return f._motor.toString() == motor._id.toString(); });
                      simmed = false;
                      for (j = 0; j < motorFiles.length && !simmed; j++) {
                        // parse the data in the sim file
                        data = parsers.parseData(motorFiles[j].format, motorFiles[j].data, new ErrorCollector());
                        if (data != null) {
                          simErrors = new ErrorCollector();
                          simOutput = flightsim.simulate(simInputs, data, simErrors);
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
          public: !!rocket.public,
          inputs: inputs,
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
 * Motor guide result summary page, renders with guide/summary.hbs.
 */
function loadResults(req, res, cb) {
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
        var m, r, i;

        // complete result elements
        for (i = 0; i < result.results.length; i++) {
          r = result.results[i];

          // set motor and manufacturer
          m = _.find(motors, function(v) { return v._id.toString() == r._motor.toString(); });
          if (m) {
            r.motor = m;
            r.manufacturer = manufacturers.byId(m._manufacturer);
          }

          r.fail = !r.pass;
        }

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
  loadResults(req, res, function(result) {
    var passResults = _.where(result.results, { pass: true });
    res.render('guide/summary', locals(req, defaults, {
      title: "Motor Guide Results",
      rockets: rockets,
      result: result,
      anyResults: result.results.length > 0,
      passResults: passResults,
      detailsLink: '/motors/guide/' + result._id + '/details.html',
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

function doDetailsPage(req, res, rockets) {
  loadResults(req, res, function(result) {
    var adapters = false,
        i;

    for (i = 0; i < result.mmts.length; i++) {
      if (result.mmts[i].adapter)
        adapters = true;
    }

    res.render('guide/details', locals(req, defaults, {
      title: "Motor Guide Details",
      rockets: rockets,
      result: result,
      allResults: result.results,
      multiMMT: result.mmts.length > 1,
      adapters: adapters,
      minGuideVelocity: MinGuideVelocity,
      minThrustWeight: MinThrustWeight,
      summaryLink: '/motors/guide/' + result._id + '/summary.html',
      rocketLink: result.rocket ? '/mystuff/rocket/' + result.rocket._id + '/' : undefined,
      restartLink: result._rocket ? (guidePage + '?rocket=' + result._rocket) : guidePage,
    }));
  });
}

router.get('/motors/guide/:id/details.html', function(req, res, next) {
  if (req.user) {
    req.db.Rocket.find({ _contributor: req.user._id }, undefined, { sort: { name: 1 } }, req.success(function(rockets) {
      doDetailsPage(req, res, rockets);
    }));
  } else {
    doDetailsPage(req, res);
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
