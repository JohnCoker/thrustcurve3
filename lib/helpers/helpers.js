/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var units = require("../units");

function formatLength(v) {
  return units.formatPrefFromMKS(v, 'length');
}

function formatMass(v) {
  return units.formatPrefFromMKS(v, 'mass');
}

function formatForce(v) {
  return units.formatPrefFromMKS(v, 'force');
}

function formatImpulse(v) {
  var s = units.formatPrefFromMKS(v, 'force');
  if (s)
    s += 's';
  return s;
}

function formatVelocity(v) {
  return units.formatPrefFromMKS(v, 'velocity');
}

function formatAcceleration(v) {
  return units.formatPrefFromMKS(v, 'acceleration');
}

function formatAltitude(v) {
  return units.formatPrefFromMKS(v, 'altitude');
}

var formatMMT = units.formatMMTFromMKS;

function formatTime(v) {
  if (typeof v == 'number' && !isNaN(v) && Number.isFinite(v))
    return v.toFixed(1) + 's';
  else
    return '';
}

function websiteAnchor(v) {
  if (v) {
    v = String(v).valueOf();
    return v.replace(/^https?:\/+/i, '')
            .replace(/^www\./, '')
            .replace(/\/.*$/, '');
  } else
    return '';
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
   * Format a time for display.
   * @function
   * @param {number} v value in MKS
   * @return {string} formatted value
   */
  formatTime: formatTime,

  /**
   * Produce a link anchor for a URL.
   * @function
   * @param {string} v URL
   * @return {string} domain name
   */
  websiteAnchor: websiteAnchor,

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
