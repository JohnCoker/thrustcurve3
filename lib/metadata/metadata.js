/*
 * Copyright 2016-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const path = require('path'),
      fs = require('fs'),
      schema = require('../../database/schema'),
      units = require('../../lib/units'),
      helpers = require('../../lib/helpers');

const MotorDiameterTolerance = 0.0015;

let manufacturerCache, certOrgCache, propInfoCache,
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
  // add the manufacturer
  let mfr = manufacturerCache.byId(motor._manufacturer);
  if (mfr && this.manufacturers.indexOf(mfr) < 0)
    this.manufacturers.push(mfr);

  // add the certOrg
  let v = certOrgCache.byId(motor._certOrg);
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
  if (v) {
    let info = this.propellants.find(i => i.name == v);
    if (info == null) {
      info = {
        name: v,
        manufacturers: [],
      };
      this.propellants.push(info);
    }
    if (mfr && info.manufacturers.indexOf(mfr.abbrev) < 0)
      info.manufacturers.push(mfr.abbrev);
  }

  // add the case
  if (motor.type != 'SU' && (v = motor.caseInfo)) {
    let info = this.cases.find(i => i.name == v);
    if (info == null) {
      info = {
        name: v,
        manufacturers: [],
        diameter: motor.diameter,
      };
      this.cases.push(info);
    }
    if (mfr && info.manufacturers.indexOf(mfr.abbrev) < 0)
      info.manufacturers.push(mfr.abbrev);
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
  this.propellants.sort((a, b) => a.name.localeCompare(b.name));

  // sort cases
  this.cases.sort((a, b) => helpers.nameCompare(a.name, b.name));

  deepFreeze(this);
};
MetadataCache.prototype.diametersMM = function() {
  return this.diameters.map(d => {
    let s;
    d *= 1000;
    if (d > 12) {
      s = d.toFixed();
    } else {
      s = d.toFixed(1);
      if (/\.0$/.test(s))
        s = s.replace(/\.0$/, '');
    }
    return s;
  });
}

const FakeEntry = { name: "Unknown", abbrev: "?" };
Object.freeze(FakeEntry);

function getManufacturers(req, cb) {
  if (manufacturerCache != null) {
    cb(manufacturerCache);
  } else {
    req.db.Manufacturer.find({}, undefined, { sort: { name: 1 } }, req.success(function(results) {
      manufacturerCache = results;

      manufacturerCache.byId = function(v, fake) {
        if (v != null) {
          v = v.toString();
          for (var i = 0; i < this.length; i++) {
            if (this[i]._id.toString() == v.toString())
              return this[i];
          }
        }
        if (fake)
          return FakeEntry;
      };

      manufacturerCache.byName = function(v, fake) {
        if (v != null) {
          v = v.toString();
          for (var i = 0; i < this.length; i++) {
            if (this[i].name == v || this[i].abbrev == v || this[i].aliases.indexOf(v) >= 0)
              return this[i];
          }
        }
        if (fake)
          return FakeEntry;
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

      certOrgCache.byId = function(v, fake) {
        if (v != null) {
          v = v.toString();
          for (var i = 0; i < this.length; i++) {
            if (this[i]._id.toString() == v.toString())
              return this[i];
          }
        }
        if (fake)
          return FakeEntry;
      };

      certOrgCache.byName = function(v, fake) {
        if (v != null) {
          v = v.toString();
          for (var i = 0; i < this.length; i++) {
            if (this[i].name == v || this[i].abbrev == v)
              return this[i];
          }
        }
        if (fake)
          return FakeEntry;
      };

      deepFreeze(certOrgCache);
      cb(certOrgCache);
    }));
  }
}

function getPropellantInfo(req, cb) {
  if (propInfoCache != null) {
    cb(propInfoCache);
  } else {
    req.db.PropellantInfo.find({}, undefined, { sort: { name: 1 } }, req.success(function(results) {
      propInfoCache = results;
      deepFreeze(propInfoCache);
      cb(propInfoCache);
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
    if (mmtDiameter != null && isFinite(mmtDiameter) && mmtLength != null && isFinite(mmtLength)) {
      query = {
        diameter: {
          $gt: mmtDiameter - MotorDiameterTolerance,
          $lt: mmtDiameter + MotorDiameterTolerance
        },
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
          mmtDiameter = units.convertUnitToMKS(rocket.adapters[i].mmtDiameter, 'length',
                                               rocket.adapters[i].mmtDiameterUnit);
          mmtLength = units.convertUnitToMKS(rocket.adapters[i].mmtLength, 'length',
                                             rocket.adapters[i].mmtLengthUnit);
          if (mmtDiameter != null && isFinite(mmtDiameter) &&
              mmtLength != null && isFinite(mmtLength)) {
            query.$or.push({
              diameter: {
                $gt: mmtDiameter - MotorDiameterTolerance,
                $lt: mmtDiameter + MotorDiameterTolerance
              },
              length: { $lt: mmtLength + MotorDiameterTolerance },
            });
          }
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
    } else {
      fit.organize();
      cb(fit);
    }
  });
}

function getMatchingMotors(req, query, cb) {
  get(req, function(caches) {
    var match = new MetadataCache();

    if (query == null) {
      cb(match);
      return;
    }

    function run(query) {
      req.db.Motor.find(query)
        .sort({ totalImpulse: 1 })
        .exec(req.success(function(motors) {
          for (var i = 0; i < motors.length; i++)
            match.add(motors[i]);
          match.organize();
          cb(match, motors);
        }));
    }

    if (query.simfiles != null) {
      // get motor IDs from matching simfiles
      let sfq = Object.assign({}, query.simfiles);
      if (sfq.hasOwnProperty('$exists')) {
        delete sfq.$exists;
      }
      req.db.SimFile.find(sfq, { _motor: true }).exec(req.success(function(simfiles) {
        if (simfiles.length < 1) {
          // no simfiles match the query
          match.organize();
          cb(match);
        }

        let ids = [...new Set(simfiles.map(sf => sf._motor))];
        let mq = Object.assign({}, query);
        delete mq.simfiles;
        if (query.simfiles.$exists === false)
          mq._id = { $nin: ids };
        else
          mq._id = { $in: ids };
        run(mq);
      }));
    } else {
      run(query);
    }
  });
}

const burnTimeGroups = [
  { nominal: 0.25, label: "¼" + helpers.SEP_UNIT_S, min: 0.0,  max: 0.35 },
  { nominal: 0.5,  label: "½" + helpers.SEP_UNIT_S, min: 0.35, max: 0.66 },
  { nominal: 0.75, label: "¾" + helpers.SEP_UNIT_S, min: 0.65, max: 0.85 },
];
(function() {
  var i, last, max;

  last = burnTimeGroups[burnTimeGroups.length - 1].max;
  for (i = 1; i < 7; i++) {
    max = i + 0.5;
    burnTimeGroups.push({ nominal: i, label: i.toFixed() + helpers.SEP_UNIT_S, min: last, max: max });
    last = max;
  }
  burnTimeGroups.push({ nominal: 7, label: '7' + helpers.SEP_UNIT_S + '+', min: last, max: Infinity });
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
  s = s.replace(/^([0-9]*[ -]*)?([A-O][0-9.]+).*$/, '$2');
  if (isCommonName(s))
    return s;
}

function isCommonName(s) {
  if (s == null || s === '')
    return false;
  return /^[A-O][0-9.]+$/.test(s);
}

function toImpulseClass(s) {
  if (s == null || s === '')
    return;
  s = s.toUpperCase();
  s = s.replace(/^1\/[248]A$/, 'A');
  if (isImpulseClass(s))
    return s;
}

function isImpulseClass(s) {
  if (s == null || s === '')
    return false;
  return /^[A-O]$/.test(s);
}

const Categories = [
  {
    label: 'low-power',
    value: 'lpr',
    regex: /^[A-D]$/
  },
  {
    label: 'mid-power',
    value: 'mpr',
    regex: /^[EFG]$/
  },
  {
    label: 'high-power',
    value: 'hpr',
    regex: /^[H-O]$/,
    group: true,
  },
  {
    label: 'level 1',
    value: 'l1',
    regex: /^[HI]$/
  },
  {
    label: 'level 2',
    value: 'l2',
    regex: /^[JKL]$/
  },
  {
    label: 'level 3',
    value: 'l3',
    regex: /^[MNO]$/
  },
];
deepFreeze(Categories);

function toCategory(c, specific) {
  var i;

  if (specific) {
    for (i = 0; i < Categories.length; i++) {
      if (!Categories[i].group && Categories[i].regex.test(c))
	return Categories[i];
    }
  }

  for (i = 0; i < Categories.length; i++) {
    if (Categories[i].regex.test(c))
      return Categories[i];
  }
}

/*
 * Path to sample metadata (as per metadata API).
 */
const sampleFile = path.resolve(__dirname + '/../../config/sample-metadata.json');

function sample() {
  let data = JSON.parse(fs.readFileSync(sampleFile));
  let all = new MetadataCache();
  let available = new MetadataCache();
  Object.keys(data).forEach(prop => {
    let values = data[prop];
    if (!Array.isArray(values) || !Array.isArray(all[prop]))
      throw new Error(`metadata.sample: unexpected property "${prop}"!`);

    let idPrefix;
    if (prop == 'manufacturers')
      idPrefix = 'mfr';
    else if (prop == 'certOrgs')
      idPrefix = 'org';
    if (idPrefix) {
      for (let i = idPrefix.length; i < 23; i++)
        idPrefix += '0';
    }
    values.forEach((v, i) => {
      if (idPrefix)
        v._id = idPrefix + (i + 1).toFixed();
      all[prop].push(v);
      available[prop].push(v);
    });
  });

  // make last manufacturer unavailable
  if (available.manufacturers.length > 1)
    available.manufacturers.splice(available.manufacturers.length - 1, 1);

  all.manufacturers.byName = function(v, fake) {
    if (v != null) {
      v = v.toString();
      for (var i = 0; i < this.length; i++) {
        if (this[i].name == v || this[i].abbrev == v)
          return this[i];
      }
    }
    if (fake)
      return FakeEntry;
  };
  available.manufacturers.byName = all.manufacturers.byName;

  all.certOrgs.byName = function(v, fake) {
    if (v != null) {
      v = v.toString();
      for (var i = 0; i < this.length; i++) {
        if (this[i].name == v || this[i].abbrev == v)
          return this[i];
      }
    }
    if (fake)
      return FakeEntry;
  };
  available.certOrgs.byName = all.certOrgs.byName;

  let cache = {
    manufacturers: all.manufacturers,
    certOrgs: all.certOrgs,
    allMotors: all,
    availableMotors: available,
  };
  deepFreeze(cache);
  return cache;
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
  MotorDiameterTolerance,

  /**
   * Load the cache of all manufacturers (active and inactive).
   * @function
   * @param {object} req request instance
   * @param {function} callback made when manufacturers are loaded
   */
  getManufacturers,

  /**
   * Load the cache of all certification organizations.
   * @function
   * @param {object} req request instance
   * @param {function} callback made when cert orgs are loaded
   */
  getCertOrgs,

  /**
   * Load the cache of propellant meta information.
   * @function
   * @param {object} req request instance
   * @param {function} callback made when propellant info is loaded
   */
  getPropellantInfo,

  /**
   * Load the cache of metadata for all motors (including unavailable ones).
   * @function
   * @param {object} req request instance
   * @param {function} callback made when metadata is loaded
   */
  getAllMotors,

  /**
   * Load the cache of metadata for currently available motors.
   * @function
   * @param {object} req request instance
   * @param {function} callback made when metadata is loaded
   */
  getAvailableMotors,

  /**
   * Load both caches of motor metadata.
   * @function
   * @param {object} req request instance
   * @param {function} callback made when metadata is loaded
   */
  getMotors,

  /**
   * Load all caches and return an object with each one as a property.
   * @function
   * @param {object} req request instance
   * @param {function} callback made when metadata is loaded
   */
  get,

  /**
   * Flush the cache, such as when motors or manufacturers are edited.
   * @function
   */
  flush,

  /**
   * The list of CD "finish" values.
   * @member {object[]}
   */
  CdFinishes,

  /**
   * Load metadata about motors that fit a certain rocket.
   * @function
   * @param {object} req request instance
   * @param {object} rocket rocket to match
   * @param {function} callback made when metadata is loaded
   */
  getRocketMotors,

  /**
   * Load metadata about motors that match a query.
   * @function
   * @param {object} req request instance
   * @param {object} query Mongoose query object
   * @param {function} callback made when metadata is loaded
   */
  getMatchingMotors,

  /**
   * Return the discrete burn time group buckets.
   * @member
   * @return {object[]} group info
   */
  burnTimeGroups,

  /**
   * Bucket a burn time into the group collected.
   * If the burn time is not a positive number, undefined is returned.
   * @function
   * @param {number} n burn time
   * @return {object} group info
   */
  burnTimeGroup,

  /**
   * Convert a manufacturer designation into the form stored in the DB.
   * @function
   * @param {string} s search value
   * @return {string} canonical value
   */
  toDesignation,

  /**
   * Convert a motor common name into the form stored in the DB.
   * @function
   * @param {string} s search value
   * @return {string} canonical value, if valid
   */
  toCommonName,

  /**
   * Check whether a string is a motor common name.
   * @function
   * @param {string} s search value
   * @return {boolean} true if common name
   */
  isCommonName,

  /**
   * Convert an impulse letter class into the form stored in the DB.
   * @function
   * @param {string} s search value
   * @return {string} canonical value, if valid
   */
  toImpulseClass,

  /**
   * Check whether a string is a valid impulse class.
   * @function
   * @param {string} s search value
   * @return {boolean} true if impulse class
   */
  isImpulseClass,

  /**
   * List of categories into which impulse classes are conventionally divided.
   * @member {object[]}
   */
  Categories,

  /**
   * Map an impulse class to a category
   * @function
   * @param {string} c impulse class value
   * @param {boolean} [specific] choose more specific category
   * @return {object} category info
   */
  toCategory,

  /**
   * Get sample metadata for testing. Note that this does <b>not</b> include motors
   * and only a subset of manufacturers and cert. orgs. This corresponds to the
   * sample data; see database/README.md.
   * @function
   * @return {object} sample metadata cache
   * @see get
   */
  sample,
};
