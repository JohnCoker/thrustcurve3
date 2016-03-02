/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      async = require('async'),
      _ = require('underscore'),
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
 * Motor guide execution page, renders with guide/results.hbs.
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
  metadata.get(req, function(caches) {
    var errors = [], warnings = [], filter = {}, filterCount = 0,
        inputs, mmts, steps, results, fitCount, simCount, passCount, failCount, g, i;

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
      if (req.body.classes.length > 1)
        filter.impulseClass = { $in: req.body.classes };
      else
        filter.impulseClass = req.body.classes[0];
    } else if (req.body.class)
      filter.impulseClass = req.body.class;
    if (filter.impulseClass)
      filterCount++;
  
    // add selected motor type(s) to filter
    if (req.body.types && req.body.types.length > 0) {
      if (req.body.types.length > 1)
        filter.type = { $in: req.body.types };
      else
        filter.type = req.body.types[0];
    } else if (req.body.type)
      filter.type = req.body.type;
    if (filter.type)
      filterCount++;
  
    // add selected manufacturer(s) to filter
    if (req.body.manufacturers && req.body.manufacturers.length > 0) {
      if (req.body.manufacturers.length > 1)
        filter._manufacturer = { $in: req.body.manufacturers };
      else
        filter._manufacturer = req.body.manufacturers[0];
    } else if (req.body.manufacturer)
      filter._manufacturer = req.body.manufacturer;
    if (filter._manufacturer)
      filterCount++;
  
    // limit to available motors
    filter.availability = { $in: schema.MotorAvailableEnum };
    Object.freeze(filter);
  
    // collect selected MMT and adapters
    mmts = getMMTs(rocket, req.body.adapters, errors);
    Object.freeze(mmts);
    if (mmts == null || mmts.length < 1)
      errors.push('No MMT dimensions and no adapters specified.');

    // bail out if we have input errors
    if (errors.length > 0) {
      res.render('guide/entry', locals(req, defaults, {
        title: "Motor Guide",
        rocket: rocket,
        errors: errors,
        warnings: warnings,
        schema: schema,
        metadata: caches.availableMotorCache,
        lengthUnits: units.length,
        massUnits: units.mass,
        finishes: metadata.CdFinishes,
        submitLink: guidePage,
        rocketsLink: '/mystuff/rockets.html',
      }));
      return;
    }

    // set up steps to run
    steps = [];
    results = [];
    fitCount = simCount = passCount = failCount = 0;
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
              var mmtInputs;

              fitCount += motors.length;

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
		      mmt: mmt,
		      manufacturer: caches.manufacturers.byId(motor._manufacturer),
		      motor: motor,
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
			  simCount++;
			}
		      }
		    }

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
                      result.fail = true;
                      result.pass = false;
                      failCount++;
                    } else {
                      result.pass = true;
                      result.fail = false;
                      passCount++;
                    }
		    results.push(result);
		  }
		  cb(null, mmt.name);
                }));
            }));
        };
      }());
    }
    steps.push(function(cb) {
      res.render('guide/results', locals(req, defaults, {
        title: "Motor Guide Results",
        rocket: rocket,
        errors: errors,
        warnings: warnings,
        filterCount: filterCount,
        mmtCount: mmts.length,
        fitCount: fitCount,
        simCount: simCount,
        results: results,
        resultCount: results.length,
        failCount: failCount,
        passCount: passCount,
        singleMMT: mmts.length == 1 ? mmts[0].name : undefined,
        restartLink: rocket._id ? (guidePage + '?rocket=' + rocket._id) : guidePage,
      }));
      cb(null, 'sent response');
    });
    async.series(steps);
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
