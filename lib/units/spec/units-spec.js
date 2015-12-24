var units = require(".."),
    prefs = require("../../prefs");

describe('units', function() {
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
    it("must have defaults", function() {
      expect(units.defaults).toBeDefined();
      expect(units.defaults instanceof Array).toBe(true);
    });
  });

  describe('get', function() {
    describe('default', function() {
      it("choice must be unset", function() {
        prefs.clear();
        expect(prefs.get('defaultUnits')).toBeUndefined();
      });
      it("length must be mm", function() {
        var u = units.get('length');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('mm');
        expect(u.toMKS).toBe(0.001);
      });
      it("mass must be g", function() {
        var u = units.get('mass');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('g');
        expect(u.toMKS).toBe(0.001);
      });
      it("force must be N", function() {
        var u = units.get('force');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('N');
        expect(u.toMKS).toBe(1);
      });
      it("velocity must be m/s", function() {
        var u = units.get('velocity');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m/s');
        expect(u.toMKS).toBe(1);
      });
      it("acceleration must be m/s²", function() {
        var u = units.get('acceleration');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m/s²');
        expect(u.toMKS).toBe(1);
      });
      it("altitude must be m", function() {
        var u = units.get('altitude');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m');
        expect(u.toMKS).toBe(1);
      });
    });
    describe('mm/g', function() {
      beforeEach(function() {
        units.setDefaults(units.defaults.get('mm/g'));
      });
      it("choice must be set", function() {
        var choice = units.getDefaults();
        expect(choice).toBeDefined();
        expect(choice.label).toBe('mm/g');
      });
      it("length must be mm", function() {
        var u = units.get('length');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('mm');
        expect(u.toMKS).toBe(0.001);
      });
      it("mass must be g", function() {
        var u = units.get('mass');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('g');
        expect(u.toMKS).toBe(0.001);
      });
      it("force must be N", function() {
        var u = units.get('force');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('N');
        expect(u.toMKS).toBe(1);
      });
      it("velocity must be m/s", function() {
        var u = units.get('velocity');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m/s');
        expect(u.toMKS).toBe(1);
      });
      it("acceleration must be m/s²", function() {
        var u = units.get('acceleration');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m/s²');
        expect(u.toMKS).toBe(1);
      });
      it("altitude must be m", function() {
        var u = units.get('altitude');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m');
        expect(u.toMKS).toBe(1);
      });
    });
    describe('MKS', function() {
      beforeEach(function() {
        units.setDefaults(units.defaults.get('MKS'));
      });
      it("choice must be set", function() {
        var choice = units.getDefaults();
        expect(choice).toBeDefined();
        expect(choice.label).toBe('MKS');
      });
      it("length must be m", function() {
        var u = units.get('length');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m');
        expect(u.toMKS).toBe(1);
      });
      it("mass must be kg", function() {
        var u = units.get('mass');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('kg');
        expect(u.toMKS).toBe(1);
      });
      it("force must be N", function() {
        var u = units.get('force');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('N');
        expect(u.toMKS).toBe(1);
      });
      it("velocity must be m/s", function() {
        var u = units.get('velocity');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m/s');
        expect(u.toMKS).toBe(1);
      });
      it("acceleration must be m/s²", function() {
        var u = units.get('acceleration');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m/s²');
        expect(u.toMKS).toBe(1);
      });
      it("altitude must be m", function() {
        var u = units.get('altitude');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('m');
        expect(u.toMKS).toBe(1);
      });
    });
    describe('in/lb', function() {
      beforeEach(function() {
        units.setDefaults(units.defaults.get('in/lb'));
      });
      it("choice must be set", function() {
        var choice = units.getDefaults();
        expect(choice).toBeDefined();
        expect(choice.label).toBe('in/lb');
      });
      it("length must be in", function() {
        var u = units.get('length');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('in');
        expect(u.toMKS.toFixed(4)).toBe('0.0254');
      });
      it("mass must be lb", function() {
        var u = units.get('mass');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('lb');
        expect(u.toMKS.toFixed(4)).toBe('0.4536');
      });
      it("force must be N", function() {
        var u = units.get('force');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('N');
        expect(u.toMKS).toBe(1);
      });
      it("velocity must be ft/s", function() {
        var u = units.get('velocity');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('ft/s');
        expect(u.toMKS.toFixed(4)).toBe('0.3048');
      });
      it("acceleration must be ft/s²", function() {
        var u = units.get('acceleration');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('ft/s²');
        expect(u.toMKS.toFixed(4)).toBe('0.3048');
      });
      it("altitude must be ft", function() {
        var u = units.get('altitude');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('ft');
        expect(u.toMKS.toFixed(4)).toBe('0.3048');
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
      });
      it("length must be in", function() {
        var u = units.get('length');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('in');
        expect(u.toMKS.toFixed(4)).toBe('0.0254');
      });
      it("mass must be lb", function() {
        var u = units.get('mass');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('lb');
        expect(u.toMKS.toFixed(4)).toBe('0.4536');
      });
      it("force must be lbf", function() {
        var u = units.get('force');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('lbf');
        expect(u.toMKS.toFixed(4)).toBe('4.4482');
      });
      it("velocity must be ft/s", function() {
        var u = units.get('velocity');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('ft/s');
        expect(u.toMKS.toFixed(4)).toBe('0.3048');
      });
      it("acceleration must be ft/s²", function() {
        var u = units.get('acceleration');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('ft/s²');
        expect(u.toMKS.toFixed(4)).toBe('0.3048');
      });
      it("altitude must be mi", function() {
        var u = units.get('altitude');
        expect(u).toBeDefined();
        expect(typeof u).toBe('object');
        expect(u.label).toBe('mi');
        expect(u.toMKS.toFixed(0)).toBe('1609');
      });
    });
  });

  describe("convertToMKS", function() {
    var convertToMKS = units.convertToMKS;
    describe("default", function() {
      beforeEach(function() {
        prefs.clear();
      });
      it("length", function() {
        expect(convertToMKS(1414, 'length')).toBe(1.414);
      });
      it("mass", function() {
        expect(convertToMKS(1414, 'mass')).toBe(1.414);
      });
      it("force", function() {
        expect(convertToMKS(1.414, 'force')).toBe(1.414);
      });
      it("velocity", function() {
        expect(convertToMKS(1.414, 'velocity')).toBe(1.414);
      });
      it("acceleration", function() {
        expect(convertToMKS(1.414, 'acceleration')).toBe(1.414);
      });
      it("altitude", function() {
        expect(convertToMKS(1.414, 'altitude')).toBe(1.414);
      });
    });

    describe("in/lb", function() {
      beforeEach(function() {
        prefs.clear();
        units.setDefaults(units.defaults.get('in/lb'));
      });
      it("length", function() {
        expect(convertToMKS(1.414, 'length')).toBeCloseTo(0.0359156, 5);
      });
      it("mass", function() {
        expect(convertToMKS(1.414, 'mass')).toBeCloseTo(0.64137961, 5);
      });
      it("force", function() {
        expect(convertToMKS(1.414, 'force')).toBeCloseTo(1.414, 5);
      });
      it("velocity", function() {
        expect(convertToMKS(1.414, 'velocity')).toBeCloseTo(0.4309872, 5);
      });
      it("acceleration", function() {
        expect(convertToMKS(1.414, 'acceleration')).toBeCloseTo(0.4309872, 5);
      });
      it("altitude", function() {
        expect(convertToMKS(1.414, 'altitude')).toBeCloseTo(0.4309872, 5);
      });
    });
  });

  describe("convertFromMKS", function() {
    var convertFromMKS = units.convertFromMKS;
    describe("default", function() {
      beforeEach(function() {
        prefs.clear();
      });
      it("length", function() {
        expect(convertFromMKS(1.414, 'length')).toBe(1414);
      });
      it("mass", function() {
        expect(convertFromMKS(1.414, 'mass')).toBe(1414);
      });
      it("force", function() {
        expect(convertFromMKS(1.414, 'force')).toBe(1.414);
      });
      it("velocity", function() {
        expect(convertFromMKS(1.414, 'velocity')).toBe(1.414);
      });
      it("acceleration", function() {
        expect(convertFromMKS(1.414, 'acceleration')).toBe(1.414);
      });
      it("altitude", function() {
        expect(convertFromMKS(1.414, 'altitude')).toBe(1.414);
      });
    });

    describe("MKS", function() {
      beforeEach(function() {
        units.setDefaults(units.defaults.get('MKS'));
      });
      it("length", function() {
        expect(convertFromMKS(1.414, 'length')).toBeCloseTo(1.414, 5);
      });
      it("mass", function() {
        expect(convertFromMKS(1.414, 'mass')).toBeCloseTo(1.414, 5);
      });
      it("force", function() {
        expect(convertFromMKS(1.414, 'force')).toBeCloseTo(1.414, 5);
      });
      it("velocity", function() {
        expect(convertFromMKS(1.414, 'velocity')).toBeCloseTo(1.414, 5);
      });
      it("acceleration", function() {
        expect(convertFromMKS(1.414, 'acceleration')).toBeCloseTo(1.414, 5);
      });
      it("altitude", function() {
        expect(convertFromMKS(1.414, 'altitude')).toBeCloseTo(1.414, 5);
      });
    });

    describe("CGS", function() {
      beforeEach(function() {
        units.setDefaults(units.defaults.get('CGS'));
      });
      it("length", function() {
        expect(convertFromMKS(1.414, 'length')).toBeCloseTo(141.4, 5);
      });
      it("mass", function() {
        expect(convertFromMKS(1.414, 'mass')).toBeCloseTo(1414.0, 5);
      });
      it("force", function() {
        expect(convertFromMKS(1.414, 'force')).toBeCloseTo(1.414, 5);
      });
      it("velocity", function() {
        expect(convertFromMKS(1.414, 'velocity')).toBeCloseTo(1.414, 5);
      });
      it("acceleration", function() {
        expect(convertFromMKS(1.414, 'acceleration')).toBeCloseTo(1.414, 5);
      });
      it("altitude", function() {
        expect(convertFromMKS(1.414, 'altitude')).toBeCloseTo(1.414, 5);
      });
    });

    describe("in/lb", function() {
      beforeEach(function() {
        units.setDefaults(units.defaults.get('in/lb'));
      });
      it("length", function() {
        expect(convertFromMKS(1.414, 'length')).toBeCloseTo(55.669291, 4);
      });
      it("mass", function() {
        expect(convertFromMKS(1.414, 'mass')).toBeCloseTo(3.1173364, 5);
      });
      it("force", function() {
        expect(convertFromMKS(1.414, 'force')).toBeCloseTo(1.414, 5);
      });
      it("velocity", function() {
        expect(convertFromMKS(1.414, 'velocity')).toBeCloseTo(4.6391076, 5);
      });
      it("acceleration", function() {
        expect(convertFromMKS(1.414, 'acceleration')).toBeCloseTo(4.6391076, 5);
      });
      it("altitude", function() {
        expect(convertFromMKS(1.414, 'altitude')).toBeCloseTo(4.6391076, 5);
      });
    });

    describe("in/oz", function() {
      beforeEach(function() {
        units.setDefaults(units.defaults.get('in/oz'));
      });
      it("length", function() {
        expect(convertFromMKS(1.414, 'length')).toBeCloseTo(55.669291, 4);
      });
      it("mass", function() {
        expect(convertFromMKS(1.414, 'mass')).toBeCloseTo(49.877382, 4);
      });
      it("force", function() {
        expect(convertFromMKS(1.414, 'force')).toBeCloseTo(1.414, 5);
      });
      it("velocity", function() {
        expect(convertFromMKS(1.414, 'velocity')).toBeCloseTo(4.639108, 5);
      });
      it("acceleration", function() {
        expect(convertFromMKS(1.414, 'acceleration')).toBeCloseTo(4.639108, 5);
      });
      it("altitude", function() {
        expect(convertFromMKS(1.414, 'altitude')).toBeCloseTo(4.639108, 5);
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
        expect(convertFromMKS(1.414, u)).toBeCloseTo(4.639108, 5);
      });
      it("lbf", function() {
        var u = units.force.get('lbf');
        expect(u).toBeDefined();
        expect(u.label).toBe('lbf');
        expect(convertFromMKS(1.414, u)).toBeCloseTo(0.31787996, 6);
      });
      it("G", function() {
        var u = units.acceleration.get('G');
        expect(u).toBeDefined();
        expect(u.label).toBe('G');
        expect(convertFromMKS(1.414, u)).toBeCloseTo(0.14418787, 6);
      });
      it("kph", function() {
        var u = units.velocity.get('kph');
        expect(u).toBeDefined();
        expect(u.label).toBe('kph');
        expect(convertFromMKS(1.414, u)).toBeCloseTo(5.090359, 5);
      });
      it("mph", function() {
        var u = units.velocity.get('mph');
        expect(u).toBeDefined();
        expect(u.label).toBe('mph');
        expect(convertFromMKS(1.414, u)).toBeCloseTo(3.163028, 5);
      });
      it("km", function() {
        var u = units.altitude.get('km');
        expect(u).toBeDefined();
        expect(u.label).toBe('km');
        expect(convertFromMKS(1414.14, u)).toBeCloseTo(1.41414, 5);
      });
      it("mi", function() {
        var u = units.altitude.get('mi');
        expect(u).toBeDefined();
        expect(u.label).toBe('mi');
        expect(convertFromMKS(1414.14, u)).toBeCloseTo(0.878706, 5);
      });
    });
  });

  describe("formatFromMKS", function() {
    var formatFromMKS = units.formatFromMKS;
    describe("MKS", function() {
      beforeEach(function() {
        units.setDefaults(units.defaults.get('MKS'));
      });
      it("length small", function() {
        expect(formatFromMKS(1, 'length')).toBe('1.0m');
      });
      it("length small fixed", function() {
        expect(formatFromMKS(1, 'length', true)).toBe('1.000m');
      });
      it("length large", function() {
        expect(formatFromMKS(12345.67, 'length')).toBe('12346m');
      });
      it("length large fixed", function() {
        expect(formatFromMKS(12345.67, 'length', true)).toBe('12345.670m');
      });
      it("mass", function() {
        expect(formatFromMKS(1.0, 'mass')).toBe('1.0kg');
      });
      it("mass large", function() {
        expect(formatFromMKS(12345.67, 'mass')).toBe('12346kg');
      });
      it("mass large fixed", function() {
        expect(formatFromMKS(12345.67, 'mass', true)).toBe('12345.670kg');
      });
      it("force", function() {
        expect(formatFromMKS(1.0, 'force')).toBe('1.0N');
      });
      it("force large", function() {
        expect(formatFromMKS(12345.67, 'force')).toBe('12346N');
      });
      it("force large fixed", function() {
        expect(formatFromMKS(12345.67, 'force', true)).toBe('12345.7N');
      });
      it("velocity", function() {
        expect(formatFromMKS(1.0, 'velocity')).toBe('1.0m/s');
      });
      it("velocity large", function() {
        expect(formatFromMKS(12345.67, 'velocity')).toBe('12346m/s');
      });
      it("velocity large fixed", function() {
        expect(formatFromMKS(12345.67, 'velocity', true)).toBe('12345.7m/s');
      });
      it("acceleration", function() {
        expect(formatFromMKS(1.0, 'acceleration')).toBe('1.0m/s²');
      });
      it("acceleration large", function() {
        expect(formatFromMKS(12345.67, 'acceleration')).toBe('12346m/s²');
      });
      it("acceleration large fixed", function() {
        expect(formatFromMKS(12345.67, 'acceleration', true)).toBe('12345.7m/s²');
      });
      it("altitude", function() {
        expect(formatFromMKS(1.0, 'altitude')).toBe('1m');
      });
      it("altitude large", function() {
        expect(formatFromMKS(12345.67, 'altitude')).toBe('12346m');
      });
      it("altitude large fixed", function() {
        expect(formatFromMKS(12345.67, 'altitude', true)).toBe('12346m');
      });
    });

    describe("CGS", function() {
      beforeEach(function() {
        units.setDefaults(units.defaults.get('CGS'));
      });
      it("length small", function() {
        expect(formatFromMKS(1, 'length')).toBe('100.0cm');
      });
      it("length small fixed", function() {
        expect(formatFromMKS(1, 'length', true)).toBe('100.0cm');
      });
      it("length large", function() {
        expect(formatFromMKS(12345.67, 'length')).toBe('1234567cm');
      });
      it("length large fixed", function() {
        expect(formatFromMKS(12345.67, 'length', true)).toBe('1234567.0cm');
      });
      it("mass", function() {
        expect(formatFromMKS(1.0, 'mass')).toBe('1000g');
      });
      it("mass large", function() {
        expect(formatFromMKS(12345.67, 'mass')).toBe('12345670g');
      });
      it("mass large fixed", function() {
        expect(formatFromMKS(12345.67, 'mass', true)).toBe('12345670g');
      });
      it("force", function() {
        expect(formatFromMKS(1.0, 'force')).toBe('1.0N');
      });
      it("force large", function() {
        expect(formatFromMKS(12345.67, 'force')).toBe('12346N');
      });
      it("force large fixed", function() {
        expect(formatFromMKS(12345.67, 'force', true)).toBe('12345.7N');
      });
      it("velocity", function() {
        expect(formatFromMKS(1.0, 'velocity')).toBe('1.0m/s');
      });
      it("velocity large", function() {
        expect(formatFromMKS(12345.67, 'velocity')).toBe('12346m/s');
      });
      it("velocity large fixed", function() {
        expect(formatFromMKS(12345.67, 'velocity', true)).toBe('12345.7m/s');
      });
      it("acceleration", function() {
        expect(formatFromMKS(1.0, 'acceleration')).toBe('1.0m/s²');
      });
      it("acceleration large", function() {
        expect(formatFromMKS(12345.67, 'acceleration')).toBe('12346m/s²');
      });
      it("acceleration large fixed", function() {
        expect(formatFromMKS(12345.67, 'acceleration', true)).toBe('12345.7m/s²');
      });
      it("altitude", function() {
        expect(formatFromMKS(1.0, 'altitude')).toBe('1m');
      });
      it("altitude large", function() {
        expect(formatFromMKS(12345.67, 'altitude')).toBe('12346m');
      });
      it("altitude large fixed", function() {
        expect(formatFromMKS(12345.67, 'altitude', true)).toBe('12346m');
      });
    });

    describe("in/lb", function() {
      beforeEach(function() {
        units.setDefaults(units.defaults.get('in/lb'));
      });
      it("length small", function() {
        expect(formatFromMKS(0.0254, 'length')).toBe('1.0in');
      });
      it("length large", function() {
        expect(formatFromMKS(254.0, 'length')).toBe('10000in');
      });
      it("length large fixed", function() {
        expect(formatFromMKS(254.0, 'length', true)).toBe('10000.00in');
      });
      it("mass small", function() {
        expect(formatFromMKS(0.453592, 'mass')).toBe('1.0lb');
      });
      it("mass large", function() {
        expect(formatFromMKS(4535.92, 'mass')).toBe('10000lb');
      });
      it("mass large fixed", function() {
        expect(formatFromMKS(4535.92, 'mass', true)).toBe('10000.00lb');
      });
      it("force small", function() {
        expect(formatFromMKS(1.0, 'force')).toBe('1.0N');
      });
      it("force large", function() {
        expect(formatFromMKS(1000.0, 'force')).toBe('1000N');
      });
      it("force large fixed", function() {
        expect(formatFromMKS(1000.0, 'force', true)).toBe('1000.0N');
      });
      it("velocity small", function() {
        expect(formatFromMKS(0.3048, 'velocity')).toBe('1.0ft/s');
      });
      it("velocity large", function() {
        expect(formatFromMKS(3048.0, 'velocity')).toBe('10000ft/s');
      });
      it("velocity large fixed", function() {
        expect(formatFromMKS(3048.0, 'velocity', true)).toBe('10000.0ft/s');
      });
      it("acceleration small", function() {
        expect(formatFromMKS(0.3048, 'acceleration')).toBe('1.0ft/s²');
      });
      it("acceleration large", function() {
        expect(formatFromMKS(3048.0, 'acceleration')).toBe('10000ft/s²');
      });
      it("acceleration large fixed", function() {
        expect(formatFromMKS(3048.0, 'acceleration', true)).toBe('10000.0ft/s²');
      });
      it("altitude small", function() {
        expect(formatFromMKS(0.3048, 'altitude')).toBe('1ft');
      });
      it("altitude large", function() {
        expect(formatFromMKS(3048.0, 'altitude')).toBe('10000ft');
      });
      it("altitude large fixed", function() {
        expect(formatFromMKS(3048.0, 'altitude', true)).toBe('10000ft');
      });
    });

    describe("in/oz", function() {
      beforeEach(function() {
        units.setDefaults(units.defaults.get('in/oz'));
      });
      it("length small", function() {
        expect(formatFromMKS(0.0254, 'length')).toBe('1.0in');
      });
      it("length large", function() {
        expect(formatFromMKS(254.0, 'length')).toBe('10000in');
      });
      it("length large fixed", function() {
        expect(formatFromMKS(254.0, 'length', true)).toBe('10000.00in');
      });
      it("mass small", function() {
        expect(formatFromMKS(0.0283495, 'mass')).toBe('1.0oz');
      });
      it("mass large", function() {
        expect(formatFromMKS(283.495, 'mass')).toBe('10000oz');
      });
      it("mass large fixed", function() {
        expect(formatFromMKS(283.495, 'mass', true)).toBe('10000.0oz');
      });
      it("force small", function() {
        expect(formatFromMKS(1.0, 'force')).toBe('1.0N');
      });
      it("force large", function() {
        expect(formatFromMKS(1000.0, 'force')).toBe('1000N');
      });
      it("force large fixed", function() {
        expect(formatFromMKS(1000.0, 'force', true)).toBe('1000.0N');
      });
      it("velocity small", function() {
        expect(formatFromMKS(0.3048, 'velocity')).toBe('1.0ft/s');
      });
      it("velocity large", function() {
        expect(formatFromMKS(3048.0, 'velocity')).toBe('10000ft/s');
      });
      it("velocity large fixed", function() {
        expect(formatFromMKS(3048.0, 'velocity', true)).toBe('10000.0ft/s');
      });
      it("acceleration small", function() {
        expect(formatFromMKS(0.3048, 'acceleration')).toBe('1.0ft/s²');
      });
      it("acceleration large", function() {
        expect(formatFromMKS(3048.0, 'acceleration')).toBe('10000ft/s²');
      });
      it("acceleration large fixed", function() {
        expect(formatFromMKS(3048.0, 'acceleration', true)).toBe('10000.0ft/s²');
      });
      it("altitude small", function() {
        expect(formatFromMKS(0.3048, 'altitude')).toBe('1ft');
      });
      it("altitude large", function() {
        expect(formatFromMKS(3048.0, 'altitude')).toBe('10000ft');
      });
      it("altitude large fixed", function() {
        expect(formatFromMKS(3048.0, 'altitude', true)).toBe('10000ft');
      });
    });

    describe("invalid", function() {
      it("value", function() {
        expect(formatFromMKS(null, 'length')).toBe('');
        expect(formatFromMKS(NaN, 'length')).toBe('');
        expect(formatFromMKS('foo', 'length')).toBe('');
      });
      it("unit", function() {
        expect(formatFromMKS(2.0, 'mess')).toBe('2.0?');
        expect(formatFromMKS(2.0, 'mess', true)).toBe('2.000?');
      });
    });
  });

  describe("formatMMTFromMKS", function() {
    var formatMMTFromMKS = units.formatMMTFromMKS;
    it("6", function() {
      expect(formatMMTFromMKS(0.006)).toBe('6mm');
    });
    it("10.5", function() {
      expect(formatMMTFromMKS(0.0105)).toBe('10.5mm');
    });
    it("38", function() {
      expect(formatMMTFromMKS(0.038)).toBe('38mm');
    });
    it("76.2", function() {
      expect(formatMMTFromMKS(0.0762)).toBe('76mm');
    });
    it("161", function() {
      expect(formatMMTFromMKS(0.161)).toBe('161mm');
    });
    it("invalid", function() {
      expect(formatMMTFromMKS()).toBe('');
      expect(formatMMTFromMKS(NaN)).toBe('');
      expect(formatMMTFromMKS('foo')).toBe('');
      expect(formatMMTFromMKS(0)).toBe('');
    });
  });
});
