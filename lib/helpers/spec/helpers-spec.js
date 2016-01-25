var helpers = require(".."),
    units = require("../../units"),
    prefs = require("../../prefs");

describe('helpers', function() {
  describe("sameId", function() {
    var options = {
      fn: function() { return true; }
    };
    it("undefined", function() {
      expect(helpers.sameId(undefined, '012345678901234567890123', options)).toBeUndefined();
    });
    it("different", function() {
      expect(helpers.sameId('abcdefabcdefabcdefabcdef', '012345678901234567890123', options)).toBeUndefined();
    });
    it("same", function() {
      expect(helpers.sameId('abcdefabcdefabcdefabcdef', 'abcdefabcdefabcdefabcdef', options)).toBe(true);
    });
    it("different object/string", function() {
      expect(helpers.sameId({ _id: 'abcdefabcdefabcdefabcdef' }, '012345678901234567890123', options)).toBeUndefined();
    });
    it("same object/string", function() {
      expect(helpers.sameId({ _id: 'abcdefabcdefabcdefabcdef' }, 'abcdefabcdefabcdefabcdef', options)).toBe(true);
    });
    it("different object/object", function() {
      expect(helpers.sameId({ _id: 'abcdefabcdefabcdefabcdef' }, { _id: '012345678901234567890123' }, options)).toBeUndefined();
    });
    it("same object/object", function() {
      expect(helpers.sameId({ _id: 'abcdefabcdefabcdefabcdef' }, { _id: 'abcdefabcdefabcdefabcdef' }, options)).toBe(true);
    });
  });

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
      expect(helpers.formatLength(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatLength(0/0)).toBe('—');
      expect(helpers.formatLength(1/0)).toBe('—');
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
      expect(helpers.formatMass(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatMass(0/0)).toBe('—');
      expect(helpers.formatMass(1/0)).toBe('—');
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
      expect(helpers.formatForce(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatForce(0/0)).toBe('—');
      expect(helpers.formatForce(1/0)).toBe('—');
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
      expect(helpers.formatImpulse(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatImpulse(0/0)).toBe('—');
      expect(helpers.formatImpulse(1/0)).toBe('—');
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
      expect(helpers.formatVelocity(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatVelocity(0/0)).toBe('—');
      expect(helpers.formatVelocity(1/0)).toBe('—');
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
      expect(helpers.formatAcceleration(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatAcceleration(0/0)).toBe('—');
      expect(helpers.formatAcceleration(1/0)).toBe('—');
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
      expect(helpers.formatAltitude(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatAltitude(0/0)).toBe('—');
      expect(helpers.formatAltitude(1/0)).toBe('—');
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
      expect(helpers.formatMMT(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatMMT(0/0)).toBe('—');
      expect(helpers.formatMMT(1/0)).toBe('—');
    });
  });
  describe("formatDuration", function() {
    it("default", function() {
      prefs.clear();
      expect(helpers.formatDuration(12.3456789)).toBe('12.3s');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatDuration(12.3456789)).toBe('12.3s');
    });
    it("undefined", function() {
      expect(helpers.formatDuration(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatDuration(0/0)).toBe('—');
      expect(helpers.formatDuration(1/0)).toBe('—');
    });
  });
  describe("formatIsp", function() {
    it("default", function() {
      prefs.clear();
      expect(helpers.formatIsp(123.456789)).toBe('123s');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatIsp(123.456789)).toBe('123s');
    });
    it("undefined", function() {
      expect(helpers.formatIsp(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatIsp(0/0)).toBe('—');
      expect(helpers.formatIsp(1/0)).toBe('—');
    });
    it("zero", function() {
      expect(helpers.formatIsp(0)).toBe('—');
    });
  });
  describe("formatDate", function() {
    it("no format, 1-digit day", function() {
      var d = new Date(2016, 0, 6, 12, 0, 0);
      expect(helpers.formatDate(d)).toBe('January 6, 2016');
    });
    it("no format, 2-digit day", function() {
      var d = new Date(2016, 0, 16, 12, 0, 0);
      expect(helpers.formatDate(d)).toBe('January 16, 2016');
    });
    it("milliseconds, 1-digit day", function() {
      var d = new Date(2016, 0, 6, 12, 0, 0);
      expect(helpers.formatDate(d.getTime())).toBe('January 6, 2016');
    });
    it("milliseconds, 2-digit day", function() {
      var d = new Date(2016, 0, 16, 12, 0, 0);
      expect(helpers.formatDate(d.getTime())).toBe('January 16, 2016');
    });
    it("long format, 1-digit day", function() {
      var d = new Date(2016, 0, 6, 12, 0, 0);
      expect(helpers.formatDate(d, 'long')).toBe('January 6, 2016');
    });
    it("long format, 2-digit day", function() {
      var d = new Date(2016, 0, 16, 12, 0, 0);
      expect(helpers.formatDate(d, 'long')).toBe('January 16, 2016');
    });
    it("short format, 1-digit day", function() {
      var d = new Date(2016, 0, 6, 12, 0, 0);
      expect(helpers.formatDate(d, 'short')).toBe('Jan 6, 16');
    });
    it("short format, 2-digit day", function() {
      var d = new Date(2016, 0, 16, 12, 0, 0);
      expect(helpers.formatDate(d, 'short')).toBe('Jan 16, 16');
    });
    it("custom format, 1-digit day", function() {
      var d = new Date(2016, 0, 6, 12, 0, 0);
      expect(helpers.formatDate(d, '%A, %B %e, %Y')).toBe('Wednesday, January 6, 2016');
    });
    it("custom format, 2-digit day", function() {
      var d = new Date(2016, 0, 16, 12, 0, 0);
      expect(helpers.formatDate(d, '%A, %B %e, %Y')).toBe('Saturday, January 16, 2016');
    });
  });
  describe("websiteAnchor", function() {
    it("undefined", function() {
      expect(helpers.websiteAnchor(undefined)).toBe('—');
    });
    it("empty", function() {
      expect(helpers.websiteAnchor('')).toBe('—');
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
  describe("manufacturerLink", function() {
    it("undefined", function() {
      expect(helpers.manufacturerLink(undefined, undefined)).toBe('/manufacturers/');
    });
    it("empty", function() {
      expect(helpers.manufacturerLink({})).toBe('/manufacturers/');
    });
    it("object", function() {
      expect(helpers.manufacturerLink({ name: 'Big Rocket Motors', abbrev: 'Big' })).toBe('/manufacturers/Big/motors.html');
    });
    it("missing abbrev", function() {
      expect(helpers.manufacturerLink({ name: 'Big Rocket Motors' })).toBe('/manufacturers/');
    });
  });
  describe("motorLink", function() {
    it("undefined", function() {
      expect(helpers.motorLink(undefined, undefined)).toBe('/motors/search.html');
    });
    it("empty", function() {
      expect(helpers.motorLink({})).toBe('/motors/search.html');
    });
    it("just motor, populated", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: 'H123X',
        commonName: 'H123',
        _manufacturer: { name: 'Big Rocket Motors', abbrev: 'Big' }
      };
      expect(helpers.motorLink(o)).toBe('/motors/Big/H123X/');
    });
    it("just motor, unpopulated", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: 'H123',
        commonName: 'H123',
        _manufacturer: '012345678901234567890123'
      };
      expect(helpers.motorLink(o)).toBe('/motors/search.html');
    });
    it("mfr and motor", function() {
      var o1 = {
        _id: '012345678901234567890123',
        name: 'Big Rocket Motors',
        abbrev: 'Big'
      };
      var o2 = {
        _id: 'abcdefabcdefabcdefabcdef',
        _manufacturer: '012345678901234567890123',
        designation: 'H123X',
        commonName: 'H123'
      };
      expect(helpers.motorLink(o1, o2)).toBe('/motors/Big/H123X/');
    });
    it("require encoding", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: '1/2A3',
        commonName: '1/2A3',
        _manufacturer: { name: 'Big Rocket Motors', abbrev: 'Big' }
      };
      expect(helpers.motorLink(o)).toBe('/motors/Big/1%2F2A3/');
    });
  });
  describe("simfileLink", function() {
    it("undefined", function() {
      expect(helpers.simfileLink(undefined, undefined)).toBe('/simfiles/');
    });
    it("object", function() {
      expect(helpers.simfileLink({ _id: '012345678901234567890123' })).toBe('/simfiles/012345678901234567890123/');
    });
    it("id", function() {
      expect(helpers.simfileLink('012345678901234567890123')).toBe('/simfiles/012345678901234567890123/');
    });
  });
  describe("contributorLink", function() {
    it("undefined", function() {
      expect(helpers.contributorLink(undefined, undefined)).toBe('/contributors/');
    });
    it("object", function() {
      expect(helpers.contributorLink({ _id: '012345678901234567890123' })).toBe('/contributors/012345678901234567890123/');
    });
    it("id", function() {
      expect(helpers.contributorLink('012345678901234567890123')).toBe('/contributors/012345678901234567890123/');
    });
  });
  describe("capitalize", function() {
    it("undefined", function() {
      expect(helpers.capitalize(undefined)).toBe('');
    });
    it("empty", function() {
      expect(helpers.capitalize(' ')).toBe('');
    });
    it("lower case", function() {
      expect(helpers.capitalize('three thirsty camels')).toBe('Three Thirsty Camels');
    });
    it("upper case", function() {
      expect(helpers.capitalize('Three Thirsty CAMELS')).toBe('Three Thirsty CAMELS');
    });
  });
  describe("formatTrend", function() {
    it("undefined", function() {
      expect(helpers.formatTrend(undefined)).toBe('flat');
    });
    it("up", function() {
      expect(helpers.formatTrend(0.99)).toBe('up');
      expect(helpers.formatTrend(2.5)).toBe('up');
    });
    it("down", function() {
      expect(helpers.formatTrend(-0.99)).toBe('down');
      expect(helpers.formatTrend(-2.5)).toBe('down');
    });
    it("flat", function() {
      expect(helpers.formatTrend(0.01)).toBe('flat');
      expect(helpers.formatTrend(-0.1)).toBe('flat');
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
