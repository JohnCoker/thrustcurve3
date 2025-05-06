/*
 * Copyright 2015-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const errors = require('../../lib/errors'),
      parseNumber = require('../../lib/number').parseNumber;

const tEpsilon = 0.00001;
const NL = '\n';

function parse(data, error) {
  var lines, fields, info, points, pointErrors, line, point, lastTime, i;

  // fatal of header can't be read
  if (data == null || typeof data != 'string' || data === '') {
    error(errors.DATA_FILE_EMPTY, 'missing data');
    return;
  }
  lines = data.trim().split(/\r?\n/);

  // skip comments and blank lines
  let comment;
  for (i = 0; i < lines.length; i++) {
    line = lines[i].trim();
    if (line !== '' && line.charAt(0) != ';')
      break;
    let c = line.replace(/^;+ ?/, '');
    if (c === '' && comment == null)
      continue;
    if (comment == null)
      comment = '';
    comment += c + '\n';
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
    diameter: parseNumber(fields[1]),
    length: parseNumber(fields[2]),
    delays: fields[3],
    propellantWeight: parseNumber(fields[4]),
    totalWeight: parseNumber(fields[5]),
    manufacturer: fields[6],
    comment,
  };

  // diameter and length must be at least 1mm
  if (isNaN(info.diameter) || info.diameter < 1)
    error(errors.INVALID_INFO, 'invalid motor diameter "{1}"; expected millimeters', fields[1]);
  else
    info.diameter /= 1000;
  if (isNaN(info.length) || info.length < 1)
    error(errors.INVALID_INFO, 'invalid motor length "{1}"; expected millimeters', fields[2]);
  else
    info.length /= 1000;

  // propellant weight must be .1g and total weight must be 1g
  if (isNaN(info.propellantWeight) || info.propellantWeight < 0.0001)
    error(errors.INVALID_INFO, 'invalid motor propellantWeight "{1}"; expected kilograms', fields[4]);
  if (isNaN(info.totalWeight) || info.totalWeight < 0.001)
    error(errors.INVALID_INFO, 'invalid motor totalWeight "{1}"; expected kilograms', fields[5]);

  // parse data points
  points = [];
  lastTime = 0;
  pointErrors = 0;
  for (++i; i < lines.length; i++) {
    line = lines[i].trim();
    if (line === '' || line.charAt(0) == ';')
      break;
    fields = line.split(/\s+/);
    if (fields.length != 2) {
      error(errors.INVALID_POINTS, 'invalid thrust data at line {1}; expected two fields', i + 1);
      pointErrors++;
      continue;
    }
    point = {
      time: parseNumber(fields[0]),
      thrust: parseNumber(fields[1])
    };

    // time must be positive and should be increasing
    if (isNaN(point.time) || point.time < 0) {
      error(errors.INVALID_POINTS, 'invalid time "{1}" at line {2}; expected seconds', fields[0], i + 1);
      pointErrors++;
      continue;
    }
    if (points.length === 0 && point.time < tEpsilon)
      error(errors.INVALID_POINTS, 'first time "{1}" at line {2} not positive', fields[0], i + 1);
    if (points.length > 0 && point.time < lastTime + tEpsilon)
      error(errors.INVALID_POINTS, 'time "{1}" at line {2} not after previous point', fields[0], i + 1);

    // thrust must be non-negative
    if (isNaN(point.thrust) || point.thrust < 0) {
      error(errors.INVALID_POINTS, 'invalid thrust "{1}" at line {2}; expected Newtons', fields[1], i + 1);
      pointErrors++;
      continue;
    }

    points.push(point);
    lastTime = point.time;
  }
  if (pointErrors < 1 && points.length < 2) {
    if (points.length < 1)
      error(errors.MISSING_POINTS, 'no data points; expected at least two');
    else
      error(errors.MISSING_POINTS, 'too few data points ({1}); expected at least two', points.length);
  }
  parse.points = points;

  // extra stuff at EOF
  for ( ; i < lines.length; i++) {
    line = lines[i].trim();
    if (line !== '' && line.charAt(0) !== ';') {
      error(errors.MULTIPLE_MOTORS, 'extra content at line {1}; expected end of file', i + 1);
      break;
    }
  }

  // additional data warnings
  for (i = 0; i < points.length - 1; i++) {
    if (points[i] < 0.0001)
      error(errors.INVALID_POINTS, 'zero thrust data point before final point');
  }
  if (points[points.length - 1] > 0.0001)
    error(errors.MISSING_POINTS, 'missing final data point with zero thrust');

  // fatal if points can't be read
  if (pointErrors > 0 || points.length < 2) {
    return;
  }

  return {
    format: 'RASP',
    info: info,
    points: points
  };
}

const INDENT = '   ';
const SEP    = '  ';
const PREC   = 3;

function print(parsed, error) {
  if (parsed == null || parsed.info == null ||
      parsed.info.name == null || parsed.info.manufacturer == null ||
      !(parsed.info.diameter > 0) || !(parsed.info.length > 0) ||
      !(parsed.info.propellantWeight > 0) || !(parsed.info.totalWeight > 0)) {
    error(errors.INVALID_INFO, 'missing parsed info for RASP header');
    return;
  }
  if (parsed.points == null || !(parsed.points.length > 1)) {
    error(errors.MISSING_POINTS, 'missing parsed data points for RASP body');
    return;
  }

  // comment
  let s = '';
  if (parsed.info.comment != null)
    parsed.info.comment.trimRight().split(/\r?\n/).forEach(line => s += '; ' + line + NL);

  // header line
  s += parsed.info.name;
  s += ' ' + nToStr(parsed.info.diameter * 1000, 1, 1, true) + ' ' + nToStr(parsed.info.length * 1000, 1, 0);
  if (parsed.info.delays != null) {
    let d = parsed.info.delays.trim().replace(/[^0-9]+/g, '-');
    d = d.replace(/^-+/, '').replace(/-+$/, '');
    if (d === '')
      d = 'P';
    s += ' ' + d;
  }
  s += ' ' + nToStr(parsed.info.propellantWeight, 1, 4, true) + ' ' + nToStr(parsed.info.totalWeight, 1, 4, true);
  s += ' ' + parsed.info.manufacturer;
  s += NL;

  // data points
  {
    let timeScale = scale(parsed.points, 'time');
    let thrustScale = scale(parsed.points, 'thrust');
    let sawZero = false;
    let tLast = 0;
    parsed.points.forEach((point, i) => {
      s += INDENT + nToStr(point.time, timeScale, PREC) + SEP;
      if (point.thrust > 0) {
        s += nToStr(point.thrust, thrustScale, PREC);
      } else {
        s += nToStr(0, thrustScale, 0);
        sawZero = true;
      }
      s += NL;
      tLast = Math.max(tLast, point.time);
    });
    if (!sawZero) {
      s += INDENT + nToStr(tLast + 0.001, timeScale, PREC) + SEP + nToStr(0, thrustScale, 0) + NL;
    }
  }

  return s;
}

function scale(points, field) {
  return points.reduce((prev, point) => Math.max(prev, Math.round(point[field]).toFixed().length), 1);
}

function nToStr(v, scale, prec, trailingZeros) {
  let s, l;
  if (prec < 0)
    s = String(v);
  else
    s = v.toFixed(prec);
  l = s.indexOf('.');
  if (l < 1)
    l = s.length;
  while (l < scale) {
    s = ' ' + s;
    l++;
  }
  if (trailingZeros) {
    s = s.replace(/(\.\d*[1-9])0+$/, '$1').replace(/\.0+$/, '');
  }
  return s;
}

function combine(data, error) {
  if (data == null || data.length < 1) {
    error(errors.DATA_FILE_EMPTY, 'missing data');
    return;
  }

  let text = '';
  data.forEach((one, i) => {
    one = one.trim();
    if (one === '') {
      error(errors.DATA_FILE_EMPTY, 'missing data[' + i + ']');
      return;
    }
    if (text !== '' && one.charAt(0) !== ';')
      text += ';' + NL;
    text += one.split(/ *\r?\n/).join(NL) + NL;
  });
  return text;
}

/**
 * <p>The rasp module knows how to parse RASP ENG (text) files.
 *
 * @module rasp
 */
module.exports = {
  format: 'RASP',
  extension: '.eng',
  mimeType: 'text/x-rasp+plain',
  parse,
  print,
  combine,
};
Object.freeze(module.exports);
