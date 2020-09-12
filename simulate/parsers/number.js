/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

function isInt(s) {
  if (s == null)
    return false;
  return /^-?[0-9]+$/.test(s);
}

function isNonNegInt(s) {
  if (s == null)
    return false;
  return /^[0-9]+$/.test(s);
}

function isPosInt(s) {
  if (s == null)
    return false;
  return /^[0-9]+$/.test(s) && parseInt(s) > 0;
}

function isNumber(s) {
  if (s == null)
    return false;
  return /^-?([0-9]+)(\.[0-9]*)?$/.test(s) || /^\.[0-9]+$/.test(s);
}

function isNonNegNumber(s) {
  if (s == null)
    return false;
  return /^-?([0-9]+)(\.[0-9]*)?$/.test(s) || /^\.[0-9]+$/.test(s);
}

function parseNumber(s) {
  return isNumber(s) ? parseFloat(s) : NaN;
}

module.exports = {
  isInt,
  isNonNegInt,
  isPosInt,
  isNumber,
  isNonNegNumber,
  parseNumber,
};
