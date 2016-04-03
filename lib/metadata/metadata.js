/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const schema = require('../../database/schema'),
      units = require('../../lib/units');

const MotorDiameterTolerance = 0.0015;

var manufacturerCache, certOrgCache,
    allMotorCache, availableMotorCache;

function deepFreeze(o) {
  var keys, k, i;

  if (Array.isArray(o)) {
    for (i = 0; i < o.length; i++)
      deepFreeze(o[i]);
  }

  keys = Object.keys(o);
  for (i = 0; i < o.length; i++) {
    k = keys[i];
    if (typeof o[k] == 'object')
      deepFreeze(o[k]);
  }

  Object.freeze(o);
}

const CdFinishes = [
  { label: 'perfect', value: 0.3 },
  { label: 'good', value: 0.45 },
  { label: 'average', value: 0.6 },
  { label: 'high', value: 1.0, last: true },
];
deepFreeze(CdFinishes);

function MetadataCache() {
  this.manufacturers = [];
  this.certOrgs = [];
  this.types = [];
  this.diameters = [];
  this.impulseClasses = [];
  this.burnTimes = [];
  this.propellants = [];
  this.cases = [];
  this.count = 0;
}
MetadataCache.prototype.add = function(motor) {
  var v;

  // add the manufacturer
  v = manufacturerCache.byId(motor._manufacturer);
  if (v && this.manufacturers.indexOf(v) < 0)
    this.manufacturers.push(v);

  // add the certOrg
  v = certOrgCache.byId(motor._certOrg);
  if (v && this.certOrgs.indexOf(v) < 0)
    this.certOrgs.push(v);

  // add the type
  v = motor.type;
  if (v && this.types.indexOf(v) < 0)
    this.types.push(v);

  // add the diameter
  v = motor.diameter;
  if (v > 0 && this.diameters.indexOf(v) < 0)
    this.diameters.push(v);

  // add the impulse class
  v = motor.impulseClass;
  if (v && this.impulseClasses.indexOf(v) < 0)
    this.impulseClasses.push(v);

  // add the burn time
  v = burnTimeGroup(motor.burnTime);
  if (v && this.burnTimes.indexOf(v.nominal) < 0)
    this.burnTimes.push(v.nominal);

  // add the propellant
  v = motor.propellantInfo;
  if (v && !/[,:(]/.test(v) && this.propellants.indexOf(v) < 0)
    this.propellants.push(v);

  // add the case
  if (motor.type != 'SU') {
    v = motor.caseInfo;
    if (v && this.cases.indexOf(v) < 0)
	this.cases.push(v);
  }

  this.count++;
};
MetadataCache.prototype.organize = function() {
  var i;

  // sort manufacturers by name
  this.manufacturers.sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });
  this.manufacturers.byId = manufacturerCache.byId;
  this.manufacturers.byName = manufacturerCache.byName;

  // sort cert orgs by name
  this.certOrgs.sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });
  this.certOrgs.byId = certOrgCache.byId;
  this.certOrgs.byName = certOrgCache.byName;

  // sort types by schema order
  this.types.sort(function(a,b) {
    return schema.MotorTypeEnum.indexOf(a) - schema.MotorTypeEnum.indexOf(b);
  });

  // sort diameters and remove off-by-one values
  this.diameters.sort(function(a, b) {
    return a - b;
  });
  i = 1;
  while (i < this.diameters.length) {
    if (this.diameters[i] < this.diameters[i - 1] + 0.0015)
      this.diameters.splice(i, 1);
    else
      i++;
  }

  // sort impulse classes
  this.impulseClasses.sort();

  // sort burn times
  this.burnTimes.sort();

  // display summary of impulse classes
  if (this.impulseClasses.length > 2)
    this.classRange = this.impulseClasses[0] + '−' + this.impulseClasses[this.impulseClasses.length - 1];
  else if (this.impulseClasses.length > 1)
    this.classRange = this.impulseClasses[0] + '&' + this.impulseClasses[1];
  else if (this.impulseClasses.length > 0)
    this.classRange = this.impulseClasses[0];
  else
    this.classRange = '—';

  // sort propellants
  this.propellants.sort();

  // sort cases
  this.cases.sort();

  deepFreeze(this);
};

function getManufacturers(req, cb) {
  if (manufacturerCache != null) {
    cb(manufacturerCache);
  } else {
    req.db.Manufacturer.find({}, undefined, { sort: { name: 1 } }, req.success(function(results) {
      manufacturerCache = results;

      manufacturerCache.byId = function(v) {
        if (v == null)
          return;
        v = v.toString();
        for (var i = 0; i < this.length; i++) {
          if (this[i]._id.toString() == v.toString())
            return this[i];
        }
      };

      manufacturerCache.byName = function(v) {
        if (v == null)
          return;
        v = v.toString();
        for (var i = 0; i < this.length; i++) {
          if (this[i].name == v || this[i].abbrev == v || this[i].aliases.indexOf(v) >= 0)
            return this[i];
        }
      };

      deepFreeze(manufacturerCache);
      cb(manufacturerCache);
    }));
  }
}

function getCertOrgs(req, cb) {
  if (certOrgCache != null) {
    cb(certOrgCache);
  } else {
    req.db.CertOrg.find({}, undefined, { sort: { name: 1 } }, req.success(function(results) {
      certOrgCache = results;

      certOrgCache.byId = function(v) {
        if (v == null)
          return;
        v = v.toString();
        for (var i = 0; i < this.length; i++) {
          if (this[i]._id.toString() == v.toString())
            return this[i];
        }
      };

      certOrgCache.byName = function(v) {
        if (v == null)
          return;
        v = v.toString();
        for (var i = 0; i < this.length; i++) {
          if (this[i].name == v || this[i].abbrev == v)
            return this[i];
        }
      };

      deepFreeze(certOrgCache);
      cb(certOrgCache);
    }));
  }
}

function loadMotorCaches(req, cb) {
  getManufacturers(req, function() {
    getCertOrgs(req, function() {
      req.db.Motor.find({}, req.success(function(motors) {
        var all = new MetadataCache(),
            available = new MetadataCache(),
            motor, i;

        for (i = 0; i < motors.length; i++) {
          motor = motors[i];
          all.add(motor);
          if (motor.isAvailable)
            available.add(motor);
        }
        all.organize();
        available.organize();

        allMotorCache = all;
        availableMotorCache = available;

        cb();
      }));
    });
  });
}

function getAllMotors(req, cb) {
  if (allMotorCache != null) {
    cb(allMotorCache);
  } else {
    loadMotorCaches(req, function() {
      cb(allMotorCache);
    });
  }
}

function getAvailableMotors(req, cb) {
  if (availableMotorCache != null) {
    cb(availableMotorCache);
  } else {
    loadMotorCaches(req, function() {
      cb(availableMotorCache);
    });
  }
}

function getMotors(req, cb) {
  if (allMotorCache != null && availableMotorCache != null) {
    cb(allMotorCache, availableMotorCache);
  } else {
    loadMotorCaches(req, function() {
      cb(allMotorCache, availableMotorCache);
    });
  }
}

function get(req, cb) {
  getMotors(req, function() {
    cb({
      manufacturers: manufacturerCache,
      certOrgs: certOrgCache,
      allMotors: allMotorCache,
      availableMotors: availableMotorCache
    });
  });
}

function flush() {
  manufacturerCache = undefined;
  allMotorCache = undefined;
  availableMotorCache = undefined;
}

function getRocketMotors(req, rocket, cb) {
  get(req, function(caches) {
    var fit = new MetadataCache(),
	mmtDiameter, mmtLength, query, i;

    if (rocket == null) {
      cb(fit);
      return;
    }

    // construct a query that matches the rocket's MMT and adapters
    mmtDiameter = units.convertUnitToMKS(rocket.mmtDiameter, 'length', rocket.mmtDiameterUnit);
    mmtLength = units.convertUnitToMKS(rocket.mmtLength, 'length', rocket.mmtLengthUnit);
    query = {
      diameter: { $gt: mmtDiameter - MotorDiameterTolerance, $lt: mmtDiameter + MotorDiameterTolerance },
      length: { $lt: mmtLength + MotorDiameterTolerance },
      availability: { $in: schema.MotorAvailableEnum }
    };
    if (rocket.adapters && rocket.adapters.length > 0) {
      query.$or = [ {
	diameter: query.diameter,
	length: query.length
      } ];
      delete query.diameter;
      delete query.length;
      for (i = 0; i < rocket.adapters.length; i++) {
	mmtDiameter = units.convertUnitToMKS(rocket.adapters[i].mmtDiameter, 'length', rocket.adapters[i].mmtDiameterUnit);
	mmtLength = units.convertUnitToMKS(rocket.adapters[i].mmtLength, 'length', rocket.adapters[i].mmtLengthUnit);
	query.$or.push({
	  diameter: { $gt: mmtDiameter - MotorDiameterTolerance, $lt: mmtDiameter + MotorDiameterTolerance },
	  length: { $lt: mmtLength + MotorDiameterTolerance },
	});
      }
    }
    req.db.Motor.find(query)
      .sort({ totalImpulse: 1 })
      .exec(req.success(function(motors) {
	for (var i = 0; i < motors.length; i++)
	  fit.add(motors[i]);
	fit.organize();
	cb(fit);
      }));
  });
}

function getMatchingMotors(req, query, cb) {
  get(req, function(caches) {
    var match = new MetadataCache();

    if (query == null) {
      cb(match);
      return;
    }

    req.db.Motor.find(query)
      .sort({ totalImpulse: 1 })
      .exec(req.success(function(motors) {
	for (var i = 0; i < motors.length; i++)
	  match.add(motors[i]);
	match.organize();
	cb(match, motors);
      }));
  });
}

const burnTimeGroups = [
  { nominal: 0.25, label: "¼s", min: 0.0,  max: 0.35 },
  { nominal: 0.5,  label: "½s", min: 0.35, max: 0.66 },
  { nominal: 0.75, label: "¾s", min: 0.65, max: 0.85 },
];
(function() {
  var i, last, max;

  last = burnTimeGroups[burnTimeGroups.length - 1].max;
  for (i = 1; i < 7; i++) {
    max = i + 0.5;
    burnTimeGroups.push({ nominal: i, label: i.toFixed() + 's', min: last, max: max });
    last = max;
  }
  burnTimeGroups.push({ nominal: 7, label: '7s+', min: last, max: Infinity });
})();
deepFreeze(burnTimeGroups);

function burnTimeGroup(v) {
  var i;

  if (typeof v != 'number' || !isFinite(v) || v <= 0)
    return;

  for (i = 0; i < burnTimeGroups.length - 1; i++) {
    if (v <= burnTimeGroups[i + 1].min)
      return burnTimeGroups[i];
  }

  return burnTimeGroups[burnTimeGroups.length - 1];
}

function toDesignation(s) {
  if (s == null || s === '')
    return;
  s = s.toUpperCase();
  s = s.replace(/[^A-Z0-9_.\/-]+/g, '_');
  return s;
}

function toCommonName(s) {
  if (s == null || s === '')
    return;
  s = s.toUpperCase();
  return s.replace(/^([0-9]*[ -]*)?([A-Z][0-9.]+).*$/, '$2');
}

function toImpulseClass(s) {
  if (s == null || s === '')
    return;
  s = s.toUpperCase();
  return s.replace(/^1\/[248]A$/, 'A');
}

/**
 * <p>The metadata module collects and caches information about all motors which makes
 * it easier to build search pages and avoid querying for mostly unchanging info.</p>
 *
 * <p>Note that anything which edits motors and manufacturers should clear the metadata
 * caches by calling <code>flush</code>.</p>
 *
 * <p>And yes, that is caches, plural, since keep metadata for both all motors and only
 * currently available motors.</p>
 *
 * <p>All these functions take a <code>req</code> object which is the Express request object,
 * enhanced for querying the database by <code>app.js</code> for all routes.
 * The loaded metadata is passed to the callback function.</p>
 *
 * @module metadata
 */
module.exports = {
  /**
   * The amount above or below the stated value to match motor diameters in meters.
   * @member {number}
   */
  MotorDiameterTolerance: MotorDiameterTolerance,

  /**
   * Load the cache of all manufacturers (active and inactive).
   * @function
   * @param {object} req request instance
   * @param {function} callback made when manufacturers are loaded
   */
  getManufacturers: getManufacturers,

  /**
   * Load the cache of all certification organizations.
   * @function
   * @param {object} req request instance
   * @param {function} callback made when cert orgs are loaded
   */
  getCertOrgs: getCertOrgs,

  /**
   * Load the cache of metadata for all motors (including unavailable ones).
   * @function
   * @param {object} req request instance
   * @param {function} callback made when metadata is loaded
   */
  getAllMotors: getAllMotors,

  /**
   * Load the cache of metadata for currently available motors.
   * @function
   * @param {object} req request instance
   * @param {function} callback made when metadata is loaded
   */
  getAvailableMotors: getAvailableMotors,

  /**
   * Load both caches of motor metadata.
   * @function
   * @param {object} req request instance
   * @param {function} callback made when metadata is loaded
   */
  getMotors: getMotors,

  /**
   * Load all caches and return an object with each one as a property.
   */
  get: get,

  /**
   * Flush the cache, such as when motors or manufacturers are edited.
   * @function
   */
  flush: flush,

  /**
   * The list of CD "finish" values.
   * @member {object[]}
   */
  CdFinishes: CdFinishes,

  /**
   * Load metadata about motors that fit a certain rocket.
   * @function
   * @param {object} req request instance
   * @param {object} rocket rocket to match
   * @param {function} callback made when metadata is loaded
   */
  getRocketMotors: getRocketMotors,

  /**
   * Load metadata about motors that match a query.
   * @function
   * @param {object} req request instance
   * @param {object} query Mongoose query object
   * @param {function} callback made when metadata is loaded
   */
  getMatchingMotors: getMatchingMotors,

  /**
   * Return the discrete burn time group buckets.
   * @member
   * @return {object[]} group info
   */
  burnTimeGroups: burnTimeGroups,

  /**
   * Bucket a burn time into the group collected.
   * If the burn time is not a positive number, undefined is returned.
   * @function
   * @param {number} n burn time
   * @return {object} group info
   */
  burnTimeGroup: burnTimeGroup,

  /**
   * Convert a manufacturer designation into the form stored in the DB.
   * @function
   * @param {string} s search value
   * @param {string} canonical value
   */
  toDesignation: toDesignation,

  /**
   * Convert a motor common name into the form stored in the DB.
   * @function
   * @param {string} s search value
   * @param {string} canonical value
   */
  toCommonName: toCommonName,

  /**
   * Convert an impulse letter class into the form stored in the DB.
   * @function
   * @param {string} s search value
   * @param {string} canonical value
   */
  toImpulseClass: toImpulseClass,
};
