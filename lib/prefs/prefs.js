/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var data = {};

module.exports = {
  get: function(n) {
    if (n == null)
      return;
    else
      return data[n];
  },
  set: function(n, v) {
    if (v == null)
      delete data[n];
    else
      data[n] = v;
  },
  clear: function() {
    data = {};
  },
  all: function() {
    return data;
  }
};

