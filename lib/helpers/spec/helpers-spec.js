var helpers = require(".."),
    units = require("../../units"),
    prefs = require("../../prefs");

describe('helpers', function() {
  describe("formatLength", function() {
    it("default", function() {
      prefs.clear();
      expect(helpers.formatLength(1.23456789)).toBe('1235mm');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatLength(1.23456789)).toBe('48.61in');
    });
    it("undefined", function() {
      expect(helpers.formatLength(undefined)).toBe('');
    });
    it("NaN", function() {
      expect(helpers.formatLength(0/0)).toBe('');
      expect(helpers.formatLength(1/0)).toBe('');
    });
  });
  describe("formatMass", function() {
    it("default", function() {
      prefs.clear();
      expect(helpers.formatMass(1.23456789)).toBe('1235g');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatMass(1.23456789)).toBe('2.72lb');
    });
    it("undefined", function() {
      expect(helpers.formatMass(undefined)).toBe('');
    });
    it("NaN", function() {
      expect(helpers.formatMass(0/0)).toBe('');
      expect(helpers.formatMass(1/0)).toBe('');
    });
  });
  describe("formatForce", function() {
    it("default", function() {
      prefs.clear();
      expect(helpers.formatForce(1.23456789)).toBe('1.2N');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatForce(1.23456789)).toBe('1.2N');
    });
    it("undefined", function() {
      expect(helpers.formatForce(undefined)).toBe('');
    });
    it("NaN", function() {
      expect(helpers.formatForce(0/0)).toBe('');
      expect(helpers.formatForce(1/0)).toBe('');
    });
  });
  describe("formatImpulse", function() {
    it("default", function() {
      prefs.clear();
      expect(helpers.formatImpulse(1.23456789)).toBe('1.2Ns');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatImpulse(1.23456789)).toBe('1.2Ns');
    });
    it("undefined", function() {
      expect(helpers.formatImpulse(undefined)).toBe('');
    });
    it("NaN", function() {
      expect(helpers.formatImpulse(0/0)).toBe('');
      expect(helpers.formatImpulse(1/0)).toBe('');
    });
  });
  describe("formatVelocity", function() {
    it("default", function() {
      prefs.clear();
      expect(helpers.formatVelocity(1.23456789)).toBe('1.2m/s');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatVelocity(1.23456789)).toBe('4.1ft/s');
    });
    it("undefined", function() {
      expect(helpers.formatVelocity(undefined)).toBe('');
    });
    it("NaN", function() {
      expect(helpers.formatVelocity(0/0)).toBe('');
      expect(helpers.formatVelocity(1/0)).toBe('');
    });
  });
  describe("formatAcceleration", function() {
    it("default", function() {
      prefs.clear();
      expect(helpers.formatAcceleration(1.23456789)).toBe('1.2m/s²');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatAcceleration(1.23456789)).toBe('4.1ft/s²');
    });
    it("undefined", function() {
      expect(helpers.formatAcceleration(undefined)).toBe('');
    });
    it("NaN", function() {
      expect(helpers.formatAcceleration(0/0)).toBe('');
      expect(helpers.formatAcceleration(1/0)).toBe('');
    });
  });
  describe("formatAltitude", function() {
    it("default", function() {
      prefs.clear();
      expect(helpers.formatAltitude(123.456789)).toBe('123m');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatAltitude(123.456789)).toBe('405ft');
    });
    it("undefined", function() {
      expect(helpers.formatAltitude(undefined)).toBe('');
    });
    it("NaN", function() {
      expect(helpers.formatAltitude(0/0)).toBe('');
      expect(helpers.formatAltitude(1/0)).toBe('');
    });
  });
  describe("formatMMT", function() {
    it("default", function() {
      prefs.clear();
      expect(helpers.formatMMT(0.0750123)).toBe('75mm');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatMMT(0.0750123)).toBe('75mm');
    });
    it("undefined", function() {
      expect(helpers.formatMMT(undefined)).toBe('');
    });
    it("NaN", function() {
      expect(helpers.formatMMT(0/0)).toBe('');
      expect(helpers.formatMMT(1/0)).toBe('');
    });
  });
  describe("formatTime", function() {
    it("default", function() {
      prefs.clear();
      expect(helpers.formatTime(12.3456789)).toBe('12.3s');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatTime(12.3456789)).toBe('12.3s');
    });
    it("undefined", function() {
      expect(helpers.formatTime(undefined)).toBe('');
    });
    it("NaN", function() {
      expect(helpers.formatTime(0/0)).toBe('');
      expect(helpers.formatTime(1/0)).toBe('');
    });
  });
  describe("websiteAnchor", function() {
    it("undefined", function() {
      expect(helpers.websiteAnchor(undefined)).toBe('');
    });
    it("empty", function() {
      expect(helpers.websiteAnchor('')).toBe('');
    });
    it("bare", function() {
      expect(helpers.websiteAnchor('http://example.com')).toBe('example.com');
    });
    it("simple", function() {
      expect(helpers.websiteAnchor('http://example.com/')).toBe('example.com');
    });
    it("https", function() {
      expect(helpers.websiteAnchor('https://example.com/')).toBe('example.com');
    });
    it("deep", function() {
      expect(helpers.websiteAnchor('http://example.com/path/to/somewhere')).toBe('example.com');
    });
    it("deep", function() {
      expect(helpers.websiteAnchor('http://somewhere.example.com/')).toBe('somewhere.example.com');
    });
  });

  describe("help", function() {
    var hbs = {
      helpers: {},
      registerHelper: function(name, func) {
        if (!name || !/^[a-z][a-zA-Z0-9_]+$/.test(name))
          throw new Error('invalid name "' + name + '" for a helper');
        if (typeof func != 'function')
          throw new Error('invalid function for a helper');
        if (this.helpers.hasOwnProperty(name))
          throw new Error('duplicate name "' + name + '" registered');
        this.helpers[name] = func;
      }
    };

    it("register", function() {
      helpers.help(hbs);
    });
  });
});
