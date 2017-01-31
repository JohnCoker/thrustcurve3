/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var prefs = require('../prefs');

var LengthUnits = [
  {
    label: 'mm',
    description: 'millimeters',
    digits: 0,
    toMKS: 0.001
  },
  {
    label: 'cm',
    description: 'centimeters',
    digits: 1,
    toMKS: 0.01
  },
  {
    label: 'm',
    description: 'meters',
    digits: 3,
    toMKS: 1
  },
  {
    label: 'in',
    description: 'inches',
    digits: 2,
    toMKS: 0.0254
  },
  {
    label: 'ft',
    description: 'feet',
    digits: 2,
    toMKS: 0.3048
  }
];

var MassUnits = [
  {
    label: 'g',
    description: 'grams',
    digits: 0,
    toMKS: 0.001
  },
  {
    label: 'kg',
    description: 'kilograms',
    digits: 3,
    toMKS: 1
  },
  {
    label: 'oz',
    description: 'ounces',
    digits: 1,
    toMKS: 0.0283495
  },
  {
    label: 'lb',
    description: 'pounds',
    digits: 2,
    toMKS: 0.453592
  }
];

var ForceUnits = [
  {
    label: 'N',
    description: 'newtons',
    digits: 1,
    toMKS: 1
  },
  {
    label: 'lbf',
    description: 'pounds-force',
    digits: 2,
    toMKS: 4.4482216
  }
];

var VelocityUnits = [
  {
    label: 'm/s',
    description: 'meters per second',
    digits: 1,
    toMKS: 1
  },
  {
    label: 'kph',
    description: 'kilometers per hour',
    digits: 3,
    toMKS: 0.27778
  },
  {
    label: 'ft/s',
    description: 'feet per second',
    digits: 1,
    toMKS: 0.3048
  },
  {
    label: 'mph',
    description: 'miles per hour',
    digits: 3,
    toMKS: 0.44704
  }
];

var AccelerationUnits = [
  {
    label: 'm/s²',
    description: 'meters per sq sec',
    digits: 1,
    toMKS: 1
  },
  {
    label: 'ft/s²',
    description: 'feet per sq sec',
    digits: 1,
    toMKS: 0.3048
  },
  {
    label: 'G',
    description: 'standard gravity',
    digits: 2,
    toMKS: 9.80665
  }
];

var AltitudeUnits = [
  {
    label: 'm',
    description: 'meters',
    digits: 0,
    toMKS: 1
  },
  {
    label: 'km',
    description: 'kilometers',
    digits: 2,
    toMKS: 1000
  },
  {
    label: 'ft',
    description: 'feet',
    digits: 0,
    toMKS: 0.3048
  },
  {
    label: 'mi',
    description: 'miles',
    digits: 2,
    toMKS: 1609.34
  }
];

var TemperatureUnits = [
  {
    label: '℃',
    description: 'degrees Celcius',
    digits: 1,
    toMKS: 1
  },
  {
    label: '℉',
    description: 'degrees Farenheit',
    digits: 0,
    toMKS: function(n) { return (n - 32) * 5/9; },
    fromMKS: function(n) { return n * 9/5 + 32; }
  }
];

var unitTypes = [];

var Units = {
  length: LengthUnits,
  mass: MassUnits,
  force: ForceUnits,
  velocity: VelocityUnits,
  acceleration: AccelerationUnits,
  altitude: AltitudeUnits,
  temperature: TemperatureUnits,
};
Object.keys(Units).forEach(function(prop, type) {
  var units, labels, cvt, i;

  units = Units[prop];
  units.type = type;

  // define conversion functions
  for (i = 0; i < units.length; i++) {
    if (typeof units[i].toMKS == 'number') {
      cvt = units[i].toMKS;
      units[i].toMKS = new Function('n', 'return n * ' + cvt + ';');
      units[i].fromMKS = new Function('n', 'return n / ' + cvt + ';');
    }
  }

  // define get function
  units.get = function(label) {
    for (var i = 0; i < this.length; i++) {
      if (this[i].label == label)
        return this[i];
    }
  };

  // set up list of labels
  labels = [];
  for (i = 0; i < units.length; i++)
    labels.push(units[i].label);
  Object.freeze(labels);
  units.labels = labels;

  Object.freeze(units);
  unitTypes.push(prop);
});
Object.freeze(unitTypes);
Units.types = unitTypes;
Object.freeze(Units);

var UnitDefaults = [
  {
    label: 'mm/g',
    description: 'millimeters & grams',
    length: 'mm',
    mass: 'g',
    force: 'N',
    velocity: 'm/s',
    acceleration: 'm/s²',
    altitude: 'm',
    temperature: '℃'
  },
  {
    label: 'in/oz',
    description: 'inches & ounces',
    length: 'in',
    mass: 'oz',
    force: 'N',
    velocity: 'ft/s',
    acceleration: 'ft/s²',
    altitude: 'ft',
    temperature: '℉'
  },
  {
    label: 'in/lb',
    description: 'inches & pounds',
    length: 'in',
    mass: 'lb',
    force: 'N',
    velocity: 'ft/s',
    acceleration: 'ft/s²',
    altitude: 'ft',
    temperature: '℉'
  },
  {
    label: 'CGS',
    description: 'centimeters & grams',
    length: 'cm',
    mass: 'g',
    force: 'N',
    velocity: 'm/s',
    acceleration: 'm/s²',
    altitude: 'm',
    temperature: '℃',
  },
  {
    label: 'MKS',
    description: 'meters & kilograms',
    length: 'm',
    mass: 'kg',
    force: 'N',
    velocity: 'm/s',
    acceleration: 'm/s²',
    altitude: 'm',
    temperature: '℃',
  }
];
var labels = [];
for (var i = 0; i < UnitDefaults.length; i++) {
  var set = UnitDefaults[i];
  Object.freeze(set);
  labels.push(set.label);
}
UnitDefaults.get = function(label) {
  for (var i = 0; i < UnitDefaults.length; i++) {
    if (UnitDefaults[i].label == label)
      return UnitDefaults[i];
  }
};
Object.freeze(labels);
UnitDefaults.labels = labels;
Object.freeze(UnitDefaults);

const FakeUnit = {
  label: '?',
  digits: 3,
  toMKS: function(n) { return n; },
  fromMKS: function(n) { return n; }
};
Object.freeze(FakeUnit);

function getUnit(type, u) {
  var set, unit;

  set = Units[type];
  if (set != null)
    unit = set.get(u);
  if (unit == null)
    unit = FakeUnit;
  return unit;
}

function getUnitPref(type) {
  var s, set, choice, unit;

  if (typeof type == 'object' && typeof type.label == 'string' && typeof type.toMKS == 'function')
    return type;

  // try specific unit preference
  s = prefs.get(type + 'Unit');
  if (typeof s == 'string') {
    unit = Units[type].get(s);
    if (unit != null)
      return unit;
  }

  // default units preference
  s = prefs.get('defaultUnits');
  if (typeof s == 'string') {
    set = UnitDefaults.get(s);
    if (set != null) {
      choice = set[type];
      if (typeof choice == 'string')
        unit = Units[type].get(choice);
    }
  }

  // fall back to global defaults
  if (unit == null) {
    set = UnitDefaults[0];
    choice = set[type];
    if (typeof choice == 'string')
      unit = Units[type].get(choice);
  }

  if (unit == null)
    unit = FakeUnit;
  return unit;
}

function getDefaultsPref() {
  var s, set;

  // default units preference
  s = prefs.get('defaultUnits');
  if (typeof s == 'string') {
    set = UnitDefaults.get(s);
    if (set != null)
      return set;
  }

  // fall back to global defaults
  return UnitDefaults[0];
}

function setDefaultsPref(set) {
  if (set == null)
    prefs.set('defaultUnits', undefined);
  else
    prefs.set('defaultUnits', set.label);
}

function convertPrefToMKS(n, type) {
  var unit = getUnitPref(type);
  if (typeof n != 'number')
    n = parseFloat(n);
  return unit.toMKS(n);
}

function convertPrefFromMKS(n, type) {
  var unit = getUnitPref(type);
  if (typeof n != 'number')
    n = parseFloat(n);
  return unit.fromMKS(n);
}

function formatPrefFromMKS(n, type, fixed) {
  var unit = getUnitPref(type),
      v = convertPrefFromMKS(n, unit);
  return formatUnit(v, type, unit.label, fixed);
}

function formatUnit(v, type, u, fixed) {
  var unit = getUnit(type, u),
      d = unit.digits,
      s;

  if (typeof v != 'number' || isNaN(v) || !Number.isFinite(v))
    return "";

  // get maximum number of digits and fixed precision
  if (typeof d != 'number')
    d = 0;
  if (typeof fixed == 'number') {
    d = fixed;
    fixed = true;
  }

  // keep four digits of precision, if not fixed precision
  if (d > 0 && !fixed) {
    if (d > 2 && v >= 10.0)
      d = 2;
    if (d > 1 && v >= 100.0)
      d = 1;
    if (d > 0 && v >= 1000.0)
      d = 0;
  }

  s = v.toFixed(d);
  if (!fixed)
    s = s.replace(/^([^.]*\.[0-9])0+$/, "$1");
  return s + unit.label;
}

function convertUnitToMKS(n, type, unit) {
  unit = getUnit(type, unit);
  if (typeof n != 'number')
    n = parseFloat(n);
  return unit.toMKS(n);
}

function convertUnitFromMKS(n, type, unit) {
  unit = getUnit(type, unit);
  if (typeof n != 'number')
    n = parseFloat(n);
  return unit.fromMKS(n);
}

function convertMMTToMKS(n) {
  return n / 1000;
}

function convertMMTFromMKS(n) {
  return Math.round(n * 10000) / 10;
}

function formatMMTFromMKS(n) {
  var v, s;

  if (typeof n != 'number' || isNaN(n))
    return "";

  v = convertMMTFromMKS(n);
  if (isNaN(v) || !Number.isFinite(v) || v < 1)
    return "";

  if (v > 12) {
    s = v.toFixed();
  } else {
    s = v.toFixed(1);
    if (/\.0$/.test(s))
      s = s.replace(/\.0$/, '');
  }

  return s + 'mm';
}

function defaultGuideLength() {
  var unit = getUnitPref('length');
  if (unit.label == 'in' || unit.label == 'ft')
    return { value: 3, unit: 'ft', mks: convertUnitToMKS(3, 'length', 'ft') };
  else
    return { value: 1, unit: 'm', mks: 1 };
}

/**
 * <p>The units module contains metadata on possible known known measurement types
 * and the possible unit choices for each.
 * For example, length measurements can be made in a variety of units such as
 * inches, or centimeters and mass measurements can be made in ounces or grams.</p>
 *
 * <p>It also contains methods to convert units since all calculations are done in MKS,
 * but display is done in whatever units the user prefers.</p>
 *
 * <p>The measurement types are:</p>
 * <ul>
 * <li>length: measurements of lengths of your rocket</li>
 * <li>mass: measurements of weight</li>
 * <li>force: measurements instantaneous force</li>
 * <li>velocity: measurements of speed</li>
 * <li>acceleration: measurements of change in speed</li>
 * <li>altitude: measurements of achieved height</li>
 * </ul>
 *
 * <p>Each unit choice has the following properties:</p>
 * <ul>
 * <li>label: identifying label such as "mm"</li>
 * <li>description: full name such as "millimeters"</li>
 * <li>digits: number of significant digits in measurements</li>
 * <li>toMKS: conversion function from this unit to the MKS equivalent</li>
 * <li>fromMKS: conversion function from the MKS equivalent to this unit</li>
 * </ul>
 *
 * <p>In addition to units, there are also sets of defaults:</p>
 * <ul>
 * <li>mm/g: international model rocket units</li>
 * <li>in/oz: imperial model and mid-power units</li>
 * <li>in/lb: imperial high-power units</li>
 * <li>CGS: centimeters/grams/seconds standard units</li>
 * <li>MKS: meters/kilograms/seconds standard units</li>
 * </ul>
 *
 * <p>Each default has the following properties:</p>
 * <ul>
 * <li>label: identifying label such as "mm/g"</li>
 * <li>description: full name such as "millimeters & grams"</li>
 * <li>length: chosen length unit such as "mm"</li>
 * <li>mass: chosen mass unit such as "g"</li>
 * <li>force: chosen force unit such as "N"</li>
 * <li>velocity: chosen velocity unit such as "m/s"</li>
 * <li>acceleration: chosen acceleration unit such as "m/s²"</li>
 * <li>altitude: chosen altitude unit such as "m"</li>
 * <li>temperature: chosen temperature unit such as "℃"</li>
 * </ul>
 *
 * @module units
 */
module.exports = {
  /**
   * The possible units for measuring length.
   * @member {object[]}
   */
  length: LengthUnits,

  /**
   * The possible units for measuring mass.
   * @member {object[]}
   */
  mass: MassUnits,

  /**
   * The possible units for measuring force.
   * @member {object[]}
   */
  force: ForceUnits,

  /**
   * The possible units for measuring velocity.
   * @member {object[]}
   */
  velocity: VelocityUnits,

  /**
   * The possible units for measuring acceleration.
   * @member {object[]}
   */
  acceleration: AccelerationUnits,

  /**
   * The possible units for measuring altitude.
   * @member {object[]}
   */
  altitude: AltitudeUnits,

  /**
   * The possible units for measuring temperature.
   * @member {object[]}
   */
  temperature: TemperatureUnits,

  /**
   * The list of default sets.  Each set has a name and a choice for
   * each of the measurement types.
   * For example, the "mm/g" default set chooses millimeters for length
   * and grams for mass (among others such as meters for altitude).
   * @member {object[]}
   */
  defaults: UnitDefaults,

  /**
   * Get the default set chosen as the user preference.
   * @function
   * @return {object}
   */
  getDefaultsPref: getDefaultsPref,

  /**
   * Change the default set chosen as the user preference.
   * @function
   * @param {object} chosen default set
   */
  setDefaultsPref: setDefaultsPref,

  /**
   * Get the preferred unit for a certain measurement.
   * @function
   * @param {string} measurement type label, such as "length"
   * @return {object} unit information
   */
  getUnitPref: getUnitPref,

  /**
   * Convert a measurement from the preferred units to MKS.
   * @function
   * @param {number} n value to convert
   * @param {string} measurement type label, such as "length"
   * @return {number} value in MKS
   */
  convertPrefToMKS: convertPrefToMKS,

  /**
   * Convert a measurement from MKS to the preferred unit.
   * @function
   * @param {number} n value to convert
   * @param {string} measurement type label, such as "length"
   * @return {number} value in preferred unit
   */
  convertPrefFromMKS: convertPrefFromMKS,

  /**
   * Format a measurement for display, including the units.
   * The value is in MKS, but the formatted value will be converted
   * the preferred units.
   * @function
   * @param {number} n value to format
   * @param {string} measurement type label, such as "length"
   * @return {string} formatted value in preferred unit
   */
  formatPrefFromMKS: formatPrefFromMKS,

  /**
   * Format a measurement for display, including the units.
   * The value is in the specified, and will not be converted for display.
   * @function
   * @param {number} n value to format
   * @param {string} measurement type label, such as "length"
   * @param {string} unit measurement unit, such as "in"
   * @return {string} formatted value in specified unit
   */
  formatUnit: formatUnit,

  /**
   * Convert a measurement from a specified unit to MKS.
   * @function
   * @param {number} n value to convert
   * @param {string} measurement type label, such as "length"
   * @param {string} unit value unit, such as "in"
   * @return {number} value in MKS
   */
  convertUnitToMKS: convertUnitToMKS,

  /**
   * Convert a measurement from MKS to a specified unit.
   * @function
   * @param {number} n value to convert
   * @param {string} measurement type label, such as "length"
   * @param {string} unit value unit, such as "in"
   * @return {number} value in specified unit
   */
  convertUnitFromMKS: convertUnitFromMKS,

  /**
   * Convert a motor mount tube diameter to MKS.
   * Motor diameters are always in millimeters, regardless of the unit preferences.
   * @function
   * @param {number} n value to convert
   * @return {number} diameter in meters
   */
  convertMMTToMKS: convertMMTToMKS,

  /**
   * Convert a motor mount tube diameter from MKS.
   * Motor diameters are always in millimeters, regardless of the unit preferences.
   * @function
   * @param {number} n value to convert
   * @return {number} diameter in millimeters
   */
  convertMMTFromMKS: convertMMTFromMKS,

  /**
   * Format a motor mount tube diameter in MKS.
   * Motor diameters are always in millimeters, regardless of the unit preferences.
   * @function
   * @param {number} n value to convert
   * @return {string} formatted value
   */
  formatMMTFromMKS: formatMMTFromMKS,

  /**
   * Get a default rocket guide length.
   * @function
   * @return {object} length and unit
   */
  defaultGuideLength: defaultGuideLength,
};
