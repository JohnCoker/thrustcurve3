/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

function isInt(s) {
  if (s == null)
    return false;
  return /^(0|([1-9][0-9]*))$/.test(s);
}

function isFloat(s) {
  if (s == null)
    return false;
  return /^(0|([1-9][0-9]*))(\.[0-9]*)?$/.test(s) || /^\.[0-9]+$/.test(s);
}

function parseInt(s) {
  return isInt(s) ? global.parseInt(s) : NaN;
}

function parseFloat(s) {
  return isFloat(s) ? global.parseFloat(s) : NaN;
}

module.exports = {
  isInt,
  isFloat,
  parseInt,
  parseFloat,
};
