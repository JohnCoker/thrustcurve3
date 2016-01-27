/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var strftime = require('strftime'),
    units = require("../units");

var handlebars;

var placeholder = '—';

function sameId(a, b, options) {
  if (a == null || b == null)
    return;
  if (typeof a == 'object' && a.hasOwnProperty('_id'))
    a = a._id;
  if (typeof b == 'object' && b.hasOwnProperty('_id'))
    b = b._id;
  if (a.toString() == b.toString())
    return options.fn(module);
}

function formatLength(v) {
  var s = units.formatPrefFromMKS(v, 'length', true);
  if (s == null || s === '')
    return placeholder;
  else
    return s;
}

function formatMass(v) {
  var s = units.formatPrefFromMKS(v, 'mass', true);
  if (s == null || s === '')
    return placeholder;
  else
    return s;
}

function formatForce(v) {
  var s = units.formatPrefFromMKS(v, 'force', true);
  if (s == null || s === '')
    return placeholder;
  else
    return s;
}

function formatImpulse(v) {
  var s = units.formatPrefFromMKS(v, 'force', true);
  if (s == null || s === '')
    return placeholder;
  else
    return s + 's';
}

function formatVelocity(v) {
  var s = units.formatPrefFromMKS(v, 'velocity', true);
  if (s == null || s === '')
    return placeholder;
  else
    return s;
}

function formatAcceleration(v) {
  var s = units.formatPrefFromMKS(v, 'acceleration', true);
  if (s == null || s === '')
    return placeholder;
  else
    return s;
}

function formatAltitude(v) {
  var s = units.formatPrefFromMKS(v, 'altitude', true);
  if (s == null || s === '')
    return placeholder;
  else
    return s;
}

function formatMMT(v) {
  var s = units.formatMMTFromMKS(v);
  if (s == null || s === '')
    return placeholder;
  else
    return s;
}

function formatDuration(v) {
  if (typeof v == 'number' && !isNaN(v) && Number.isFinite(v))
    return v.toFixed(1) + 's';
  else
    return placeholder;
}

function formatIsp(v) {
  if (typeof v == 'number' && !isNaN(v) && Number.isFinite(v) && v > 0)
    return v.toFixed(0) + 's';
  else
    return placeholder;
}

function formatSort(v) {
  if (typeof v == 'number' && !isNaN(v) && Number.isFinite(v))
    return v.toFixed(4);
  else
    return '0.0000';
}

function formatDate(v, fmt) {
  if (v == null)
    return placeholder;
  if (typeof v == 'number')
    v = new Date(v);
  else
    v = new Date(v.toString());

  if (fmt == null || fmt === '' || typeof fmt == 'object')
    fmt = 'long';

  if (fmt == 'short')
    fmt = '%b %e, %y';
  else if (fmt == 'long')
    fmt = '%B %e, %Y';
  else if (fmt == 'iso')
    fmt = '%F';

  return strftime(fmt, v).replace(/\s{2,}/g, ' ');
}

function websiteAnchor(v) {
  if (v) {
    v = String(v).valueOf();
    return v.replace(/^https?:\/+/i, '')
            .replace(/^www\./, '')
            .replace(/\/.*$/, '');
  } else
    return placeholder;
}

function manufacturerLink(mfr) {
  if (typeof mfr == 'object' && mfr.abbrev)
    return '/manufacturers/' + encodeURIComponent(mfr.abbrev) + '/motors.html';
  else
    return '/manufacturers/';
}

function motorLink(mfr, mot) {
  if (arguments.length == 1 && typeof arguments[0] == 'object') {
    mot = arguments[0];
    if (typeof mot._manufacturer == 'object')
      mfr = mot._manufacturer;
    else
      mfr = undefined;
  }
  if (typeof mfr == 'object' && mfr.abbrev && typeof mot == 'object' && mot.designation)
    return '/motors/' + encodeURIComponent(mfr.abbrev) + '/' + encodeURIComponent(mot.designation) + '/';
  else
    return '/motors/search.html';
}

function simfileLink(sf) {
  if (typeof sf == 'object' && sf._id)
    return '/simfiles/' + sf._id + '/';
  else if (sf)
    return '/simfiles/' + sf + '/';
  else
    return '/simfiles/';
}

function contributorLink(ct) {
  if (typeof ct == 'object' && ct._id)
    return '/contributors/' + ct._id + '/';
  else if (ct)
    return '/contributors/' + ct + '/';
  else
    return '/contributors/';
}

function capitalize(s) {
  var c, words, i;

  if (s == null || s === '')
    return '';

  c = '';
  words = s.trim().split(/\s+/);
  for (i = 0; i < words.length; i++) {
    if (i > 0)
      c += ' ';
    c += words[i].substring(0, 1).toUpperCase() + words[i].substring(1);
  }
  return c;
}

function formatTrend(sigma) {
  var dir, n, s;

  if (sigma > 0.9) {
    dir = 'up';
    n = Math.round(sigma);
  } else if (sigma < -0.9) {
    dir = 'down';
    n = Math.round(sigma);
  } else {
    dir = 'flat';
    n = 0;
  }

  if (handlebars) {
    s = '<img class="trend" src="/images/trend-' + dir + '.png" alt="' + dir + '"> ';
    if (n > 0.5)
      s += '+' + n.toFixed() + '&sigma;';
    else if (n < -0.5)
      s += '&minus;' + Math.abs(n).toFixed() + '&sigma;';
    else
      s += '&mdash;';
    return new handlebars.SafeString(s);
  }

  return dir;
}

/**
 * <p>The helpers module contains site-specific Handlebars helper functions.</p>
 *
 * @module helpers
 */
module.exports = {

  /**
   * Block helper to check whether two MongoDB IDs are the same.
   * @function
   * @param {object} a ObjectId or Model
   * @param {object} b ObjectId or Model
   * @return {boolean} true if the IDs are the same
   */
  sameId: sameId,

  /**
   * Format a length for display.
   * @function
   * @param {number} v value in MKS
   * @return {string} formatted value
   */
  formatLength: formatLength,

  /**
   * Format a mass for display.
   * @function
   * @param {number} v value in MKS
   * @return {string} formatted value
   */
  formatMass: formatMass,

  /**
   * Format a force for display.
   * @function
   * @param {number} v value in MKS
   * @return {string} formatted value
   */
  formatForce: formatForce,

  /**
   * Format an impulse for display.
   * @function
   * @param {number} v value in MKS
   * @return {string} formatted value
   */
  formatImpulse: formatImpulse,

  /**
   * Format a velocity for display.
   * @function
   * @param {number} v value in MKS
   * @return {string} formatted value
   */
  formatVelocity: formatVelocity,

  /**
   * Format an acceleration for display.
   * @function
   * @param {number} v value in MKS
   * @return {string} formatted value
   */
  formatAcceleration: formatAcceleration,

  /**
   * Format an altitude for display.
   * @function
   * @param {number} v value in MKS
   * @return {string} formatted value
   */
  formatAltitude: formatAltitude,

  /**
   * Format a MMT diameter for display.
   * @function
   * @param {number} v value in MKS
   * @return {string} formatted value
   */
  formatMMT: formatMMT,

  /**
   * Format a duration for display.
   * @function
   * @param {number} v value in MKS
   * @return {string} formatted value
   */
  formatDuration: formatDuration,

  /**
   * Format an ISP for display.
   * @function
   * @param {number} v value in MKS
   * @return {string} formatted value
   */
  formatIsp: formatIsp,

  /**
   * Format a value for sorting, turning missing values into zero.
   * @function
   * @param {number} v numeric value
   * @return {string} fixed-precision representation
   */
  formatSort: formatSort,

  /**
   * Format a date for display.
   * @function
   * @param {number} v value in milliseconds or Date
   * @param {string} [fmt] format specifier
   * @return {string} formatted value
   */
  formatDate: formatDate,

  /**
   * Produce a link anchor for a URL.
   * @function
   * @param {string} v URL
   * @return {string} domain name
   */
  websiteAnchor: websiteAnchor,

  /**
   * Produce a link to the manufacturer page listing their motors.
   * @function
   * @param {object} mfr Manufacturer model
   * @return {string} link to manufacturer info page
   */
  manufacturerLink: manufacturerLink,

  /**
   * Produce a link to the motor information page for this manufacturer.
   * @function
   * @param {object} [mfr] Manufacturer model
   * @param {object} mot Motor model
   * @return {string} link to motor info page
   */
  motorLink: motorLink,

  /**
   * Produce a link to the information page for this contributor.
   * @function
   * @param {object} ct Contributor model or ID
   * @return {string} link to contributor page
   */
  contributorLink: contributorLink,

  /**
   * Produce a link to the information page for this simulator file.
   * @function
   * @param {object} sf SimFile model or ID
   * @return {string} link to simfile info page
   */
  simfileLink: simfileLink,

  /**
   * Produce a string with each word starting with an upper-case letter.
   * @function
   * @param {string} s original string
   * @return {string} capitalized string
   */
  capitalize: capitalize,

  /**
   * Produce a string with representation of a trend.
   * @function
   * @param {number} sigma number of standard deviations up/down
   * @return {string} formatted string
   */
  formatTrend: formatTrend,

  /**
   * Register Handlebars helpers.
   * @function
   * @param {object} hbs Handlebars instance
   */
  help: function(hbs) {
    handlebars = hbs;
    Object.keys(module.exports).forEach(function(p) {
      var v = module.exports[p];
      if (p != 'help' && typeof v == 'function')
        hbs.registerHelper(p, v);
    });
  }
};
