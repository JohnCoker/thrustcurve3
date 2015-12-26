/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var xmlparser = require("xml-parser");

function parse(data, error) {
  var xml, engine, info, data, points, point, elt, attrs, attr, value, i, j, n;

  if (data == null || typeof data != 'string' || data === '') {
    error('missing data', true);
    return;
  }
  xml = xmlparser(data);
  if (xml == null || xml.root == null) {
    error('invalid XML for RockSim data file', true);
    return;
  }

  // find the engine element
  if (xml.root.name = 'engine-database') {
    if (xml.root.children.length != 1 || xml.root.children[0].name != 'engine-list' ||
        xml.root.children[0].children.length != 1 || xml.root.children[0].children[0].name != 'engine') {
      error('expected single engine element in engine-database', true);
      return;
    }
    engine = xml.root.children[0].children[0];
  } else if (xml.root.name == 'engine') {
    engine = xml.root;
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
      n = parseFloat(value);
      if (isNaN(n) || n < 1)
        error('invalid dia value "' + value + '"; expected millimeters', false);
      else
        info.diameter = n / 1000;
    } else if (attr == 'len') {
      n = parseFloat(value);
      if (isNaN(n) || n < 1)
        error('invalid len value "' + value + '"; expected millimeters', false);
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
        error('invalid Type value "' + value + '"; expected single-use, reloadable or hybrid', false);
    } else if (attr == 'initWt') {
      n = parseFloat(value);
      if (isNaN(n) || n < 1)
        error('invalid initWt value "' + value + '"; expected grams', false);
      else
        info.totalWeight = n / 1000;
    } else if (attr == 'propWt') {
      n = parseFloat(value);
      if (isNaN(n) || n < 1)
        error('invalid propWt value "' + value + '"; expected grams', false);
      else
        info.propellantWeight = n / 1000;
    } else if (attr == 'Itot') {
      n = parseFloat(value);
      if (isNaN(n) || n < 0.1)
        error('invalid Itot value "' + value + '"; expected Newton-seconds', false);
      else
        info.totalImpulse = n;
    } else if (attr == 'avgThrust') {
      n = parseFloat(value);
      if (isNaN(n) || n < 0.001)
        error('invalid avgThrust value "' + value + '"; expected Newtons', false);
      else
        info.avgThrust = n;
    } else if (attr == 'peakThrust') {
      n = parseFloat(value);
      if (isNaN(n) || n < 0.01)
        error('invalid peakThrust value "' + value + '"; expected Newtons', false);
      else
        info.maxThrust = n;
    } else if (attr == 'burn-time') {
      n = parseFloat(value);
      if (isNaN(n) || n < 0.01)
        error('invalid time value "' + value + '"; expected seconds', false);
      else
        info.burnTime = n;
    } else if (attr == 'massFrac') {
      n = parseFloat(value);
      if (isNaN(n) || n < 1)
        error('invalid massFrac value "' + value + '"; expected ratio', false);
      else
        info.massFraction = n;
    } else if (attr == 'Isp') {
      n = parseFloat(value);
      if (isNaN(n) || n < 1)
        error('invalid Isp value "' + value + '"; expected seconds', false);
      else
        info.isp = n;
    }
  }

  // read data points from grandchild elements
  points = [];
  if (engine.children.length != 1 || engine.children[0].name != 'data') {
    error('expected single data element in engine', true);
    return;
  }
  data = engine.children[0];
  for (i = 0; i < data.children.length; i++) {
    elt = data.children[i];
    if (elt.name == 'eng-data') {
      point = {};
      attrs = Object.keys(elt.attributes);
      for (j = 0; j < attrs.length; j++) {
        attr = attrs[j];
        value = elt.attributes[attr];
        if (attr == 't') {
          n = parseFloat(value);
          if (isNaN(n) || n < 0) {
            error('invalid eng-data/t value "' + value + '"; expected seconds', true);
            return;
          }
          point.time = n;
        } else if (attr == 'f') {
          n = parseFloat(value);
          if (isNaN(n) || n < 0) {
            error('invalid eng-data/f value "' + value + '"; expected Newtons', true);
            return;
          }
          point.thrust = n;
        } else if (attr == 'm') {
          n = parseFloat(value);
          if (!isNaN(n) && n >= 0)
            point.propellantWeight = n / 1000;
        }
      }
      if (!point.hasOwnProperty('time')) {
        error('missing eng-data/t value; expected seconds', true);
        return;
      }
      if (!point.hasOwnProperty('thrust')) {
        error('missing eng-data/f value; expected Newtons', true);
        return;
      }
      points.push(point);
    }
  }
  if (points.length < 2) {
    if (points.length < 1)
      error('no data points; expected at least two', true);
    else
      error('too few data points (' + points.length + '); expected at least two', true);
    return;
  }

  return {
    format: 'RockSim',
    info: info,
    points: points
  };
}

module.exports = {
  format: 'RockSim',
  parse: parse,
};
