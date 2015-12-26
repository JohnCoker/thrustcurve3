/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

function parse(data, error) {
  var lines, fields, info, points, line, point, i;

  if (data == null || typeof data != 'string' || data === '') {
    error('missing data', true);
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
    error('missing motor info line', true);
    return;
  }

  // parse motor info
  fields = line.split(/\s+/);
  if (fields.length < 7) {
    error('invalid motor info line; expected seven fields', true);
    return;
  }
  if (fields.length > 7)
    error('extra stuff after motor info line; expected seven fields', false);

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
    error('invalid motor diameter "' + fields[1] + '"; expected millimeters', false);
  else
    info.diameter /= 1000;

  if (isNaN(info.length) || info.length < 1)
    error('invalid motor length "' + fields[2] + '"; expected millimeters', false);
  else
    info.length /= 1000;

  if (isNaN(info.propellantWeight) || info.propellantWeight < 0.001)
    error('invalid motor propellantWeight "' + fields[4] + '"; expected kilograms', false);
  if (isNaN(info.totalWeight) || info.totalWeight < 0.001)
    error('invalid motor totalWeight "' + fields[5] + '"; expected kilograms', false);

  // parse data points
  points = [];
  for (++i; i < lines.length; i++) {
    line = lines[i].trim();
    if (line === '' || line.charAt(0) == ';')
      break;
    fields = line.split(/\s+/);
    if (fields.length != 2) {
      error('invalid thrust data at line ' + (i + 1) + '; expected two fields', true);
      return;
    }
    point = {
      time: parseFloat(fields[0]),
      thrust: parseFloat(fields[1])
    };
    if (isNaN(point.time) || point.time < 0) {
      error('invalid time "' + fields[0] + '" at line ' + (i + 1) + '; expected seconds', true);
      return;
    }
    if (isNaN(point.thrust) || point.thrust < 0) {
      error('invalid thrust "' + fields[1] + '" at line ' + (i + 1) + '; expected Newtons', true);
      return;
    }
    points.push(point);
  }
  if (points.length < 2) {
    if (points.length < 1)
      error('no data points; expected at least two', true);
    else
      error('too few data points (' + points.length + '); expected at least two', true);
    return;
  }
  parse.points = points;

  // additional data warnings
  for (i = 0; i < points.length - 1; i++) {
    if (points[i] < 0.0001)
      error('zero thrust data point before final point', false);
  }
  if (points[points.length - 1] > 0.0001)
    error('missing final data point with 0 thrust', false);

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
