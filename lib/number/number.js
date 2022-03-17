/*
 * Copyright 2020 John Coker for ThrustCurve.org
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
  if (typeof s === 'number')
    return s;
  return isNumber(s) ? parseFloat(s) : NaN;
}

function toFixed(n, d) {
  if (typeof n != 'number' || !Number.isFinite(n))
    return "";

  let fixed = true;
  if (typeof d != 'number') {
    d = 0;
  } else if (d < 0) {
    if (Math.abs(n) >= 1000)
      d = 0;
    else if (Math.abs(n) >= 100)
      d = 1;
    else if (Math.abs(n) >= 10)
      d = 2;
    else if (Math.abs(n) >= 1)
      d = 3;
    else
      d = 4;
    fixed = false;
  }

  let options;
  if (d > 0)
    options = { minimumFractionDigits: d, maximumFractionDigits: d };
  else
    options = { maximumFractionDigits: 0 };
  options.useGrouping = false;
  let s = new Intl.NumberFormat('en-US', options).format(n);
  if (!fixed) {
    s = s.replace(/^([^.]*\.[0-9])0+$/, "$1")
         .replace(/\.0$/, '');
  }
  return s;
}

/**
 * <p>The number module contains functions to more accurately parse numbers.
 * In particular, it fails if the value starts as a number, but has an invalid
 * format later.
 *
 * @module number
 */
module.exports = {
  /**
   * <p>Whether or not the string is a valid integer.
   * @function
   * @param {string} s string
   * @return {boolean} true if integer
   */
  isInt,

  /**
   * <p>Whether or not the string is a valid non-negative integer (&gt;= 0).
   * @function
   * @param {string} s string
   * @return {boolean} true if non-negative integer
   */
  isNonNegInt,

  /**
   * <p>Whether or not the string is a valid positive integer (&gt; 0).
   * @function
   * @param {string} s string
   * @return {boolean} true if positive integer
   */
  isPosInt,

  /**
   * <p>Whether or not the string is a valid number.
   * @function
   * @param {string} s string
   * @return {boolean} true if number
   */
  isNumber,

  /**
   * <p>Whether or not the string is a valid non-negative number (&gt;= 0.0).
   * @function
   * @param {string} s string
   * @return {boolean} true if non-negative number
   */
  isNonNegNumber,

  /**
   * <p>Parse the string if a completely valid number, otherwise return <code>NaN</code>.
   * @function
   * @param {string} s string
   * @return {number}
   */
  parseNumber,

  /**
   * <p>Format a number with the specified number of fraction digits for code.
   * @function
   * @param {number} n value
   * @param {number} d number of fraction digits
   * @return {string}
   */
  toFixed,
};
