/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var data = {};

/**
 * The prefs module contains methods for maintaining user preferences.
 * Preferences are stored in the contributor record for logged-in users of the site.
 *
 * @module prefs
 */
module.exports = {
  /**
   * Get the value of a preference.
   * @function
   * @param {string} name preference name
   * @return {any} preference value
   */
  get: function(name) {
    if (name == null)
      return;
    else
      return data[name];
  },

  /**
   * Set the value of a preference.
   * @function
   * @param {string} name preference name
   * @param {any} value preference value
   */
  set: function(name, value) {
    if (value == null)
      delete data[name];
    else
      data[name] = value;
  },

  /**
   * Discard the value of all preferences.
   * @function
   */
  clear: function() {
    data = {};
  },

  /**
   * Get the value of all preferences as an object.
   * @function
   * @return {object} all preferences
   */
  all: function() {
    return data;
  }
};

