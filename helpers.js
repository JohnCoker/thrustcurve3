/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var units = require("./lib/units");

module.exports.help = function(hbs) {
  hbs.registerHelper("formatLength", function(v) {
    return units.formatPrefFromMKS(v, 'length');
  });
  hbs.registerHelper("formatMass", function(v) {
    return units.formatPrefFromMKS(v, 'mass');
  });
  hbs.registerHelper("formatForce", function(v) {
    return units.formatPrefFromMKS(v, 'force');
  });
  hbs.registerHelper("formatImpulse", function(v) {
    var s = units.formatPrefFromMKS(v, 'force');
    if (s)
      s += 's';
    return s;
  });
  hbs.registerHelper("formatVelocity", function(v) {
    return units.formatPrefFromMKS(v, 'velocity');
  });
  hbs.registerHelper("formatAcceleration", function(v) {
    return units.formatPrefFromMKS(v, 'acceleration');
  });
  hbs.registerHelper("formatAltitude", function(v) {
    return units.formatPrefFromMKS(v, 'altitude');
  });

  hbs.registerHelper("formatMMT", units.formatMMTFromMKS);
  hbs.registerHelper("formatTime", function(v) {
    if (typeof v == 'number' && !isNaN(v)) {
      return v.toFixed(1) + 's';
    }
  });

  hbs.registerHelper("websiteAnchor", function(v) {
    if (v) {
       return v.replace(/^https?:\/+/i, '')
               .replace(/^www\./, '')
               .replace(/\/.*$/, '');
    }
  });
}
