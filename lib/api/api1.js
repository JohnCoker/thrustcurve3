/*
 * Copyright 2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const metadata = require('../metadata'),
      errors = require('../errors'),
      units = require('../units'),
      schema = require('../../database/schema'),
      data = require('../../render/data'),
      parseNumber = require('../number').parseNumber;

function hasOwnProperty(object, name) {
  if (object == null || typeof object !== 'object' || typeof name !== 'string')
    return false;
  return Object.hasOwnProperty.call(object, name);
}

function getRequest(req, rootElt) {
  let request;
  if (req.method == 'GET') {
    request = req.query;
    Object.defineProperty(request, 'isGET', { value: true });
  } else {
    request = getElement(req.body, rootElt) || req.body || {};
    Object.defineProperty(request, 'isXML', { value: req.isXML });
    Object.defineProperty(request, 'isJSON', { value: req.isJSON });
  }
  return request;
}

function hasElement(parent, name) {
  if (parent && typeof parent == 'object') {
    if (hasOwnProperty(parent, name))
      return true;
    if (/-[a-z]/.test(name)) {
      let name2 = data.JSONFormat.camelCase(name);
      if (hasOwnProperty(parent, name2))
        return true;
    }
  }
  return false;
}

function getElement(parent, name, parse, error) {
  if (parent && typeof parent == 'object') {
    if (hasOwnProperty(parent, name)) {
      let v = trimValue(parent[name]);
      if (v != null && parse != null) {
        let d = parse(v);
        if (d == null) {
          if (error)
            error(errors.INVALID_QUERY, 'Invalid {1} value "{2}".', name, v);
          return;
        }
        return d;
      } else
        return v;
    }

    if (/-[a-z]/.test(name)) {
      let name2 = data.JSONFormat.camelCase(name);
      if (hasOwnProperty(parent, name2)) {
        let v = trimValue(parent[name2]);
        if (v != null && parse != null) {
          let d = parse(v);
          if (d == null) {
            if (error)
              error(errors.INVALID_QUERY, 'Invalid {1} value "{2}".', name2, v);
            return;
          }
          return d;
        } else
          return v;
      }
    }
  }
}

function getElementName(parent, name, request) {
  if (parent && typeof parent == 'object') {
    if (hasOwnProperty(parent, name))
      return name;

    if (/-[a-z]/.test(name)) {
      let name2 = data.JSONFormat.camelCase(name);
      if (hasOwnProperty(parent, name2) || request && request.isJSON)
        return name2;
    }
  }

  return name;
}

function trimValue(v) {
  if (v == null)
    return;

  if (typeof v === 'string') {
    v = v.trim();
    if (v == '*' || v == 'all')
      return;
  }
  if (Array.isArray(v)) {
    if (v.length === 0)
      return;
    if (v.length === 1)
      return trimValue(v[0]);
  }

  return v;
}

function trimChildren(v, name) {
  // [ { rocket: [ [Object], [Object] ] } ]
  if (v.length == 1 && v[0] != null && typeof v[0] === 'object' &&
      hasOwnProperty(v[0], name) && Array.isArray(v[0][name]))
    v = v[0][name];
  return v;
}

function stringValue(v) {
  if (v != null)
    return String(v);
}

function intValue(v) {
  if (v == null)
    return;
  if (typeof v === 'number')
    return isFinite(v) ? Math.round(v) : undefined;

  if (/^-?\d+$/.test(v)) {
    v = parseNumber(v);
    if (isFinite(v))
      return v;
  }
}

function numberValue(v) {
  if (v == null)
    return;
  if (typeof v === 'number')
    return isFinite(v) ? v : undefined;

  v = parseNumber(v);
  return isFinite(v) ? v : undefined;
}

function booleanValue(v) {
  if (v == null)
    return;
  if (typeof v === 'boolean')
    return v;
  if (typeof v === 'number') {
    if (v === 1)
      return true;
    if (v === 0)
      return false;
    return;
  }
  if (typeof v !== 'string' || v === '')
    return;

  v = v.toLowerCase();
  if (v === 'true' || v === 'yes' || v === 'on' || v === '1')
    return true;
  if (v === 'false' || v === 'no' || v === 'off' || v === '0')
    return false;
}

function dateValue(v) {
  if (v == null || typeof v !== 'string' || v === '')
    return;

  let parsed = /^(\d{4})-(\d{1,2})-(\d{1,2})(T.*)?$/.exec(v);
  if (parsed == null)
    return;
  let y = parseInt(parsed[1]), m = parseInt(parsed[2]), d = parseInt(parsed[3]);
  if (isNaN(y) || y < 1900 || y > 9999 ||
      isNaN(m) || m < 1 || m > 12 ||
      isNaN(d) || d < 1 || d > 31)
    return;
  if (m < 10)
    m = '0' + String(m);
  if (d < 10)
    d = '0' + String(d);
  return new Date(y, m - 1, d);
}

function closeTo(a, b) {
  if (a == b)
    return true;
  return Math.abs(a - b) / Math.min(Math.abs(a), Math.abs(b)) < 1e-10;
}

const MAX_RESULTS = 'max-results';

function getMaxResults(request, errs, dflt) {
  if (!hasElement(request, MAX_RESULTS) && dflt != null)
    return dflt;
  let maxResults = getElement(request, MAX_RESULTS, intValue, errs);
  if (maxResults == null)
    maxResults = 20;
  else if (maxResults <= 0)
    maxResults = -1;
  return maxResults;
}

function isId(v) {
  return typeof v === 'string' ? schema.IdRegex.test(v) : false;
}

/*
 * The search syntax is supported for both the metadata and search endpoints.
 */
const ID = 'id';
const MANUFACTURER = 'manufacturer';
const DESIGNATION = 'designation';
const COMMON_NAME = 'common-name';
const IMPULSE_CLASS = 'impulse-class';
const DIAMETER = 'diameter';
const TYPE = 'type';
const CERT_ORG = 'cert-org';
const SPARKY = 'sparky';
const INFO_UPDATED_SINCE = 'info-updated-since';
const HAS_DATA_FILES = 'has-data-files';
const DATA_UPDATED_SINCE = 'data-updated-since';
const AVAILABILITY = 'availability';

const SearchCriteria = [
  ID,
  MANUFACTURER,
  DESIGNATION,
  COMMON_NAME,
  IMPULSE_CLASS,
  DIAMETER,
  TYPE,
  CERT_ORG,
  SPARKY,
  INFO_UPDATED_SINCE,
  HAS_DATA_FILES,
  DATA_UPDATED_SINCE,
  AVAILABILITY,
  MAX_RESULTS,
];

function searchQuery(request, cache, error, strict) {
  var query = {}, ors = [],
      v;

  if (request == null || typeof request !== 'object')
    return query;

  // id
  v = getElement(request, ID);
  if (v != null) {
    if (!isId(v)) {
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}".', ID, v);
      query._id = null;
    } else
      query._id = v;
  }

  // manufacturer
  v = getElement(request, MANUFACTURER);
  if (v != null) {
    let m = cache.manufacturers.byName(v);
    if (m == null) {
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}".', MANUFACTURER, v);
      query._manufacturer = null;
    } else
      query._manufacturer = m._id;
  }

  // designation
  v = getElement(request, DESIGNATION);
  if (v != null) {
    let d = metadata.toDesignation(v);
    if (d == null) {
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}".', DESIGNATION, v);
      query.designation = null;
    } else {
      ors.push([
        { designation: d },
        { altDesignation: d },
      ]);
    }
  }

  // common name
  v = getElement(request, COMMON_NAME);
  if (v != null) {
    let cn = metadata.toCommonName(v);
    if (cn == null) {
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}".',
            getElementName(request, COMMON_NAME, request), v);
      query.commonName = null;
    } else {
      ors.push([
        { commonName: cn },
        { altName: cn },
      ]);
    }
  }

  // impulse class
  v = getElement(request, 'impulse-class');
  if (v != null) {
    let ic = metadata.toImpulseClass(v);
    if (ic == null) {
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}".',
            getElementName(request, IMPULSE_CLASS, request), v);
      query.impulseClass = null;
    } else
      query.impulseClass = v;
  }

  // diameter, mm
  v = getElement(request, DIAMETER);
  if (v != null) {
    let d = parseNumber(v);
    if (d > 0) {
      d /= 1000;
      query.diameter = {
        $gt: d - metadata.MotorDiameterTolerance,
        $lt: d + metadata.MotorDiameterTolerance
      };
    } else {
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}"; expected millimeters.', DIAMETER, v);
      query.diameter = 0;
    }
  }

  // motor type
  v = getElement(request, TYPE);
  if (v != null) {
    if (cache.allMotors.types.indexOf(v) < 0) {
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}".', TYPE, v);
      query.type = null;
    } else
      query.type = v;
  }

  // cert. org.
  v = getElement(request, CERT_ORG);
  if (v != null) {
    let o = cache.certOrgs.byName(v);
    if (o == null) {
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}".',
            getElementName(request, CERT_ORG, request), v);
      query._certOrg = null;
    } else
      query._certOrg = o._id;
  }

  // sparky
  v = getElement(request, SPARKY);
  if (v != null) {
    let b = booleanValue(v);
    if (b == null) {
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}"; expected true/false.', SPARKY, v);
      query.sparky = null;
    } else
      query.sparky = b;
  }

  // info-updated-since
  v = getElement(request, INFO_UPDATED_SINCE);
  if (v != null) {
    let d = dateValue(v);
    if (d == null) {
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}"; expected ISO date.',
            getElementName(request, INFO_UPDATED_SINCE, request), v);
      query.updatedAt = null;
    } else
      query.updatedAt = { $gte: d };
  }

  // has-data-files
  v = getElement(request, HAS_DATA_FILES);
  if (v != null) {
    let b = booleanValue(v);
    if (b == null) {
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}"; expected true/false.',
            getElementName(request, HAS_DATA_FILES, request), v);
    } else {
      query.simfiles = { $exists: b };
    }
  }

  // data-updated-since
  v = getElement(request, DATA_UPDATED_SINCE);
  if (v != null) {
    let d = dateValue(v);
    if (d == null) {
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}"; expected ISO date.',
            getElementName(request, DATA_UPDATED_SINCE, request), v);
    } else {
      query.simfiles = { updatedAt: { $gte: d } };
    }
  }

  // availability
  v = getElement(request, AVAILABILITY);
  if (v != null) {
    if (v == 'available')
      query.availability = { $in: schema.MotorAvailableEnum };
    else if (schema.MotorAvailabilityEnum.indexOf(v)) {
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}".', AVAILABILITY, v);
      query.availability = null;
    } else
      query.availability = v;
  }

  // check for invalid criteria
  if (strict) {
    Object.keys(request).forEach(p => {
      if (SearchCriteria.indexOf(p) < 0 && SearchCriteria.indexOf(data.JSONFormat.kebabCase(p)) < 0)
        error(errors.INVALID_QUERY, 'Invalid search criterion "{1}".', p);
    });
  }

  // form final expression
  if (ors.length == 1) {
    query.$or = ors[0];
  } else if (ors.length > 1) {
    query.$and = [];
    ors.forEach(o => query.$and.push({ $or: o }));
  }

  return query;
}

function searchCriteria(request) {
  let found = {};
  SearchCriteria.forEach(crit => {
    let v = getElement(request, crit);
    if (v != null) {
      let en = getElementName(request, crit, request);
      found[en] = v;
    }
  });
  return found;
}

/*
 * The download syntax is supported for both the metadata and download endpoints.
 */
const MOTOR_ID = 'motor-id';
const MOTOR_IDS = 'motor-ids';
const FORMAT = 'format';
const LICENSE = 'license';

function downloadQuery(request, cache, error) {
  var query = {};

  // single motor id or array of ids
  let motorIds = [];
  let motorErrors = false;
  function extractIds(value, prop) {
    if (Array.isArray(value)) {
      value.forEach(id => {
        if (id == null || id === '') {
          if (!motorErrors) {
            error(errors.INVALID_QUERY, 'Invalid {1} value; expected an array of IDs.',
                  getElementName(request, prop, request));
          }
          return;
        }
        id = String(id);
        if (motorIds.indexOf(id) < 0)
          motorIds.push(id);
      });
    } else {
      let id = String(value);
      if (motorIds.indexOf(id) < 0)
        motorIds.push(id);
    }
  }
  let id = getElement(request, MOTOR_ID);
  if (id != null) {
    if (Array.isArray(id)) {
      extractIds(id, MOTOR_ID);
    } else if (id === '') {
      error(errors.INVALID_QUERY, 'Invalid {1} value; expected an ID.',
            getElementName(request, MOTOR_ID, request));
      motorErrors = true;
    } else
      motorIds.push(String(id));
  }
  let ids = getElement(request, MOTOR_IDS);
  if (ids != null) {
    if (Array.isArray(ids)) {
      extractIds(ids, MOTOR_IDS);
    } else if (typeof ids === 'object' && Array.isArray(ids.id)) {
      extractIds(ids.id, MOTOR_IDS);
    } else if (typeof ids === 'string') {
      extractIds(ids, MOTOR_IDS);
    } else {
      error(errors.INVALID_QUERY, 'Invalid {1} value; expected an array.',
            getElementName(request, MOTOR_IDS, request));
      motorErrors = true;
    }
  }
  if (!motorErrors && motorIds.length < 1) {
    error(errors.INVALID_QUERY, 'No motor IDs specified to download files for.');
    motorErrors = true;
  }
  if (id != null && ids != null) {
    error(errors.INVALID_QUERY, 'Both {1} and {2} specified.',
          getElementName(request, MOTOR_ID), getElementName(request, MOTOR_IDS, request));
    motorErrors = true;
  }
  if (motorErrors)
    query._motor = "0";
  else
    query._motor = { $in: motorIds };

  // format
  let format = getElement(request, FORMAT);
  if (format != null) {
    format = String(format);
    if (schema.SimFileFormatEnum.indexOf(format) < 0)
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}".', FORMAT, format);
    query.format = format;
  }

  // license
  let license = getElement(request, LICENSE);
  if (license != null) {
    license = String(license);
    if (schema.SimFileLicenseEnum.indexOf(license) < 0)
      error(errors.INVALID_QUERY, 'Invalid {1} value "{2}".', LICENSE, license);
    query.license = license;
  }

  return query;
}

/*
 * The saverockets definitions need to be translated to Rocket models.
 */
const CLIENT_ID = 'client-id';
const NAME = 'name';
const PUBLIC = 'public';
const BODY_DIAMETER = 'body-diameter-m';
const WEIGHT = 'weight-kg';
const MMT_DIAMETER = 'mmt-diameter-mm';
const MMT_LENGTH = 'mmt-length-mm';
const MMT_COUNT = 'mmt-count';
const CD = 'cd';
const GUIDE_LENGTH = 'guide-length-m';
const WEBSITE = 'website';
const COMMENTS = 'comments';
const ADAPTERS = 'adapters';

function rocketModels(req, request, error, existing, results) {
  if (!Array.isArray(request.rockets)) {
    error(errors.INVALID_ROCKET, 'Invalid rockets value; expecting array.');
    return;
  }

  let prefs = {
    lengthUnit: 'mm',
    massUnit: 'g',
  };
  if (req.user.preferences) {
    if (req.user.preferences.lengthUnit)
      prefs.lengthUnit = req.user.preferences.lengthUnit;
    if (req.user.preferences.massUnit)
      prefs.massUnit = req.user.preferences.massUnit;
  }

  let models = [];
  trimChildren(request.rockets, 'rocket').forEach(rocket => {
    const clientId = stringValue(getElement(rocket, CLIENT_ID));
    const id = stringValue(getElement(rocket, ID));
    const name = stringValue(getElement(rocket, NAME));

    let model;
    if (id != null && existing != null)
      model = existing.find(e => e._id.toString() === id);
    if (model == null) {
      if (id != null) {
        error(errors.INVALID_ROCKET, 'Invalid rocket {1} value; expected existing ID.', ID);
        results.push({
          'client-id': clientId,
          id, name,
          status: 'invalid',
        });
        return;
      }
      model = new req.db.Rocket({ _contributor: req.user });
    }

    // create/update this rocket
    let changed = false, invalid = false;

    if (name == null) {
      if (model.isNew) {
        error(errors.INVALID_ROCKET, 'Missing rocket {1} value.', NAME);
        invalid = true;
      }
    } else {
      if (String(name) != model.name) {
        model.name = String(name);
        changed = true;
      }
    }

    let pub = getElement(rocket, PUBLIC);
    if (pub == null) {
      if (model.isNew)
        model.public = true;
    } else {
      let b = booleanValue(pub);
      if (b == null) {
        error(errors.INVALID_ROCKET, 'Invalid rocket {1} value.', PUBLIC);
        invalid = true;
      } else if (b != model.public) {
        model.public = b;
        changed = true;
      }
    }

    function length(src, dest, prop, what) {
      let n = numberValue(getElement(src, prop));
      if (n == null || n <= 0) {
        if (n != null || src != rocket || model.isNew) {
          error(errors.INVALID_ROCKET, 'Invalid {1} {2} value; expected length.',
                what, getElementName(src, prop, request));
          invalid = true;
        }
        return;
      }

      let sep = prop.lastIndexOf('-');
      let inUnit = prop.substring(sep + 1);
      if (inUnit != "m" && inUnit != "mm") {
        errors(errors.INVALID_ROCKET, 'Invalid {1} {2} property.',
               what, getElementName(src, prop, request));
        invalid = true;
        return;
      }
      if (inUnit === 'mm')
        n /= 1000;
      let field = data.JSONFormat.camelCase(prop.substring(0, sep));

      let unitField = field + 'Unit';
      if (dest[unitField] == null) {
        if (field == 'mmtDiameter')
          dest[unitField] = 'mm';
        else
          dest[unitField] = prefs.lengthUnit;
      }
      let cur = units.convertUnitToMKS(dest[field], 'length', dest[unitField]);
      if (dest[field] == null || !closeTo(cur, n)) {
        dest[field] = units.convertUnitFromMKS(n, 'length', dest[unitField]);
        changed = true;
      }
    }
    length(rocket, model, BODY_DIAMETER, "rocket");
    length(rocket, model, MMT_DIAMETER, "rocket");
    length(rocket, model, MMT_LENGTH, "rocket");
    length(rocket, model, GUIDE_LENGTH, "rocket");

    let mmtCount = intValue(getElement(rocket, MMT_COUNT));
    if (mmtCount == null) {
      if (model.isNew)
        model.mmtCount = 1;
    } else {
      if (mmtCount < 1) {
        error(errors.INVALID_ROCKET, 'Invalid rocket {1} value.', MMT_COUNT);
        invalid = true;
      } else if (mmtCount != model.mmtCount) {
        model.mmtCount = mmtCount;
        changed = true;
      }
    }

    function mass(src, dest, prop, what) {
      let n = numberValue(getElement(src, prop));
      if (n == null || n <= 0) {
        if (n != null || src != rocket || model.isNew) {
          error(errors.INVALID_ROCKET, 'Invalid {1} {2} value; expected mass.',
                what, getElementName(src, prop, request));
          invalid = true;
        }
        return;
      }

      let sep = prop.lastIndexOf('-');
      let inUnit = prop.substring(sep + 1);
      if (inUnit != "kg") {
        errors(errors.INVALID_ROCKET, 'Invalid {1} {2} property.',
               what, getElementName(src, prop, request));
        invalid = true;
        return;
      }
      let field = data.JSONFormat.camelCase(prop.substring(0, sep));

      let unitField = field + 'Unit';
      if (dest[unitField] == null)
        dest[unitField] = prefs.massUnit;
      let cur = units.convertUnitToMKS(dest[field], 'mass', dest[unitField]);
      if (dest[field] == null || !closeTo(cur, n)) {
        dest[field] = units.convertUnitFromMKS(n, 'mass', dest[unitField]);
        changed = true;
      }
    }
    mass(rocket, model, WEIGHT, "rocket");

    let cd = numberValue(getElement(rocket, CD));
    if (cd == null) {
      if (model.isNew) {
        error(errors.INVALID_ROCKET, 'Invalid rocket {1} value.', CD);
        invalid = true;
      }
    } else {
      if (cd < 0.1) {
        error(errors.INVALID_ROCKET, 'Invalid rocket {1} value.', CD);
        invalid = true;
      } else if (!closeTo(cd, model.cd)) {
        model.cd = cd;
        changed = true;
      }
    }

    function str(field) {
      if (!hasElement(rocket, field))
        return;
      let v = stringValue(getElement(rocket, field));
      if (v == null) {
        if (model[field] != null) {
          model[field] = null;
          changed = true;
        }
      } else {
        if (model[field] !== v) {
          model[field] = v;
          changed = true;
        }
      }
    }
    str(WEBSITE);
    str(COMMENTS);

    if (hasElement(rocket, ADAPTERS)) {
      let adapters = trimChildren(rocket[ADAPTERS], 'adapter');
      if (adapters == null) {
        if (model.adapters != null && model.adapters.length > 0) {
          model.adapters.splice(0, model.adapters.length);
          changed = true;
        }
      } else {
        if (typeof adapters === 'object' && hasElement(adapters, MMT_DIAMETER))
          adapters = [adapters];
        if (!Array.isArray(adapters)) {
          error(errors.INVALID_ROCKET, 'Invalid {1} value; expecting array.', ADAPTERS);
          invalid = true;
        } else {
          adapters.forEach((adapter, i) => {
            let adapterModel = model.adapters[i];
            let added = false;
            if (adapterModel == null) {
              adapterModel = {};
              added = true;
            }
            length(adapter, adapterModel, MMT_DIAMETER, "adapter");
            length(adapter, adapterModel, MMT_LENGTH, "adapter");
            mass(adapter, adapterModel, WEIGHT, "adapter");
            if (added) {
              model.adapters.push(adapterModel);
              changed = true;
            }
          });
          if (model.adapters.length > adapters.length) {
            model.adapters.splice(adapters.length, model.adapters.length - adapters.length);
            changed = true;
          }
        }
      }
    }

    if (invalid) {
      results.push({
        'client-id': clientId,
        id, name,
        status: 'invalid',
      });
    } else if (!changed) {
      results.push({
        'client-id': clientId,
        id, name: model.name,
        status: 'unchanged',
      });
    } else {
      model.clientId = clientId;
      if (!model.isNew)
        model.id = id;
      models.push(model);
    }
  });
  return models;
}

/*
 * The motorguide rocket fields need to be extracted from the request.
 */
const ROCKET = 'rocket';

function guideRocket(req, request, error) {
  let rocket = getElement(request, ROCKET);
  if (rocket == null) {
    error(errors.INVALID_ROCKET, 'Missing {1} object.', ROCKET);
    return;
  }

  function num(prop) {
    let n = numberValue(getElement(rocket, prop));
    if (n == null || n <= 0) {
      error(errors.INVALID_ROCKET, 'Invalid rocket {1} value.',
            getElementName(rocket, prop, request));
      return 0;
    }
    return n;
  }

  return {
    name: stringValue(getElement(rocket, NAME)),
    bodyDiameter: num(BODY_DIAMETER),
    mmtDiameter: num(MMT_DIAMETER) / 1000,
    mmtLength: num(MMT_LENGTH) / 1000,
    rocketMass: num(WEIGHT),
    cd: num(CD),
    guideLength: num(GUIDE_LENGTH),
  };
}

/**
 * <p>The api1 module contains utility methods used to implement the <code>/api/v1</code> endpoints.
 *
 * @module api1
 */
module.exports = {
  /**
   * Checks whether the property is defined on the object directly. This is safe to call or null or
   * objects without the normal prototype chain.
   * @param {object} object to inspect
   * @param {string} name property name
   * @return {boolean}
   */
  hasOwnProperty,

  /**
   * <p>Gets the API request object from the Express request.
   * @function
   * @param {object} req Express request
   * @param {string} rootElt XML root element name
   * @return {object} request object
   */
  getRequest,

  /**
   * <p>Checks for a child element from the parent object, using either XML or JSON style names.
   * @function
   * @param {object} parent object
   * @param {string} name in XML style
   * @return {object} true if property exists (any value)
   */
  hasElement,

  /**
   * <p>Gets a child element from the parent object, using either XML or JSON style names.
   * @function
   * @param {object} parent object
   * @param {string} name in XML style
   * @param {function} [parse] function to parse value if present
   * @param {function} [error] error function if parsing fails
   * @return {object} value if any
   */
  getElement,

  /**
   * <p>Gets the child element name in the parent object, using either XML or JSON style names.
   * @function
   * @param {object} parent object
   * @param {string} name in XML style
   * @param {object} [request] API request object
   * @return {string} name as present/expected
   */
  getElementName,

  /**
   * <p>Cleans up a value from an input object. This trims strings and turns wildcards into undefined.
   * @function
   * @param {object} v value
   * @param {object} cleaned-up value
   */
  trimValue,

  /**
   * <p>Cleans up a child array value from an input object. This removes extra XML parser layers.
   * @function
   * @param {object} v value
   * @param {string} name child element name
   * @param {object} cleaned-up value
   */
  trimChildren,

  /**
   * <p>Parse an integer value from an input object.
   * @function
   * @param {string} v value
   * @return {number} parsed or undefined
   */
  intValue,

  /**
   * <p>Parse a numeric value from an input object.
   * @function
   * @param {string} v value
   * @return {number} parsed or undefined
   */
  numberValue,

  /**
   * <p>Parse a boolean value from an input object.
   * @function
   * @param {string} v value
   * @return {boolean} parsed or undefined
   */
  booleanValue,

  /**
   * <p>Parse a boolean value from an input object.
   * @function
   * @param {string} v value
   * @return {string} MongoDB ISODate expression
   */
  dateValue,

  /**
   * <p>Whether two numbers are sufficiently close values (1 in 10¹⁰).
   * @function
   * @param {number} a first value
   * @param {number} b second value
   * @return {boolean} true if they are close enough
   */
  closeTo,

  /**
   * <p>Get the maximum results to return, defaulting to 20.
   * @function
   * @param {object} request the request input object
   * @param {object} error error collector
   * @param {number} [default] default value if unspecified
   * @return {number} maximum result count
   */
  getMaxResults,

  /**
   * <p>Produce a query against the Motor model that matches the values specified in the request object.
   * @function
   * @param {object} request the request input object
   * @param {object} metadata cache
   * @param {object} error error collector
   * @param {boolean} [strict] if true, raise error for unknown criteria
   * @return {object} MongoDB query object
   */
  searchQuery,

  /**
   * <p>Extract the names and values of the search criteria specified,
   * @function
   * @param {object} request the request input object
   * @return {object} criteria specified
   */
  searchCriteria,

  /**
   * <p>Produce a query against the SimFile model that matches the values specified in the request object.
   * @function
   * @param {object} request the request input object
   * @param {object} metadata cache
   * @param {object} error error collector
   * @return {object} MongoDB query object
   */
  downloadQuery,

  /**
   * <p>Extract a list of valid rocket models to save from those specified in the request object.
   * For entries that are not valid, results are populated in the array passed in the last argument
   * and not returned.
   * @function
   * @param {object} req Express request
   * @param {object} request the request input object
   * @param {object} error error collector
   * @param {existing} existing rocket models
   * @param {results} partial results array (not to save)
   * @return {object} MongoDB query object
   */
  rocketModels,

  /**
   * <p>Extract the info for a rocket to be used in the motor guide.
   * @function
   * @param {object} req Express request
   * @param {object} request the request input object
   * @param {object} error error collector
   * @return {object} rocket key info
   */
  guideRocket,
};
