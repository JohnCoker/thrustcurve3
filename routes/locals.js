/*
 * Copyright 2016-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

/**
 * Produce a new object with the default and custom locals merged.
 * @param {object} [req] Express request object
 * @param {object} defaults object with defaults for a set of routes
 * @param {object} custom object with custom locals for a single route
 * @return {object} merged object
 */
module.exports = function(req, defaults, custom) {
  var merged = {},
      p;

  if (arguments.length < 3) {
    req = undefined;
    defaults = arguments[0];
    custom = arguments[1];
  }

  if (custom == null)
    custom = {};
  else if (typeof custom == 'string')
    custom = { title: custom };

  if (req && req.user)
    merged.username = req.user.name;

  if (defaults != null) {
    for (p in defaults) {
      if (defaults.hasOwnProperty(p) && !custom.hasOwnProperty(p))
        merged[p] = defaults[p];
    }
  }

  for (p in custom) {
    if (custom.hasOwnProperty(p) && custom[p] != null)
      merged[p] = sanitize(custom[p]);
  }

  return merged;
};

/**
 * Make plain objects out of Mongoose models to send to the template engine
 * and clip out methods and private state for security.
 */
function sanitize(o) {
  if (o != null && typeof o === 'object' && !o._sanitized) {
    if (Array.isArray(o)) {
      let a = [];
      Object.defineProperty(a, '_sanitized', { value: true });
      o.forEach(e => a.push(sanitize(e)));
      return a;
    } else if (o.constructor && o.constructor.name === 'model') {
      let s = {};
      Object.defineProperty(s, '_sanitized', { value: true });
      for (const p in o) {
        let v = o[p];
        if (/^\$/.test(p) || p === 'db' || p === 'opts' || p === 'conn' || p === 'schema' || p === 'collection')
          continue;
        if (typeof v !== 'function')
          s[p] = sanitize(v);
      }
      return s;
    }
  }
  return o;
}
