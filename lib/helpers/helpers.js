/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var strftime = require('strftime'),
    units = require("../units");

var placeholder = '—';

function formatLength(v) {
  var s = units.formatPrefFromMKS(v, 'length');
  if (s == null || s === '')
    return placeholder;
  else
    return s;
}

function formatMass(v) {
  var s = units.formatPrefFromMKS(v, 'mass');
  if (s == null || s === '')
    return placeholder;
  else
    return s;
}

function formatForce(v) {
  var s = units.formatPrefFromMKS(v, 'force');
  if (s == null || s === '')
    return placeholder;
  else
    return s;
}

function formatImpulse(v) {
  var s = units.formatPrefFromMKS(v, 'force');
  if (s == null || s === '')
    return placeholder;
  else
    return s + 's';
}

function formatVelocity(v) {
  var s = units.formatPrefFromMKS(v, 'velocity');
  if (s == null || s === '')
    return placeholder;
  else
    return s;
}

function formatAcceleration(v) {
  var s = units.formatPrefFromMKS(v, 'acceleration');
  if (s == null || s === '')
    return placeholder;
  else
    return s;
}

function formatAltitude(v) {
  var s = units.formatPrefFromMKS(v, 'altitude');
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
    return '/manufacturers/' + mfr.abbrev + '/motors.html';
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
    return '/motors/' + mfr.abbrev + '/' + mot.designation + '/';
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

/**
 * <p>The helpers module contains site-specific Handlebars helper functions.</p>
 *
 * @module helpers
 */
module.exports = {

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
   * Register Handlebars helpers.
   * @function
   * @param {object} hbs Handlebars instance
   */
  help: function(hbs) {
    Object.keys(module.exports).forEach(function(p) {
      var v = module.exports[p];
      if (p != 'help' && typeof v == 'function')
        hbs.registerHelper(p, v);
    });
  }
};
