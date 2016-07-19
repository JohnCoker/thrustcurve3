/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const sessionStorage = require('continuation-local-storage').getNamespace('session');

/**
 * The prefs module contains methods for maintaining user preferences.
 * Preferences are stored in the contributor record for logged-in users of the site.
 *
 * Rather than being stored in a global variable, the preferences are stored in
 * "continuation local storage," making them session-specific.
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
    var data = this.all();
    if (name != null)
      return data[name];
  },

  /**
   * Set the value of a preference.
   * @function
   * @param {string} name preference name
   * @param {any} value preference value
   */
  set: function(name, value) {
    var data = this.all();
    if (value == null)
      delete data[name];
    else
      data[name] = value;
  },

  /**
   * Set the value of all preferences at once.
   * @function
   * @param {object} prefs preferences object
   */
  setAll: function(prefs) {
    var data = this.all();
    this.clear();
    Object.keys(prefs).forEach(function(k) {
      data[k] = prefs[k];
    });
  },

  /**
   * Discard the value of all preferences.
   * @function
   */
  clear: function() {
    var data = this.all();
    Object.keys(data).forEach(function(k) {
      delete data[k];
    });
  },

  /**
   * Get the value of all preferences as an object.
   * @function
   * @return {object} all preferences
   */
  all: function() {
    if (sessionStorage)
      return sessionStorage.get('prefs') || {};
    else
      return {};
  }
};

