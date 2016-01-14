/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

/**
 * Produce a new object with the default and custom locals merged.
 * @param {object} defaults object with defaults for a set of routes
 * @param {object} custom object with custom locals for a single route
 * @return {object} merged object
 */
module.exports = function(defaults, custom) {
  var merged = {},
      p;

  if (custom == null)
    custom = {};
  else if (typeof custom == 'string')
    custom = { title: custom };

  if (defaults != null) {
    for (p in defaults) {
      if (defaults.hasOwnProperty(p) && !custom.hasOwnProperty(p))
        merged[p] = defaults[p];
    }
  }

  for (p in custom) {
    if (custom.hasOwnProperty(p) && custom[p] != null)
      merged[p] = custom[p];
  }

  return merged;
};
