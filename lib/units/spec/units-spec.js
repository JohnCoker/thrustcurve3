"use strict";

var sessionStorage = require('continuation-local-storage').createNamespace('session'),
    units = require(".."),
    prefs = require("../../prefs"),
    data = {};

describe('units', function() {
  beforeEach(function() {
    spyOn(sessionStorage, 'get').and.callFake(function(key) {
      if (key == 'prefs')
        return data;
    });
    Object.keys(data).forEach(function(k) {
      delete data[k];
    });
  });

  describe('module', function() {
    it("must exist", function() {
      expect(units).toBeDefined();
      expect(typeof units).toBe('object');
    });
    it("must have length", function() {
      expect(units.length).toBeDefined();
      expect(units.length instanceof Array).toBe(true);
    });
    it("must have mass", function() {
      expect(units.mass).toBeDefined();
      expect(units.mass instanceof Array).toBe(true);
    });
    it("must have force", function() {
      expect(units.force).toBeDefined();
      expect(units.force instanceof Array).toBe(true);
    });
    it("must have velocity", function() {
      expect(units.velocity).toBeDefined();
      expect(units.velocity instanceof Array).toBe(true);
    });
    it("must have acceleration", function() {
      expect(units.acceleration).toBeDefined();
      expect(units.acceleration instanceof Array).toBe(true);
    });
    it("must have altitude", function() {
      expect(units.altitude).toBeDefined();
      expect(units.altitude instanceof Array).toBe(true);
    });
    it("must have temperature", function() {
      expect(units.temperature).toBeDefined();
      expect(units.temperature instanceof Array).toBe(true);
    });
    it("must have defaults", function() {
      expect(units.defaults).toBeDefined();
      expect(units.defaults instanceof Array).toBe(true);
    });
  });

  describe('getUnitPref', function() {
    describe('default', function() {
      it("choice must be unset", function() {
        prefs.clear();
        expect(prefs.get('defaultUnits')).toBeUndefined();
      });
      it("length must be mm", function() {
        var u = units.getUnitPref('length');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('mm');
        expect(u.toMKS(1)).toBe(0.001);
      });
      it("mass must be g", function() {
        var u = units.getUnitPref('mass');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('g');
        expect(u.toMKS(1)).toBe(0.001);
      });
      it("force must be N", function() {
        var u = units.getUnitPref('force');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('N');
        expect(u.toMKS(1)).toBe(1);
      });
      it("velocity must be m/s", function() {
        var u = units.getUnitPref('velocity');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m/s');
        expect(u.toMKS(1)).toBe(1);
      });
      it("acceleration must be m/s²", function() {
        var u = units.getUnitPref('acceleration');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m/s²');
        expect(u.toMKS(1)).toBe(1);
      });
      it("altitude must be m", function() {
        var u = units.getUnitPref('altitude');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m');
        expect(u.toMKS(1)).toBe(1);
      });
      it("temperature must be ℃", function() {
        var u = units.getUnitPref('temperature');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('℃');
        expect(u.toMKS(1)).toBe(1);
      });
    });
    describe('mm/g', function() {
      beforeEach(function() {
        units.setDefaultsPref(units.defaults.get('mm/g'));
      });
      it("choice must be set", function() {
        var choice = units.getDefaultsPref();
        expect(choice).toBeDefined();
        expect(choice.label).toBe('mm/g');
      });
      it("length must be mm", function() {
        var u = units.getUnitPref('length');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('mm');
        expect(u.toMKS(1)).toBe(0.001);
      });
      it("mass must be g", function() {
        var u = units.getUnitPref('mass');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('g');
        expect(u.toMKS(1)).toBe(0.001);
      });
      it("force must be N", function() {
        var u = units.getUnitPref('force');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('N');
        expect(u.toMKS(1)).toBe(1);
      });
      it("velocity must be m/s", function() {
        var u = units.getUnitPref('velocity');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m/s');
        expect(u.toMKS(1)).toBe(1);
      });
      it("acceleration must be m/s²", function() {
        var u = units.getUnitPref('acceleration');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m/s²');
        expect(u.toMKS(1)).toBe(1);
      });
      it("altitude must be m", function() {
        var u = units.getUnitPref('altitude');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m');
        expect(u.toMKS(1)).toBe(1);
      });
      it("temperature must be ℃", function() {
        var u = units.getUnitPref('temperature');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('℃');
        expect(u.toMKS(1)).toBe(1);
      });
    });
    describe('MKS', function() {
      beforeEach(function() {
        units.setDefaultsPref(units.defaults.get('MKS'));
      });
      it("choice must be set", function() {
        var choice = units.getDefaultsPref();
        expect(choice).toBeDefined();
        expect(choice.label).toBe('MKS');
      });
      it("length must be m", function() {
        var u = units.getUnitPref('length');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m');
        expect(u.toMKS(1)).toBe(1);
      });
      it("mass must be kg", function() {
        var u = units.getUnitPref('mass');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('kg');
        expect(u.toMKS(1)).toBe(1);
      });
      it("force must be N", function() {
        var u = units.getUnitPref('force');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('N');
        expect(u.toMKS(1)).toBe(1);
      });
      it("velocity must be m/s", function() {
        var u = units.getUnitPref('velocity');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m/s');
        expect(u.toMKS(1)).toBe(1);
      });
      it("acceleration must be m/s²", function() {
        var u = units.getUnitPref('acceleration');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m/s²');
        expect(u.toMKS(1)).toBe(1);
      });
      it("altitude must be m", function() {
        var u = units.getUnitPref('altitude');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m');
        expect(u.toMKS(1)).toBe(1);
      });
      it("temperature must be ℃", function() {
        var u = units.getUnitPref('temperature');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('℃');
        expect(u.toMKS(1)).toBe(1);
      });
    });
    describe('in/lb', function() {
      beforeEach(function() {
        units.setDefaultsPref(units.defaults.get('in/lb'));
      });
      it("choice must be set", function() {
        var choice = units.getDefaultsPref();
        expect(choice).toBeDefined();
        expect(choice.label).toBe('in/lb');
      });
      it("length must be in", function() {
        var u = units.getUnitPref('length');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('in');
        expect(u.toMKS(1).toFixed(4)).toBe('0.0254');
      });
      it("mass must be lb", function() {
        var u = units.getUnitPref('mass');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('lb');
        expect(u.toMKS(1).toFixed(4)).toBe('0.4536');
      });
      it("force must be N", function() {
        var u = units.getUnitPref('force');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('N');
        expect(u.toMKS(1)).toBe(1);
      });
      it("velocity must be ft/s", function() {
        var u = units.getUnitPref('velocity');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('ft/s');
        expect(u.toMKS(1).toFixed(4)).toBe('0.3048');
      });
      it("acceleration must be ft/s²", function() {
        var u = units.getUnitPref('acceleration');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('ft/s²');
        expect(u.toMKS(1).toFixed(4)).toBe('0.3048');
      });
      it("altitude must be ft", function() {
        var u = units.getUnitPref('altitude');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('ft');
        expect(u.toMKS(1).toFixed(4)).toBe('0.3048');
      });
      it("temperature must be ℉", function() {
        var u = units.getUnitPref('temperature');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('℉');
        expect(u.toMKS(32).toFixed(0)).toBe('0');
      });
    });
    describe('custom', function() {
      beforeEach(function() {
        prefs.clear();
        prefs.set('lengthUnit', 'in');
        prefs.set('massUnit', 'lb');
        prefs.set('forceUnit', 'lbf');
        prefs.set('velocityUnit', 'ft/s');
        prefs.set('accelerationUnit', 'ft/s²');
        prefs.set('altitudeUnit', 'mi');
        prefs.set('temperatureUnit', '℉');
      });
      it("length must be in", function() {
        var u = units.getUnitPref('length');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('in');
        expect(u.toMKS(1).toFixed(4)).toBe('0.0254');
      });
      it("mass must be lb", function() {
        var u = units.getUnitPref('mass');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('lb');
        expect(u.toMKS(1).toFixed(4)).toBe('0.4536');
      });
      it("force must be lbf", function() {
        var u = units.getUnitPref('force');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('lbf');
        expect(u.toMKS(1).toFixed(4)).toBe('4.4482');
      });
      it("velocity must be ft/s", function() {
        var u = units.getUnitPref('velocity');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('ft/s');
        expect(u.toMKS(1).toFixed(4)).toBe('0.3048');
      });
      it("acceleration must be ft/s²", function() {
        var u = units.getUnitPref('acceleration');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('ft/s²');
        expect(u.toMKS(1).toFixed(4)).toBe('0.3048');
      });
      it("altitude must be mi", function() {
        var u = units.getUnitPref('altitude');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('mi');
        expect(u.toMKS(1).toFixed(0)).toBe('1609');
      });
      it("temperature must be ℉", function() {
        var u = units.getUnitPref('temperature');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('℉');
        expect(u.toMKS(32).toFixed(0)).toBe('0');
      });
    });
  });

  describe("convertPrefToMKS", function() {
    var convertPrefToMKS = units.convertPrefToMKS;
    describe("default", function() {
      beforeEach(function() {
        prefs.clear();
      });
      it("length", function() {
        expect(convertPrefToMKS(1414, 'length')).toBe(1.414);
      });
      it("mass", function() {
        expect(convertPrefToMKS(1414, 'mass')).toBe(1.414);
      });
      it("force", function() {
        expect(convertPrefToMKS(1.414, 'force')).toBe(1.414);
      });
      it("velocity", function() {
        expect(convertPrefToMKS(1.414, 'velocity')).toBe(1.414);
      });
      it("acceleration", function() {
        expect(convertPrefToMKS(1.414, 'acceleration')).toBe(1.414);
      });
      it("altitude", function() {
        expect(convertPrefToMKS(1.414, 'altitude')).toBe(1.414);
      });
      it("temperature", function() {
        expect(convertPrefToMKS(14.1, 'temperature')).toBe(14.1);
      });
    });

    describe("in/lb", function() {
      beforeEach(function() {
        prefs.clear();
        units.setDefaultsPref(units.defaults.get('in/lb'));
      });
      it("length", function() {
        expect(convertPrefToMKS(1.414, 'length')).toBeCloseTo(0.0359156, 5);
      });
      it("mass", function() {
        expect(convertPrefToMKS(1.414, 'mass')).toBeCloseTo(0.64137961, 5);
      });
      it("force", function() {
        expect(convertPrefToMKS(1.414, 'force')).toBeCloseTo(1.414, 5);
      });
      it("velocity", function() {
        expect(convertPrefToMKS(1.414, 'velocity')).toBeCloseTo(0.4309872, 5);
      });
      it("acceleration", function() {
        expect(convertPrefToMKS(1.414, 'acceleration')).toBeCloseTo(0.4309872, 5);
      });
      it("altitude", function() {
        expect(convertPrefToMKS(1.414, 'altitude')).toBeCloseTo(0.4309872, 5);
      });
      it("temperature", function() {
        expect(convertPrefToMKS(14.1, 'temperature')).toBeCloseTo(-9.9, 1);
      });
    });
  });

  describe("convertPrefFromMKS", function() {
    var convertPrefFromMKS = units.convertPrefFromMKS;
    describe("default", function() {
      beforeEach(function() {
        prefs.clear();
      });
      it("length", function() {
        expect(convertPrefFromMKS(1.414, 'length')).toBe(1414);
      });
      it("mass", function() {
        expect(convertPrefFromMKS(1.414, 'mass')).toBe(1414);
      });
      it("force", function() {
        expect(convertPrefFromMKS(1.414, 'force')).toBe(1.414);
      });
      it("velocity", function() {
        expect(convertPrefFromMKS(1.414, 'velocity')).toBe(1.414);
      });
      it("acceleration", function() {
        expect(convertPrefFromMKS(1.414, 'acceleration')).toBe(1.414);
      });
      it("altitude", function() {
        expect(convertPrefFromMKS(1.414, 'altitude')).toBe(1.414);
      });
      it("altitude", function() {
        expect(convertPrefFromMKS(14.14, 'temperature')).toBe(14.14);
      });
    });

    describe("MKS", function() {
      beforeEach(function() {
        units.setDefaultsPref(units.defaults.get('MKS'));
      });
      it("length", function() {
        expect(convertPrefFromMKS(1.414, 'length')).toBeCloseTo(1.414, 5);
      });
      it("mass", function() {
        expect(convertPrefFromMKS(1.414, 'mass')).toBeCloseTo(1.414, 5);
      });
      it("force", function() {
        expect(convertPrefFromMKS(1.414, 'force')).toBeCloseTo(1.414, 5);
      });
      it("velocity", function() {
        expect(convertPrefFromMKS(1.414, 'velocity')).toBeCloseTo(1.414, 5);
      });
      it("acceleration", function() {
        expect(convertPrefFromMKS(1.414, 'acceleration')).toBeCloseTo(1.414, 5);
      });
      it("altitude", function() {
        expect(convertPrefFromMKS(1.414, 'altitude')).toBeCloseTo(1.414, 5);
      });
    });

    describe("CGS", function() {
      beforeEach(function() {
        units.setDefaultsPref(units.defaults.get('CGS'));
      });
      it("length", function() {
        expect(convertPrefFromMKS(1.414, 'length')).toBeCloseTo(141.4, 5);
      });
      it("mass", function() {
        expect(convertPrefFromMKS(1.414, 'mass')).toBeCloseTo(1414.0, 5);
      });
      it("force", function() {
        expect(convertPrefFromMKS(1.414, 'force')).toBeCloseTo(1.414, 5);
      });
      it("velocity", function() {
        expect(convertPrefFromMKS(1.414, 'velocity')).toBeCloseTo(1.414, 5);
      });
      it("acceleration", function() {
        expect(convertPrefFromMKS(1.414, 'acceleration')).toBeCloseTo(1.414, 5);
      });
      it("altitude", function() {
        expect(convertPrefFromMKS(1.414, 'altitude')).toBeCloseTo(1.414, 5);
      });
    });

    describe("in/lb", function() {
      beforeEach(function() {
        units.setDefaultsPref(units.defaults.get('in/lb'));
      });
      it("length", function() {
        expect(convertPrefFromMKS(1.414, 'length')).toBeCloseTo(55.669291, 4);
      });
      it("mass", function() {
        expect(convertPrefFromMKS(1.414, 'mass')).toBeCloseTo(3.1173364, 5);
      });
      it("force", function() {
        expect(convertPrefFromMKS(1.414, 'force')).toBeCloseTo(1.414, 5);
      });
      it("velocity", function() {
        expect(convertPrefFromMKS(1.414, 'velocity')).toBeCloseTo(4.6391076, 5);
      });
      it("acceleration", function() {
        expect(convertPrefFromMKS(1.414, 'acceleration')).toBeCloseTo(4.6391076, 5);
      });
      it("altitude", function() {
        expect(convertPrefFromMKS(1.414, 'altitude')).toBeCloseTo(4.6391076, 5);
      });
      it("temperature", function() {
        expect(convertPrefFromMKS(14.14, 'temperature')).toBeCloseTo(57.5, 1);
      });
    });

    describe("in/oz", function() {
      beforeEach(function() {
        units.setDefaultsPref(units.defaults.get('in/oz'));
      });
      it("length", function() {
        expect(convertPrefFromMKS(1.414, 'length')).toBeCloseTo(55.669291, 4);
      });
      it("mass", function() {
        expect(convertPrefFromMKS(1.414, 'mass')).toBeCloseTo(49.877382, 4);
      });
      it("force", function() {
        expect(convertPrefFromMKS(1.414, 'force')).toBeCloseTo(1.414, 5);
      });
      it("velocity", function() {
        expect(convertPrefFromMKS(1.414, 'velocity')).toBeCloseTo(4.639108, 5);
      });
      it("acceleration", function() {
        expect(convertPrefFromMKS(1.414, 'acceleration')).toBeCloseTo(4.639108, 5);
      });
      it("altitude", function() {
        expect(convertPrefFromMKS(1.414, 'altitude')).toBeCloseTo(4.639108, 5);
      });
      it("temperature", function() {
        expect(convertPrefFromMKS(14.14, 'temperature')).toBeCloseTo(57.5, 1);
      });
    });

    describe("custom", function() {
      beforeEach(function() {
        prefs.clear();
      });
      it("ft", function() {
        var u = units.length.get('ft');
        expect(u).toBeDefined();
        expect(u.label).toBe('ft');
        expect(convertPrefFromMKS(1.414, u)).toBeCloseTo(4.639108, 5);
      });
      it("lbf", function() {
        var u = units.force.get('lbf');
        expect(u).toBeDefined();
        expect(u.label).toBe('lbf');
        expect(convertPrefFromMKS(1.414, u)).toBeCloseTo(0.31787996, 6);
      });
      it("G", function() {
        var u = units.acceleration.get('G');
        expect(u).toBeDefined();
        expect(u.label).toBe('G');
        expect(convertPrefFromMKS(1.414, u)).toBeCloseTo(0.14418787, 6);
      });
      it("kph", function() {
        var u = units.velocity.get('kph');
        expect(u).toBeDefined();
        expect(u.label).toBe('kph');
        expect(convertPrefFromMKS(1.414, u)).toBeCloseTo(5.090359, 5);
      });
      it("mph", function() {
        var u = units.velocity.get('mph');
        expect(u).toBeDefined();
        expect(u.label).toBe('mph');
        expect(convertPrefFromMKS(1.414, u)).toBeCloseTo(3.163028, 5);
      });
      it("km", function() {
        var u = units.altitude.get('km');
        expect(u).toBeDefined();
        expect(u.label).toBe('km');
        expect(convertPrefFromMKS(1414.14, u)).toBeCloseTo(1.41414, 5);
      });
      it("mi", function() {
        var u = units.altitude.get('mi');
        expect(u).toBeDefined();
        expect(u.label).toBe('mi');
        expect(convertPrefFromMKS(1414.14, u)).toBeCloseTo(0.878706, 5);
      });
      it("℉", function() {
        var u = units.temperature.get('℉');
        expect(u).toBeDefined();
        expect(u.label).toBe('℉');
        expect(convertPrefFromMKS(14.14, u)).toBeCloseTo(57.5, 1);
      });
    });
  });

  describe("formatPrefFromMKS", function() {
    var formatPrefFromMKS = units.formatPrefFromMKS;
    describe("MKS", function() {
      beforeEach(function() {
        units.setDefaultsPref(units.defaults.get('MKS'));
      });
      it("length small", function() {
        expect(formatPrefFromMKS(1, 'length')).toBe('1.0\u00A0m');
      });
      it("length small fixed", function() {
        expect(formatPrefFromMKS(1, 'length', true)).toBe('1.000\u00A0m');
      });
      it("length large", function() {
        expect(formatPrefFromMKS(12345.67, 'length')).toBe('12,346\u00A0m');
      });
      it("length large fixed", function() {
        expect(formatPrefFromMKS(12345.67, 'length', true)).toBe('12,345.670\u00A0m');
      });
      it("mass", function() {
        expect(formatPrefFromMKS(1.0, 'mass')).toBe('1.0\u00A0kg');
      });
      it("mass large", function() {
        expect(formatPrefFromMKS(12345.67, 'mass')).toBe('12,346\u00A0kg');
      });
      it("mass large fixed", function() {
        expect(formatPrefFromMKS(12345.67, 'mass', true)).toBe('12,345.670\u00A0kg');
      });
      it("force", function() {
        expect(formatPrefFromMKS(1.0, 'force')).toBe('1.0\u00A0N');
      });
      it("force large", function() {
        expect(formatPrefFromMKS(12345.67, 'force')).toBe('12,346\u00A0N');
      });
      it("force large fixed", function() {
        expect(formatPrefFromMKS(12345.67, 'force', true)).toBe('12,345.7\u00A0N');
      });
      it("velocity", function() {
        expect(formatPrefFromMKS(1.0, 'velocity')).toBe('1.0\u00A0m/s');
      });
      it("velocity large", function() {
        expect(formatPrefFromMKS(12345.67, 'velocity')).toBe('12,346\u00A0m/s');
      });
      it("velocity large fixed", function() {
        expect(formatPrefFromMKS(12345.67, 'velocity', true)).toBe('12,345.7\u00A0m/s');
      });
      it("acceleration", function() {
        expect(formatPrefFromMKS(1.0, 'acceleration')).toBe('1.0\u00A0m/s²');
      });
      it("acceleration large", function() {
        expect(formatPrefFromMKS(12345.67, 'acceleration')).toBe('12,346\u00A0m/s²');
      });
      it("acceleration large fixed", function() {
        expect(formatPrefFromMKS(12345.67, 'acceleration', true)).toBe('12,345.7\u00A0m/s²');
      });
      it("altitude", function() {
        expect(formatPrefFromMKS(1.0, 'altitude')).toBe('1\u00A0m');
      });
      it("altitude large", function() {
        expect(formatPrefFromMKS(12345.67, 'altitude')).toBe('12,346\u00A0m');
      });
      it("altitude large fixed", function() {
        expect(formatPrefFromMKS(12345.67, 'altitude', true)).toBe('12,346\u00A0m');
      });
    });

    describe("CGS", function() {
      beforeEach(function() {
        units.setDefaultsPref(units.defaults.get('CGS'));
      });
      it("length small", function() {
        expect(formatPrefFromMKS(1, 'length')).toBe('100.0\u00A0cm');
      });
      it("length small fixed", function() {
        expect(formatPrefFromMKS(1, 'length', true)).toBe('100.0\u00A0cm');
      });
      it("length large", function() {
        expect(formatPrefFromMKS(12345.67, 'length')).toBe('1,234,567\u00A0cm');
      });
      it("length large fixed", function() {
        expect(formatPrefFromMKS(12345.67, 'length', true)).toBe('1,234,567.0\u00A0cm');
      });
      it("mass", function() {
        expect(formatPrefFromMKS(1.0, 'mass')).toBe('1,000\u00A0g');
      });
      it("mass large", function() {
        expect(formatPrefFromMKS(12345.67, 'mass')).toBe('12,345,670\u00A0g');
      });
      it("mass large fixed", function() {
        expect(formatPrefFromMKS(12345.67, 'mass', true)).toBe('12,345,670\u00A0g');
      });
      it("force", function() {
        expect(formatPrefFromMKS(1.0, 'force')).toBe('1.0\u00A0N');
      });
      it("force large", function() {
        expect(formatPrefFromMKS(12345.67, 'force')).toBe('12,346\u00A0N');
      });
      it("force large fixed", function() {
        expect(formatPrefFromMKS(12345.67, 'force', true)).toBe('12,345.7\u00A0N');
      });
      it("velocity", function() {
        expect(formatPrefFromMKS(1.0, 'velocity')).toBe('1.0\u00A0m/s');
      });
      it("velocity large", function() {
        expect(formatPrefFromMKS(12345.67, 'velocity')).toBe('12,346\u00A0m/s');
      });
      it("velocity large fixed", function() {
        expect(formatPrefFromMKS(12345.67, 'velocity', true)).toBe('12,345.7\u00A0m/s');
      });
      it("acceleration", function() {
        expect(formatPrefFromMKS(1.0, 'acceleration')).toBe('1.0\u00A0m/s²');
      });
      it("acceleration large", function() {
        expect(formatPrefFromMKS(12345.67, 'acceleration')).toBe('12,346\u00A0m/s²');
      });
      it("acceleration large fixed", function() {
        expect(formatPrefFromMKS(12345.67, 'acceleration', true)).toBe('12,345.7\u00A0m/s²');
      });
      it("altitude", function() {
        expect(formatPrefFromMKS(1.0, 'altitude')).toBe('1\u00A0m');
      });
      it("altitude large", function() {
        expect(formatPrefFromMKS(12345.67, 'altitude')).toBe('12,346\u00A0m');
      });
      it("altitude large fixed", function() {
        expect(formatPrefFromMKS(12345.67, 'altitude', true)).toBe('12,346\u00A0m');
      });
    });

    describe("in/lb", function() {
      beforeEach(function() {
        units.setDefaultsPref(units.defaults.get('in/lb'));
      });
      it("length small", function() {
        expect(formatPrefFromMKS(0.0254, 'length')).toBe('1.0\u00A0in');
      });
      it("length large", function() {
        expect(formatPrefFromMKS(254.0, 'length')).toBe('10,000\u00A0in');
      });
      it("length large fixed", function() {
        expect(formatPrefFromMKS(254.0, 'length', true)).toBe('10,000.00\u00A0in');
      });
      it("mass small", function() {
        expect(formatPrefFromMKS(0.453592, 'mass')).toBe('1.0\u00A0lb');
      });
      it("mass large", function() {
        expect(formatPrefFromMKS(4535.92, 'mass')).toBe('10,000\u00A0lb');
      });
      it("mass large fixed", function() {
        expect(formatPrefFromMKS(4535.92, 'mass', true)).toBe('10,000.00\u00A0lb');
      });
      it("force small", function() {
        expect(formatPrefFromMKS(1.0, 'force')).toBe('1.0\u00A0N');
      });
      it("force large", function() {
        expect(formatPrefFromMKS(1000.0, 'force')).toBe('1,000\u00A0N');
      });
      it("force large fixed", function() {
        expect(formatPrefFromMKS(1000.0, 'force', true)).toBe('1,000.0\u00A0N');
      });
      it("velocity small", function() {
        expect(formatPrefFromMKS(0.3048, 'velocity')).toBe('1.0\u00A0ft/s');
      });
      it("velocity large", function() {
        expect(formatPrefFromMKS(3048.0, 'velocity')).toBe('10,000\u00A0ft/s');
      });
      it("velocity large fixed", function() {
        expect(formatPrefFromMKS(3048.0, 'velocity', true)).toBe('10,000.0\u00A0ft/s');
      });
      it("acceleration small", function() {
        expect(formatPrefFromMKS(0.3048, 'acceleration')).toBe('1.0\u00A0ft/s²');
      });
      it("acceleration large", function() {
        expect(formatPrefFromMKS(3048.0, 'acceleration')).toBe('10,000\u00A0ft/s²');
      });
      it("acceleration large fixed", function() {
        expect(formatPrefFromMKS(3048.0, 'acceleration', true)).toBe('10,000.0\u00A0ft/s²');
      });
      it("altitude small", function() {
        expect(formatPrefFromMKS(0.3048, 'altitude')).toBe('1\u00A0ft');
      });
      it("altitude large", function() {
        expect(formatPrefFromMKS(3048.0, 'altitude')).toBe('10,000\u00A0ft');
      });
      it("altitude large fixed", function() {
        expect(formatPrefFromMKS(3048.0, 'altitude', true)).toBe('10,000\u00A0ft');
      });
    });

    describe("in/oz", function() {
      beforeEach(function() {
        units.setDefaultsPref(units.defaults.get('in/oz'));
      });
      it("length small", function() {
        expect(formatPrefFromMKS(0.0254, 'length')).toBe('1.0\u00A0in');
      });
      it("length large", function() {
        expect(formatPrefFromMKS(254.0, 'length')).toBe('10,000\u00A0in');
      });
      it("length large fixed", function() {
        expect(formatPrefFromMKS(254.0, 'length', true)).toBe('10,000.00\u00A0in');
      });
      it("mass small", function() {
        expect(formatPrefFromMKS(0.0283495, 'mass')).toBe('1.0\u00A0oz');
      });
      it("mass large", function() {
        expect(formatPrefFromMKS(283.495, 'mass')).toBe('10,000\u00A0oz');
      });
      it("mass large fixed", function() {
        expect(formatPrefFromMKS(283.495, 'mass', true)).toBe('10,000.0\u00A0oz');
      });
      it("force small", function() {
        expect(formatPrefFromMKS(1.0, 'force')).toBe('1.0\u00A0N');
      });
      it("force large", function() {
        expect(formatPrefFromMKS(1000.0, 'force')).toBe('1,000\u00A0N');
      });
      it("force large fixed", function() {
        expect(formatPrefFromMKS(1000.0, 'force', true)).toBe('1,000.0\u00A0N');
      });
      it("velocity small", function() {
        expect(formatPrefFromMKS(0.3048, 'velocity')).toBe('1.0\u00A0ft/s');
      });
      it("velocity large", function() {
        expect(formatPrefFromMKS(3048.0, 'velocity')).toBe('10,000\u00A0ft/s');
      });
      it("velocity large fixed", function() {
        expect(formatPrefFromMKS(3048.0, 'velocity', true)).toBe('10,000.0\u00A0ft/s');
      });
      it("acceleration small", function() {
        expect(formatPrefFromMKS(0.3048, 'acceleration')).toBe('1.0\u00A0ft/s²');
      });
      it("acceleration large", function() {
        expect(formatPrefFromMKS(3048.0, 'acceleration')).toBe('10,000\u00A0ft/s²');
      });
      it("acceleration large fixed", function() {
        expect(formatPrefFromMKS(3048.0, 'acceleration', true)).toBe('10,000.0\u00A0ft/s²');
      });
      it("altitude small", function() {
        expect(formatPrefFromMKS(0.3048, 'altitude')).toBe('1\u00A0ft');
      });
      it("altitude large", function() {
        expect(formatPrefFromMKS(3048.0, 'altitude')).toBe('10,000\u00A0ft');
      });
      it("altitude large fixed", function() {
        expect(formatPrefFromMKS(3048.0, 'altitude', true)).toBe('10,000\u00A0ft');
      });
    });

    describe("invalid", function() {
      it("value", function() {
        expect(formatPrefFromMKS(null, 'length')).toBe('');
        expect(formatPrefFromMKS(NaN, 'length')).toBe('');
        expect(formatPrefFromMKS('foo', 'length')).toBe('');
      });
      it("unit", function() {
        expect(formatPrefFromMKS(2.0, 'mess')).toBe('2.0\u00A0?');
        expect(formatPrefFromMKS(2.0, 'mess', true)).toBe('2.000\u00A0?');
      });
    });
  });

  describe("formatUnit", function() {
    var formatUnit = units.formatUnit;
    describe("MKS", function() {
      it("length m", function() {
        expect(formatUnit(1.0, 'length', 'm')).toBe('1.0\u00A0m');
      });
      it("length m fixed", function() {
        expect(formatUnit(1.0, 'length', 'm', true)).toBe('1.000\u00A0m');
      });
      it("mass kg", function() {
        expect(formatUnit(1.0, 'mass', 'kg')).toBe('1.0\u00A0kg');
      });
      it("mass kg fixed", function() {
        expect(formatUnit(1.0, 'mass', 'kg', true)).toBe('1.000\u00A0kg');
      });
    });
    describe("in/lb", function() {
      it("length in", function() {
        expect(formatUnit(39.0, 'length', 'in')).toBe('39.0\u00A0in');
      });
      it("length in fixed", function() {
        expect(formatUnit(39.0, 'length', 'in', true)).toBe('39.00\u00A0in');
      });
      it("mass lb", function() {
        expect(formatUnit(2.2, 'mass', 'lb')).toBe('2.2\u00A0lb');
      });
      it("mass lb fixed", function() {
        expect(formatUnit(2.2, 'mass', 'lb', true)).toBe('2.20\u00A0lb');
      });
    });
    describe("invalid", function() {
      it("NaN", function() {
        expect(formatUnit(0/0, 'length', 'in')).toBe('');
      });
      it("lAngth in", function() {
        expect(formatUnit(1.2341, 'langth', 'in')).toBe('1.234\u00A0?');
      });
      it("length Un", function() {
        expect(formatUnit(1.2341, 'length', 'un')).toBe('1.234\u00A0?');
      });
      it("lAngth Un", function() {
        expect(formatUnit(1.2341, 'langth', 'un')).toBe('1.234\u00A0?');
      });
    });
  });

  describe("convertUnitToMKS", function() {
    beforeEach(function() {
      prefs.clear();
    });

    var convertUnitToMKS = units.convertUnitToMKS;
    describe("mm/g", function() {
      it("length", function() {
        expect(convertUnitToMKS(1414, 'length', 'mm')).toBe(1.414);
      });
      it("mass", function() {
        expect(convertUnitToMKS(1414, 'mass', 'g')).toBe(1.414);
      });
      it("force", function() {
        expect(convertUnitToMKS(1.414, 'force', 'N')).toBe(1.414);
      });
      it("velocity", function() {
        expect(convertUnitToMKS(1.414, 'velocity', 'm/s')).toBe(1.414);
      });
      it("acceleration", function() {
        expect(convertUnitToMKS(1.414, 'acceleration', 'm/s²')).toBe(1.414);
      });
      it("altitude", function() {
        expect(convertUnitToMKS(1.414, 'altitude', 'm')).toBe(1.414);
      });
    });

    describe("in/lb", function() {
      it("length", function() {
        expect(convertUnitToMKS(1.414, 'length', 'in')).toBeCloseTo(0.0359156, 5);
      });
      it("mass", function() {
        expect(convertUnitToMKS(1.414, 'mass', 'lb')).toBeCloseTo(0.64137961, 5);
      });
      it("force", function() {
        expect(convertUnitToMKS(1.414, 'force', 'lbf')).toBeCloseTo(6.289785, 5);
      });
      it("velocity", function() {
        expect(convertUnitToMKS(1.414, 'velocity', 'ft/s')).toBeCloseTo(0.4309872, 5);
      });
      it("acceleration", function() {
        expect(convertUnitToMKS(1.414, 'acceleration', 'ft/s²')).toBeCloseTo(0.4309872, 5);
      });
      it("altitude", function() {
        expect(convertUnitToMKS(1.414, 'altitude', 'mi')).toBeCloseTo(2275.61, 2);
      });
    });
  });

  describe("convertUnitFromMKS", function() {
    beforeEach(function() {
      prefs.clear();
    });

    var convertUnitFromMKS = units.convertUnitFromMKS;
    describe("mm/g", function() {
      it("length", function() {
        expect(convertUnitFromMKS(1.414, 'length', 'mm')).toBe(1414);
      });
      it("mass", function() {
        expect(convertUnitFromMKS(1.414, 'mass', 'g')).toBe(1414);
      });
      it("force", function() {
        expect(convertUnitFromMKS(1.414, 'force', 'N')).toBe(1.414);
      });
      it("velocity", function() {
        expect(convertUnitFromMKS(1.414, 'velocity', 'm/s')).toBe(1.414);
      });
      it("acceleration", function() {
        expect(convertUnitFromMKS(1.414, 'acceleration', 'm/s²')).toBe(1.414);
      });
      it("altitude", function() {
        expect(convertUnitFromMKS(1.414, 'altitude', 'm')).toBe(1.414);
      });
    });

    describe("in/lb", function() {
      it("length", function() {
        expect(convertUnitFromMKS(1.414, 'length', 'in')).toBeCloseTo(55.669291, 4);
      });
      it("mass", function() {
        expect(convertUnitFromMKS(1.414, 'mass', 'lb')).toBeCloseTo(3.1173364, 5);
      });
      it("force", function() {
        expect(convertUnitFromMKS(1.414, 'force', 'lbf')).toBeCloseTo(0.3178798, 5);
      });
      it("velocity", function() {
        expect(convertUnitFromMKS(1.414, 'velocity', 'ft/s')).toBeCloseTo(4.6391076, 5);
      });
      it("acceleration", function() {
        expect(convertUnitFromMKS(1.414, 'acceleration', 'ft/s²')).toBeCloseTo(4.6391076, 5);
      });
      it("altitude", function() {
        expect(convertUnitFromMKS(1.414, 'altitude', 'ft')).toBeCloseTo(4.6391076, 5);
      });
    });
  });

  describe("formatMMTFromMKS", function() {
    var formatMMTFromMKS = units.formatMMTFromMKS;
    it("6", function() {
      expect(formatMMTFromMKS(0.006)).toBe('6\u00A0mm');
    });
    it("10.5", function() {
      expect(formatMMTFromMKS(0.0105)).toBe('10.5\u00A0mm');
    });
    it("38", function() {
      expect(formatMMTFromMKS(0.038)).toBe('38\u00A0mm');
    });
    it("76.2", function() {
      expect(formatMMTFromMKS(0.0762)).toBe('76\u00A0mm');
    });
    it("161", function() {
      expect(formatMMTFromMKS(0.161)).toBe('161\u00A0mm');
    });
    it("invalid", function() {
      expect(formatMMTFromMKS()).toBe('');
      expect(formatMMTFromMKS(NaN)).toBe('');
      expect(formatMMTFromMKS('foo')).toBe('');
      expect(formatMMTFromMKS(0)).toBe('');
    });
  });

  describe('defaultGuideLength', function() {
    describe('default', function() {
      beforeEach(function() {
        prefs.clear();
      });
      it("choice must be unset", function() {
        expect(prefs.get('defaultUnits')).toBeUndefined();
      });
      it("value", function() {
        var g = units.defaultGuideLength();
        expect(g).toBeDefined();
        expect(typeof g).toBe('object');
        expect(g.value).toBe(1);
        expect(g.unit).toBe('m');
        expect(g.mks).toBe(1);
      });
    });
    describe('in/lb', function() {
      beforeEach(function() {
        units.setDefaultsPref(units.defaults.get('in/lb'));
      });
      it("value", function() {
        var g = units.defaultGuideLength();
        expect(g).toBeDefined();
        expect(typeof g).toBe('object');
        expect(g.value).toBe(3);
        expect(g.unit).toBe('ft');
        expect(g.mks).toBeCloseTo(0.9, 1);
      });
    });
  });
});
