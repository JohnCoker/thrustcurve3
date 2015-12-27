/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var errors = require('../../lib/errors');

function parse(data, error) {
  var lines, fields, info, points, line, point, i;

  if (data == null || typeof data != 'string' || data === '') {
    error(errors.DATA_FILE_EMPTY, 'missing data');
    return;
  }
  lines = data.trim().split('\n');

  // skip comments and blank lines
  for (i = 0; i < lines.length; i++) {
    line = lines[i].trim();
    if (line !== '' && line.charAt(0) != ';')
      break;
  }
  if (i >= lines.length) {
    error(errors.RASP_INFO_LINE, 'missing motor info line');
    return;
  }

  // parse motor info
  fields = line.split(/\s+/);
  if (fields.length < 7) {
    error(errors.RASP_INFO_LINE, 'invalid motor info line; expected seven fields');
    return;
  }
  if (fields.length > 7)
    error(errors.RASP_INFO_LINE, 'extra stuff after motor info line; expected seven fields');

  info = {
    name: fields[0],
    diameter: parseInt(fields[1]),
    length: parseInt(fields[2]),
    delays: fields[3],
    propellantWeight: parseFloat(fields[4]),
    totalWeight: parseFloat(fields[5]),
    manufacturer: fields[6]
  };

  if (isNaN(info.diameter) || info.diameter < 1)
    error(errors.INVALID_INFO, 'invalid motor diameter "{1}"; expected millimeters', fields[1]);
  else
    info.diameter /= 1000;

  if (isNaN(info.length) || info.length < 1)
    error(errors.INVALID_INFO, 'invalid motor length "{1}"; expected millimeters', fields[2]);
  else
    info.length /= 1000;

  if (isNaN(info.propellantWeight) || info.propellantWeight < 0.001)
    error(errors.INVALID_INFO, 'invalid motor propellantWeight "{1}"; expected kilograms', fields[4]);
  if (isNaN(info.totalWeight) || info.totalWeight < 0.001)
    error(errors.INVALID_INFO, 'invalid motor totalWeight "{1}"; expected kilograms', fields[5]);

  // parse data points
  points = [];
  for (++i; i < lines.length; i++) {
    line = lines[i].trim();
    if (line === '' || line.charAt(0) == ';')
      break;
    fields = line.split(/\s+/);
    if (fields.length != 2) {
      error(errors.INVALID_POINTS, 'invalid thrust data at line {1}; expected two fields', i + 1);
      return;
    }
    point = {
      time: parseFloat(fields[0]),
      thrust: parseFloat(fields[1])
    };
    if (isNaN(point.time) || point.time < 0) {
      error(errors.INVALID_POINTS, 'invalid time "{1}" at line {2}; expected seconds', fields[0], i + 1);
      return;
    }
    if (isNaN(point.thrust) || point.thrust < 0) {
      error(errors.INVALID_POINTS, 'invalid thrust "{1}" at line {2}; expected seconds', fields[1], i + 1);
      return;
    }
    points.push(point);
  }
  if (points.length < 2) {
    if (points.length < 1)
      error(errors.MISSING_POINTS, 'no data points; expected at least two');
    else
      error(errors.MISSING_POINTS, 'too few data points ({1}); expected at least two', points.length);
    return;
  }
  parse.points = points;

  // additional data warnings
  for (i = 0; i < points.length - 1; i++) {
    if (points[i] < 0.0001)
      error(errors.INVALID_POINTS, 'zero thrust data point before final point');
  }
  if (points[points.length - 1] > 0.0001)
    error(errors.MISSING_POINTS, 'missing final data point with zero thrust');

  return {
    format: 'RASP',
    info: info,
    points: points
  };
}

module.exports = {
  format: 'RASP',
  parse: parse,
};
