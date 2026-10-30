/*
 * Copyright 2026 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

function run(store, fn) {
  return als.run(store, fn);
}

function getStore() {
  return als.getStore();
}

function get(key) {
  const store = als.getStore();
  return store && store[key];
}

module.exports = {
  run,
  getStore,
  get,
};
