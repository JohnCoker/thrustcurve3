/*
 * Copyright 2015-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const xmlparser = require("xml-parser"),
      errors = require('../../lib/errors'),
      parseNumber = require('../../lib/number').parseNumber;

var tEpsilon = 0.00005;

function parse(data, error) {
  var xml, engine, info, dataElt, points, point, lastTime, elt, attrs, attr, value, i, j, n;

  if (data == null || typeof data != 'string' || data === '') {
    error(errors.DATA_FILE_EMPTY, 'missing data');
    return;
  }

  // remove CDATA bracketing, which xml-parser can't handle
  while ((i = data.indexOf("<![CDATA[")) >= 0) {
    let end = data.indexOf("]]>");
    if (end > i) {
       data = data.substring(0, i) +
              data.substring(i + 9, end) +
              data.substring(end + 3);
    } else
      break;
  }

  // parse as XML
  xml = xmlparser(data);
  if (xml == null || xml.root == null) {
    error(errors.ROCKSIM_BAD_XML, 'invalid XML for RockSim data file');
    return;
  }

  // find the engine element
  if (xml.root.name == 'engine-database') {
    if (xml.root.children.length != 1 || xml.root.children[0].name != 'engine-list') {
      error(errors.ROCKSIM_WRONG_DOC, 'expected single engine-list element in engine-database');
      return;
    }
    value = xml.root.children[0];
    n = 0;
    for (i = 0; i < value.children.length; i++) {
      if (value.children[i].name == 'engine') {
	if (engine == null)
	  engine = value.children[i];
	n++;
      } else {
	error(errors.ROCKSIM_WRONG_DOC, 'unexpected element {1} in engine-list', value.children[i].name);
      }
    }
    if (engine == null) {
      error(errors.ROCKSIM_WRONG_DOC, 'missing engine element in engine-list');
      return;
    }
    if (n > 1)
      error(errors.MULTIPLE_MOTORS, '{1} engine elements in engine-list', n);
  } else if (xml.root.name == 'engine') {
    engine = xml.root;
  } else {
    error(errors.ROCKSIM_WRONG_DOC, 'wrong root element "{1}" in RockSim data file', xml.root.name);
  }

  // read info from the attributes
  info = {};
  attrs = Object.keys(engine.attributes);
  for (i = 0; i < attrs.length; i++) {
    attr = attrs[i];
    value = engine.attributes[attr];
    if (attr == 'code') {
      info.name = value;
    } else if (attr == 'mfg') {
      info.manufacturer = value;
    } else if (attr == 'delays') {
      info.delays = value;
    } else if (attr == 'dia') {
      n = parseNumber(value);
      if (isNaN(n) || n < 1)
        error(errors.INVALID_INFO, 'invalid dia value "{1}"; expected millimeters', value);
      else
        info.diameter = n / 1000;
    } else if (attr == 'len') {
      n = parseNumber(value);
      if (isNaN(n) || n < 1)
        error(errors.INVALID_INFO, 'invalid len value "{1}"; expected millimeters', value);
      else
        info.length = n / 1000;
    } else if (attr == 'Type') {
      if (/^reload/i.test(value))
        info.type = 'reload';
      else if (/^hybrid/i.test(value))
        info.type = 'hybrid';
      else if (/^single/i.test(value))
        info.type = 'SU';
      else
        error(errors.INVALID_INFO, 'invalid Type value "{1}"; expected single-use, reloadable or hybrid', value);
    } else if (attr == 'initWt') {
      n = parseNumber(value);
      if (isNaN(n) || n < 1)
        error(errors.INVALID_INFO, 'invalid initWt value "{1}"; expected grams', value);
      else
        info.totalWeight = n / 1000;
    } else if (attr == 'propWt') {
      n = parseNumber(value);
      if (isNaN(n) || n < 0.1)
        error(errors.INVALID_INFO, 'invalid propWt value "{1}"; expected grams', value);
      else
        info.propellantWeight = n / 1000;
    } else if (attr == 'Itot') {
      n = parseNumber(value);
      if (isNaN(n) || n < 0.1)
        error(errors.INVALID_INFO, 'invalid Itot value "{1}"; expected Newton-seconds', value);
      else
        info.totalImpulse = n;
    } else if (attr == 'avgThrust') {
      n = parseNumber(value);
      if (isNaN(n) || n < 0.001)
        error(errors.INVALID_INFO, 'invalid avgThrust value "{1}"; expected Newtons', value);
      else
        info.avgThrust = n;
    } else if (attr == 'peakThrust') {
      n = parseNumber(value);
      if (isNaN(n) || n < 0.01)
        error(errors.INVALID_INFO, 'invalid peakThrust value "{1}"; expected Newtons', value);
      else
        info.maxThrust = n;
    } else if (attr == 'burn-time') {
      n = parseNumber(value);
      if (isNaN(n) || n < 0.01)
        error(errors.INVALID_INFO, 'invalid time value "{1}"; expected seconds', value);
      else
        info.burnTime = n;
    } else if (attr == 'massFrac') {
      n = parseNumber(value);
      if (isNaN(n) || n < 1)
        error(errors.INVALID_INFO, 'invalid massFrac value "{1}"; expected ratio', value);
      else
        info.massFraction = n;
    } else if (attr == 'Isp') {
      n = parseNumber(value);
      if (isNaN(n) || n < 1)
        error(errors.INVALID_INFO, 'invalid Isp value "{1}"; expected seconds', value);
      else
        info.isp = n;
    }
  }

  // find single data element
  n = 0;
  for (i = 0; i < engine.children.length; i++) {
    if (engine.children[i].name == 'data') {
      if (dataElt == null)
	dataElt = engine.children[i];
      n++;
    } else if (engine.children[i].name != 'comments') {
      error(errors.ROCKSIM_WRONG_DOC, 'unexpected element {1} in engine', engine.children[i].name);
    }
  }
  if (dataElt == null) {
    error(errors.MISSING_POINTS, 'missing data element in engine');
    return;
  }
  if (n > 1)
    error(errors.ROCKSIM_WRONG_DOC, '{1} data elements in engine', n);

  // read data points
  lastTime = 0;
  points = [];
  for (i = 0; i < dataElt.children.length; i++) {
    elt = dataElt.children[i];
    if (elt.name == 'eng-data') {
      point = {};
      attrs = Object.keys(elt.attributes);
      for (j = 0; j < attrs.length; j++) {
        attr = attrs[j];
        value = elt.attributes[attr];
        if (attr == 't') {
          n = parseNumber(value);
          if (isNaN(n) || n < 0) {
            error(errors.INVALID_POINTS, 'invalid eng-data/t value "{1}"; expected seconds', value);
            return;
          }
          point.time = n;
        } else if (attr == 'f') {
          n = parseNumber(value);
          if (isNaN(n) || n < 0) {
            error(errors.INVALID_POINTS, 'invalid eng-data/f value "{1}"; expected Newtons', value);
            return;
          }
          point.thrust = n;
        } else if (attr == 'm') {
          n = parseNumber(value);
          if (!isNaN(n) && n >= 0)
            point.propellantWeight = n / 1000;
        }
      }
      if (!point.hasOwnProperty('time')) {
        error(errors.INVALID_POINTS, 'missing eng-data/t value; expected seconds');
        return;
      }
      if (!point.hasOwnProperty('thrust')) {
        error(errors.INVALID_POINTS, 'missing eng-data/f value; expected Newtons');
        return;
      }

      // time should be increasing
      if (points.length > 0 && point.time < lastTime + tEpsilon)
	error(errors.INVALID_POINTS, 'eng-data/t value "{1}" not after previous point', point.time);

      points.push(point);
    }
  }
  if (points.length < 2) {
    if (points.length < 1)
      error(errors.MISSING_POINTS, 'no data points; expected at least two');
    else
      error(errors.MISSING_POINTS, 'too few data points ({1}); expected at least two', points.length);
    return;
  }

  return {
    format: 'RockSim',
    info: info,
    points: points
  };
}

function combine(data, error) {
  if (data == null || data.length < 1) {
    error(errors.DATA_FILE_EMPTY, 'missing data');
    return;
  }

  let text = '<engine-database>\n' +
             ' <engine-list>\n';

  data.forEach((one, i) => {
    one = one.trim();
    if (one === '') {
      error(errors.DATA_FILE_EMPTY, 'missing data[' + i + ']');
      return;
    }

    let xml = xmlparser(one);
    if (xml == null || xml.root == null) {
      error(errors.ROCKSIM_BAD_XML, 'invalid XML for RockSim data file[' + i + ']');
      return;
    }
    if (xml.root.name == 'engine-database') {
      /* jshint ignore:start */
      one = one.replace(/^.*<engine-database[^>]*>\s*<engine-list[^>]*>\s*/s, '')
               .replace(/\s*<\/engine-list[^>]*>\s*<\/engine-database[^>]*>.*$/s, '');
      /* jshint ignore:end */
      one = one.trim();
      text += one.split(/ *\r?\n/).join('\n') + '\n';
    }
  });

  text += ' </engine-list>\n' +
          '</engine-database>\n';

  return text;
}

/**
 * <p>The rocksim module knows how to parse RockSim RSE (XML) files.
 *
 * @module rocksim
 */
module.exports = {
  format: 'RockSim',
  extension: '.rse',
  mimeType: 'text/x-rse+xml',
  parse: parse,
  combine: combine,
};
Object.freeze(module.exports);
