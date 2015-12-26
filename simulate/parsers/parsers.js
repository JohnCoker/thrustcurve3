/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var rasp = require('./rasp.js'),
    rocksim = require('./rocksim.js');

function parse(format, data, error) {
  if (arguments.length < 2 || arguments.length > 3) {
    console.error('wrong number of arguments to parsers.parse (expected 3, got ' + arguments.length + ')');
    return;
  }
  if (typeof error != 'function') {
    error = function(msg, err) {
      if (err)
        console.error(msg);
      else
        console.warn(msg);
    };
  }
  if (format == null || typeof format != 'string' || format === '') {
    error('missing data file format to parse', true);
    return;
  }
  if (data == null || typeof data != 'string' || data === '') {
    error('missing data file data to parse', true);
    return;
  }
  if (format.toLowerCase() == 'rasp')
    return rasp.parse(data, error);
  else if (format.toLowerCase() == 'rocksim')
    return rocksim.parse(data, error);
  else {
    error('unknown data file format "' + format + '" to parse', true);
    return;
  }
}

function guessFormat(data) {
  var s, line;

  if (data == null || typeof data != 'string' || data === '')
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
