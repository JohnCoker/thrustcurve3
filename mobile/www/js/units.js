(function(global) {
  'use strict';

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

  var chosenUnits, unitTypes = [];
  
  var Units = {
    length: LengthUnits,
    mass: MassUnits,
    force: ForceUnits,
    velocity: VelocityUnits,
    acceleration: AccelerationUnits,
    altitude: AltitudeUnits,
  };
  Object.keys(Units).forEach(function(prop, type) {
    var units = Units[prop];
    units.type = type;
    units.get = function(label) {
      for (var i = 0; i < units.length; i++) {
        if (units[i].label == label)
          return units[i];
      }
    };
    Object.freeze(units);
    unitTypes.push(prop);
  });
  Units.getDefaults = function() {
    if (chosenUnits != null && typeof chosenUnits == 'object')
      return chosenUnits;

    chosenUnits = loadStorage('units');
    if (chosenUnits != null && typeof chosenUnits == 'object')
      return chosenUnits;

    return UnitDefaults[0];
  };
  Units.setDefaults = function(set) {
    if (set == null || typeof set != 'object') {
      chosenUnits = null;
      removeStorage('units');
    } else {
      chosenUnits = set;
      saveStorage('units', set);
    }
    $.event.trigger({
      type: 'unitsChanged'
    });
  };
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
  for (var i = 0; i < UnitDefaults.length; i++) {
    var set = UnitDefaults[i];
    set.defaults = true;
    /* jshint loopfunc:true */
    set.copy = function() {
      var copy = {
        label: this.label,
        defaults: this.defaults,
        length: this.length,
        mass: this.mass,
        force: this.force,
        velocity: this.velocity,
        acceleration: this.acceleration,
        altitude: this.altitude,
      };
      return copy;
    };
    Object.freeze(set);
  }
  UnitDefaults.get = function(label) {
    for (var i = 0; i < UnitDefaults.length; i++) {
      if (UnitDefaults[i].label == label)
        return UnitDefaults[i];
    }
  };
  Object.freeze(UnitDefaults);

  global.Units = Units;
  global.UnitDefaults = UnitDefaults;
})(this);

/* exported getUnit */
function getUnit(type) {
  var choices, choice, unit;

  if (typeof type == 'object' && typeof type.label == 'string' && typeof type.toMKS == 'number')
    return type;

  choices = Units.getDefaults();
  choice = choices[type];
  if (typeof choice == 'string')
    unit = Units[type].get(choice);

  if (unit == null)
    unit = { label: '?', digits: 3, toMKS: 1 };
  return unit;
}

/* exported convertToMKS */
function convertToMKS(n, type) {
  var unit = getUnit(type);
  if (typeof n != 'number')
    n = parseFloat(n);
  return n * unit.toMKS;
}

/* exported convertFromMKS */
function convertFromMKS(n, type) {
  var unit = getUnit(type);
  if (typeof n != 'number')
    n = parseFloat(n);
  return n / unit.toMKS;
}

/* exported formatFromMKS */
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

/* exported convertMMTFromMKS */
function convertMMTFromMKS(n) {
  return Math.round(n * 1000, 1);
}
