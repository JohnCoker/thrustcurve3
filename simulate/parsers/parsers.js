/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var errors = require('../../lib/errors'),
    rasp = require('./rasp.js'),
    rocksim = require('./rocksim.js');

function parse(format, data, error) {
  if (format == null || typeof format != 'string' || format === '') {
    error(errors.DATA_FILE_FORMAT, 'missing data file format to parse');
    return;
  }
  if (data == null || typeof data != 'string' || data === '') {
    error(errors.DATA_FILE_EMPTY, 'missing data file data to parse');
    return;
  }
  if (format.toLowerCase() == 'rasp')
    return rasp.parse(data, error);
  else if (format.toLowerCase() == 'rocksim')
    return rocksim.parse(data, error);
  else {
    error(errors.DATA_FILE_FORMAT, 'unknown data file format "{1}" to parse', format);
    return;
  }
}

function guessFormat(data) {
  var s, line;

  if (typeof data != 'string' || data === '')
    return;
  s = data.toLowerCase().trim();

  // look for stats line of RASP files
  line = s;
  if (/^;/.test(line))
    line = s.replace(/\s*;[^\r\n]*\r?\n/g, '').trim();
  line = line.split('\n')[0].trim();
  if (/^1\/[248]A(0\.)[1-9]|[A-Z][1-9]/i.test(line) && line.split(' ').length == 7)
    return rasp.format;

  // look for engine element of RockSim files
  if (s.indexOf('<engine') >= 0)
    return rocksim.format;
}

module.exports = {
  parseData: parse,
  guessFormat: guessFormat,
  parseRASP: rasp.parse,
  parseRockSim: rocksim.parse,
};
