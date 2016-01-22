/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

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

function MetadataCache() {
  this.manufacturers = [];
  this.certOrgs = [];
  this.diameters = [];
  this.impulseClasses = [];
  this.propellants = [];
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

  // add the diameter
  v = motor.diameter;
  if (v > 0 && this.diameters.indexOf(v) < 0)
    this.diameters.push(v);

  // add the impulse class
  v = motor.impulseClass;
  if (v && this.impulseClasses.indexOf(v) < 0)
    this.impulseClasses.push(v);

  // add the propellant
  v = motor.propellantInfo;
  if (v && !/[,:(]/.test(v) && this.propellants.indexOf(v) < 0)
    this.propellants.push(v);
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

  // sort propellants
  this.propellants.sort();

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
 * <p>All these functions take <code>db</code> object which has been set up with state
 * necessary for querying the database.  This is the object put on the request by
 * <code>app.js</code> for all routes.</p>
 *
 * @module metadata
 */
module.exports = {
  /**
   * Load the cache of all manufacturers (active and inactive).
   * @function
   * @param {object} req request instance
   * @param {function} callback made when manufacturers are loaded
   * @return {object} metadata cache for all motors
   */
  getManufacturers: getManufacturers,

  /**
   * Load the cache of all certification organizations.
   * @function
   * @param {object} req request instance
   * @param {function} callback made when cert orgs are loaded
   * @return {object} metadata cache for all motors
   */
  getCertOrgs: getCertOrgs,

  /**
   * Load the cache of metadata for all motors (including unavailable ones).
   * @function
   * @param {object} req request instance
   * @param {function} callback made when metadata is loaded
   * @return {object} metadata cache for all motors
   */
  getAllMotors: getAllMotors,

  /**
   * Load the cache of metadata for currently available motors.
   * @function
   * @param {object} req request instance
   * @param {function} callback made when metadata is loaded
   * @return {object} metadata cache for available motors
   */
  getAvailableMotors: getAvailableMotors,

  /**
   * Load both caches of motor metadata.
   * @function
   * @param {object} req request instance
   * @param {function} callback made when metadata is loaded
   * @return {object} metadata cache for available motors
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
};
