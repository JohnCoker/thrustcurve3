/*
 * Copyright 2015 John Coker for ThrustCurve.org
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

var prefs = require('../prefs');

var LengthUnits = [
  {
    label: 'm',
    description: 'meters',
    digits: 3,
    toMKS: 1
  },
  {
    label: 'cm',
    description: 'centimeters',
    digits: 1,
    toMKS: 0.01
  },
  {
    label: 'mm',
    description: 'millimeters',
    digits: 0,
    toMKS: 0.001
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
  },
];

var MassUnits = [
  {
    label: 'kg',
    description: 'kilograms',
    digits: 3,
    toMKS: 1
  },
  {
    label: 'g',
    description: 'grams',
    digits: 0,
    toMKS: 0.001
  },
  {
    label: 'lb',
    description: 'pounds',
    digits: 2,
    toMKS: 0.453592
  },
  {
    label: 'oz',
    description: 'ounces',
    digits: 1,
    toMKS: 0.0283495
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

var unitTypes = [];

var Units = {
  length: LengthUnits,
  mass: MassUnits,
  force: ForceUnits,
  velocity: VelocityUnits,
  acceleration: AccelerationUnits,
  altitude: AltitudeUnits,
};
Object.keys(Units).forEach(function(prop, type) {
  var units, labels, i;

  units = Units[prop];
  units.type = type;
  units.get = function(label) {
    for (i = 0; i < units.length; i++) {
      if (units[i].label == label)
        return units[i];
    }
  };

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
    altitude: 'm'
  },
  {
    label: 'in/oz',
    description: 'inches & ounces',
    length: 'in',
    mass: 'oz',
    force: 'N',
    velocity: 'ft/s',
    acceleration: 'ft/s²',
    altitude: 'ft'
  },
  {
    label: 'in/lb',
    description: 'inches & pounds',
    length: 'in',
    mass: 'lb',
    force: 'N',
    velocity: 'ft/s',
    acceleration: 'ft/s²',
    altitude: 'ft'
  },
  {
    label: 'CGS',
    description: 'centimeters & grams',
    length: 'cm',
    mass: 'g',
    force: 'N',
    velocity: 'm/s',
    acceleration: 'm/s²',
    altitude: 'm'
  },
  {
    label: 'MKS',
    description: 'meters & kilograms',
    length: 'm',
    mass: 'kg',
    force: 'N',
    velocity: 'm/s',
    acceleration: 'm/s²',
    altitude: 'm'
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

function getUnit(type) {
  var s, set, choice, unit;

  if (typeof type == 'object' && typeof type.label == 'string' && typeof type.toMKS == 'number')
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
    unit = { label: '?', digits: 3, toMKS: 1 };
  return unit;
}

function getDefaults() {
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

function setDefaults(set) {
  var s;

  if (set == null)
    prefs.set('defaultUnits', undefined);
  else
    prefs.set('defaultUnits', set.label);
}

function convertToMKS(n, type) {
  var unit = getUnit(type);
  if (typeof n != 'number')
    n = parseFloat(n);
  return n * unit.toMKS;
}

function convertFromMKS(n, type) {
  var unit = getUnit(type);
  if (typeof n != 'number')
    n = parseFloat(n);
  return n / unit.toMKS;
}

function formatFromMKS(n, type, fixed) {
  var unit = getUnit(type),
      v = convertFromMKS(n, unit),
      d = unit.digits,
      s;

  if (typeof v != 'number' || isNaN(v))
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

function convertMMTFromMKS(n) {
  return Math.round(n * 10000) / 10;
}

function formatMMTFromMKS(n) {
  var v, s;

  if (typeof n != 'number' || isNaN(n))
    return "";

  v = convertMMTFromMKS(n);
  if (isNaN(v) || v < 1)
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

module.exports = {
  get: getUnit,
  getDefaults: getDefaults,
  setDefaults: setDefaults,
  convertToMKS: convertToMKS,
  convertFromMKS: convertFromMKS,
  formatFromMKS: formatFromMKS,
  convertMMTFromMKS: convertMMTFromMKS,
  formatMMTFromMKS: formatMMTFromMKS,
  defaults: UnitDefaults
};

Object.keys(Units).forEach(function(prop) {
  module.exports[prop] = Units[prop];
});

