"use strict";

const units = require("../../units"),
    helpers = require(".."),
    prefs = require("../../prefs");

describe('helpers', function() {
  let data = {};

  beforeAll( function( done) {
    spyOn(prefs, 'all').and.returnValue(data);
    done();
  });
  afterAll( function( done){
    data = {};
    done();
  });

  describe("toFixed", function() {
    it("integer", function() {
      expect(helpers.toFixed(0.12345)).toBe('0');
      expect(helpers.toFixed(1.2345)).toBe('1');
      expect(helpers.toFixed(12.345)).toBe('12');
      expect(helpers.toFixed(123.45)).toBe('123');
      expect(helpers.toFixed(1234.5)).toBe('1,235');
      expect(helpers.toFixed(12345)).toBe('12,345');
    });
    it("decimal", function() {
      expect(helpers.toFixed(0.123456, 3)).toBe('0.123');
      expect(helpers.toFixed(1.23456, 2)).toBe('1.23');
      expect(helpers.toFixed(12.3456, 1)).toBe('12.3');
      expect(helpers.toFixed(123.456, 1)).toBe('123.5');
      expect(helpers.toFixed(1234.56, 1)).toBe('1,234.6');
      expect(helpers.toFixed(12345.6, 1)).toBe('12,345.6');
    });
    it("undefined", function() {
      expect(helpers.toFixed(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.toFixed(0/0)).toBe('—');
      expect(helpers.toFixed(1/0)).toBe('—');
    });
  });
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
  describe("updatedLater", function() {
    var options = {
      fn: function() { return true; }
    };
    it("undefined", function() {
      expect(helpers.updatedLater(undefined, options)).toBeUndefined();
    });
    it("no updatedAt", function() {
      expect(helpers.updatedLater({ createdAt: new Date() }, options)).toBeUndefined();
    });
    it("same updatedAt", function() {
      expect(helpers.updatedLater({ createdAt: new Date(), updatedAt: new Date() }, options)).toBeUndefined();
    });
    it("slightly different updatedAt", function() {
      // 30s
      expect(helpers.updatedLater({ createdAt: new Date(new Date().getTime() - 30 * 1000), updatedAt: new Date() }, options)).toBeUndefined();
    });
    it("much different updatedAt", function() {
      // 100d
      expect(helpers.updatedLater({ createdAt: new Date(new Date().getTime() - 100 * 24 * 60 * 60 * 1000), updatedAt: new Date() }, options)).toBe(true);
    });
  });

  describe("formatLength", function() {
    beforeEach( function(){
      prefs.clear();
    });

    it("default", function() {
      expect(helpers.formatLength(1.23456789)).toBe('1,235\u00A0mm');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatLength(1.23456789)).toBe('48.61\u00A0in');
    });
    it("specified cm", function() {
      expect(helpers.formatLength(1.23456789, 'cm')).toBe('1.2\u00A0cm');
    });
    it("large", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatLength(123.456789)).toBe('4,860.50\u00A0in');
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
      expect(helpers.formatMass(1.23456789)).toBe('1,235\u00A0g');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatMass(1.23456789)).toBe('2.72\u00A0lb');
    });
    it("specified oz", function() {
      expect(helpers.formatMass(1.23456789, 'oz')).toBe('1.2\u00A0oz');
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
      expect(helpers.formatForce(1.23456789)).toBe('1.2\u00A0N');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatForce(1.23456789)).toBe('1.2\u00A0N');
    });
    it("specified lbf", function() {
      expect(helpers.formatForce(1.23456789, 'lbf')).toBe('1.23\u00A0lbf');
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
      expect(helpers.formatImpulse(1.23456789)).toBe('1.2\u00A0Ns');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatImpulse(1.23456789)).toBe('1.2\u00A0Ns');
    });
    it("specified lbf", function() {
      expect(helpers.formatImpulse(1.23456789, 'lbf')).toBe('1.23\u00A0lbfs');
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
      expect(helpers.formatVelocity(1.23456789)).toBe('1.2\u00A0m/s');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatVelocity(1.23456789)).toBe('4.1\u00A0ft/s');
    });
    it("specified kph", function() {
      expect(helpers.formatVelocity(1.23456789, 'kph')).toBe('1.235\u00A0kph');
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
      expect(helpers.formatAcceleration(1.23456789)).toBe('1.2\u00A0m/s²');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatAcceleration(1.23456789)).toBe('4.1\u00A0ft/s²');
    });
    it("specified G", function() {
      expect(helpers.formatAcceleration(1.23456789, 'G')).toBe('1.23\u00A0G');
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
      expect(helpers.formatAltitude(123.456789)).toBe('123\u00A0m');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatAltitude(123.456789)).toBe('405\u00A0ft');
    });
    it("specified mi", function() {
      expect(helpers.formatAltitude(1.23456789, 'mi')).toBe('1.23\u00A0mi');
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
      expect(helpers.formatMMT(0.0750123)).toBe('75\u00A0mm');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatMMT(0.0750123)).toBe('75\u00A0mm');
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
      expect(helpers.formatDuration(12.3456789)).toBe('12.3\u00A0s');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatDuration(12.3456789)).toBe('12.3\u00A0s');
    });
    it("undefined", function() {
      expect(helpers.formatDuration(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatDuration(0/0)).toBe('—');
      expect(helpers.formatDuration(1/0)).toBe('—');
    });
  });
  describe("formatDurationFine", function() {
    it("default", function() {
      prefs.clear();
      expect(helpers.formatDurationFine(12.3456789)).toBe('12.3\u00A0s');
      expect(helpers.formatDurationFine(0.3456789)).toBe('0.35\u00A0s');
      expect(helpers.formatDurationFine(0.03456789)).toBe('0.035\u00A0s');
      expect(helpers.formatDurationFine(0.003456789)).toBe('0.0035\u00A0s');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatDurationFine(12.3456789)).toBe('12.3\u00A0s');
      expect(helpers.formatDurationFine(0.3456789)).toBe('0.35\u00A0s');
      expect(helpers.formatDurationFine(0.03456789)).toBe('0.035\u00A0s');
      expect(helpers.formatDurationFine(0.003456789)).toBe('0.0035\u00A0s');
    });
    it("undefined", function() {
      expect(helpers.formatDurationFine(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatDurationFine(0/0)).toBe('—');
      expect(helpers.formatDurationFine(1/0)).toBe('—');
    });
  });
  describe("formatIsp", function() {
    it("default", function() {
      prefs.clear();
      expect(helpers.formatIsp(123.456789)).toBe('123\u00A0s');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatIsp(123.456789)).toBe('123\u00A0s');
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
  describe("formatCD", function() {
    it("two digits", function() {
      expect(helpers.formatCD(0.551)).toBe('0.55');
    });
    it("one digit", function() {
      expect(helpers.formatCD(0.50)).toBe('0.5');
    });
    it("zero digits", function() {
      expect(helpers.formatCD(1.0)).toBe('1.0');
    });
    it("undefined", function() {
      expect(helpers.formatCD(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatCD(0/0)).toBe('—');
      expect(helpers.formatCD(1/0)).toBe('—');
    });
    it("zero", function() {
      expect(helpers.formatCD(0)).toBe('—');
    });
  });
  describe("formatInt", function() {
    it("two digits", function() {
      expect(helpers.formatInt(0.551)).toBe('1');
    });
    it("one digit", function() {
      expect(helpers.formatInt(0.50)).toBe('1');
    });
    it("zero digits", function() {
      expect(helpers.formatInt(1.0)).toBe('1');
    });
    it("undefined", function() {
      expect(helpers.formatInt(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatInt(0/0)).toBe('—');
      expect(helpers.formatInt(1/0)).toBe('—');
    });
    it("non-positive", function() {
      expect(helpers.formatInt(0)).toBe('0');
      expect(helpers.formatInt(-11.1)).toBe('-11');
    });
  });
  describe("formatPosInt", function() {
    it("two digits", function() {
      expect(helpers.formatPosInt(0.551)).toBe('1');
    });
    it("one digit", function() {
      expect(helpers.formatPosInt(0.50)).toBe('1');
    });
    it("zero digits", function() {
      expect(helpers.formatPosInt(1.0)).toBe('1');
    });
    it("undefined", function() {
      expect(helpers.formatPosInt(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatPosInt(0/0)).toBe('—');
      expect(helpers.formatPosInt(1/0)).toBe('—');
    });
    it("non-positive", function() {
      expect(helpers.formatPosInt(0)).toBe('—');
      expect(helpers.formatPosInt(-11)).toBe('—');
    });
  });
  describe("formatCount", function() {
    it("two digits", function() {
      expect(helpers.formatCount(0.551)).toBe('1');
    });
    it("one digit", function() {
      expect(helpers.formatCount(0.50)).toBe('1');
    });
    it("zero digits", function() {
      expect(helpers.formatCount(1.0)).toBe('1');
    });
    it("undefined", function() {
      expect(helpers.formatCount(undefined)).toBe('—');
    });
    it("NaN", function() {
      expect(helpers.formatCount(0/0)).toBe('—');
      expect(helpers.formatCount(1/0)).toBe('—');
    });
    it("non-positive", function() {
      expect(helpers.formatCount(0)).toBe('0');
      expect(helpers.formatCount(-11.1)).toBe('—');
    });
    it("large", function() {
      expect(helpers.formatCount(9875.6)).toBe('9,876');
      expect(helpers.formatCount(1.23456e7)).toBe('12,345,600');
    });
  });
  describe("formatSort", function() {
    it("default", function() {
      prefs.clear();
      expect(helpers.formatSort(123.456789)).toBe('123.4568');
    });
    it("in/lb", function() {
      units.setDefaultsPref(units.defaults.get('in/lb'));
      expect(helpers.formatSort(123.456789)).toBe('123.4568');
    });
    it("specified unit", function() {
      expect(helpers.formatSort(41.2, 'length', 'in')).toBe('1.0465');
    });
    it("undefined", function() {
      expect(helpers.formatSort(undefined)).toBe('0.0000');
    });
    it("NaN", function() {
      expect(helpers.formatSort(0/0)).toBe('0.0000');
      expect(helpers.formatSort(1/0)).toBe('0.0000');
    });
    it("zero", function() {
      expect(helpers.formatSort(0)).toBe('0.0000');
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
      expect(helpers.formatDate(d, 'short')).toBe('Jan 6, \'16');
    });
    it("short format, 2-digit day", function() {
      var d = new Date(2016, 0, 16, 12, 0, 0);
      expect(helpers.formatDate(d, 'short')).toBe('Jan 16, \'16');
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
  describe("formatType", function() {
    it("invalid value", function() {
      expect(helpers.formatType()).toBe('—');
      expect(helpers.formatType(null)).toBe('—');
      expect(helpers.formatType('')).toBe('—');
    });
    it("enum values", function() {
      expect(helpers.formatType('SU')).toBe('single-use');
      expect(helpers.formatType('reload')).toBe('reload');
      expect(helpers.formatType('hybrid')).toBe('hybrid');
    });
  });
  describe("formatRatio", function() {
    it("invalid value", function() {
      expect(helpers.formatRatio()).toBe('—');
      expect(helpers.formatRatio(null)).toBe('—');
      expect(helpers.formatRatio('')).toBe('—');
    });
    it("zero", function() {
      expect(helpers.formatRatio(0)).toBe('—');
      expect(helpers.formatRatio(0.0001)).toBe('—');
    });
    it("fraction", function() {
      expect(helpers.formatRatio(0.6)).toBe('0.6:1');
      expect(helpers.formatRatio(1.6)).toBe('1.6:1');
    });
    it("whole", function() {
      expect(helpers.formatRatio(5.6)).toBe('6:1');
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
    it("subdomain", function() {
      expect(helpers.websiteAnchor('http://somewhere.example.com/')).toBe('somewhere.example.com');
    });
  });

  describe("downloadAnchor", function() {
    it("undefined", function() {
      expect(helpers.downloadAnchor(undefined)).toBe('—');
    });
    it("empty", function() {
      expect(helpers.downloadAnchor('')).toBe('—');
    });
    it("bare", function() {
      expect(helpers.downloadAnchor('http://example.com')).toBe('example.com');
    });
    it("simple", function() {
      expect(helpers.downloadAnchor('http://example.com/foo.xml')).toBe('example.com/foo.xml');
    });
    it("https", function() {
      expect(helpers.downloadAnchor('https://example.com/bar.xls')).toBe('example.com/bar.xls');
    });
    it("deep", function() {
      expect(helpers.downloadAnchor('http://example.com/path/to/somewhere/baz.csv')).toBe('example.com/baz.csv');
    });
    it("thrustcurve", function() {
      expect(helpers.downloadAnchor('/path/to/bom.docx')).toBe('bom.docx');
      expect(helpers.downloadAnchor('http://localhost/bom.docx')).toBe('bom.docx');
      expect(helpers.downloadAnchor('http://thrustcurve.org/bom.docx')).toBe('bom.docx');
      expect(helpers.downloadAnchor('https://www.thrustcurve.org/bom.docx')).toBe('bom.docx');
    });
  });

  describe("motorFullName", function() {
    it("undefined", function() {
      expect(helpers.motorFullName(undefined, undefined)).toBe('?');
    });
    it("empty", function() {
      expect(helpers.motorFullName({})).toBe('?');
    });
    it("just motor, populated", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: 'H123X',
        commonName: 'H123',
        _manufacturer: { name: 'Big Rocket Motors', abbrev: 'Big' }
      };
      expect(helpers.motorFullName(o)).toBe('Big H123X');
    });
    it("just motor, unpopulated", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: 'H123X',
        commonName: 'H123',
        _manufacturer: '012345678901234567890123'
      };
      expect(helpers.motorFullName(o)).toBe('H123X');
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
      expect(helpers.motorFullName(o1, o2)).toBe('Big H123X');
    });
    it("half A", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: '1/2A3',
        commonName: '1/2A3',
        _manufacturer: { name: 'Big Rocket Motors', abbrev: 'Big' }
      };
      expect(helpers.motorFullName(o)).toBe('Big ½A3');
    });
    it("quarter A", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: '1/4A1.5',
        commonName: '1/4A2',
        _manufacturer: { name: 'Big Rocket Motors', abbrev: 'Big' }
      };
      expect(helpers.motorFullName(o)).toBe('Big ¼A1.5');
    });
    it("eighth A", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: '1/8A0.5',
        commonName: '1/8A1',
        _manufacturer: { name: 'Big Rocket Motors', abbrev: 'Big' }
      };
      expect(helpers.motorFullName(o)).toBe('Big ⅛A0.5');
    });
  });
  describe("motorDesignation", function() {
    it("undefined", function() {
      expect(helpers.motorDesignation(undefined)).toBe('?');
    });
    it("empty", function() {
      expect(helpers.motorDesignation({})).toBe('?');
    });
    it("simple", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: 'H123X',
        commonName: 'H123',
      };
      expect(helpers.motorDesignation(o)).toBe('H123X');
    });
    it("half A", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: '1/2A3',
        commonName: '1/2A3',
        _manufacturer: { name: 'Big Rocket Motors', abbrev: 'Big' }
      };
      expect(helpers.motorDesignation(o)).toBe('½A3');
    });
    it("quarter A", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: '1/4A1.5',
        commonName: '1/4A2',
        _manufacturer: { name: 'Big Rocket Motors', abbrev: 'Big' }
      };
      expect(helpers.motorDesignation(o)).toBe('¼A1.5');
    });
    it("eighth A", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: '1/8A0.5',
        commonName: '1/8A1',
        _manufacturer: { name: 'Big Rocket Motors', abbrev: 'Big' }
      };
      expect(helpers.motorDesignation(o)).toBe('⅛A0.5');
    });
  });
  describe("motorCommonName", function() {
    it("undefined", function() {
      expect(helpers.motorCommonName(undefined)).toBe('?');
    });
    it("empty", function() {
      expect(helpers.motorCommonName({})).toBe('?');
    });
    it("simple", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: 'H123X',
        commonName: 'H123',
      };
      expect(helpers.motorCommonName(o)).toBe('H123');
    });
    it("half A", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: '1/2A3',
        commonName: '1/2A3',
        _manufacturer: { name: 'Big Rocket Motors', abbrev: 'Big' }
      };
      expect(helpers.motorCommonName(o)).toBe('½A3');
    });
    it("quarter A", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: '1/4A1.5',
        commonName: '1/4A2',
        _manufacturer: { name: 'Big Rocket Motors', abbrev: 'Big' }
      };
      expect(helpers.motorCommonName(o)).toBe('¼A2');
    });
    it("eighth A", function() {
      var o = {
        _id: 'abcdefabcdefabcdefabcdef',
        designation: '1/8A0.5',
        commonName: '1/8A1',
        _manufacturer: { name: 'Big Rocket Motors', abbrev: 'Big' }
      };
      expect(helpers.motorCommonName(o)).toBe('⅛A1');
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
      expect(helpers.manufacturerLink({ name: 'Big Rocket Motors', abbrev: 'Big' })).toBe('/manufacturers/Big/details.html');
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
  describe("formatAccuracy", function() {
    it("no reference", function() {
      expect(helpers.formatAccuracy(10, undefined)).toBe('');
      expect(helpers.formatAccuracy(10, null)).toBe('');
      expect(helpers.formatAccuracy(10, 'x')).toBe('');
      expect(helpers.formatAccuracy(10, NaN)).toBe('');
    });
    it("no value", function() {
      expect(helpers.formatAccuracy(undefined, 10)).toBe('—');
      expect(helpers.formatAccuracy(null, 10)).toBe('—');
      expect(helpers.formatAccuracy('x', 10)).toBe('—');
      expect(helpers.formatAccuracy(NaN, 10)).toBe('—');
    });
    it("same", function() {
      expect(helpers.formatAccuracy(10, 10)).toBe('=');
      expect(helpers.formatAccuracy(10.0001, 10)).toBe('=');
      expect(helpers.formatAccuracy(0.01, 0.01)).toBe('=');
      expect(helpers.formatAccuracy(0.01001, 0.01)).toBe('=');
    });
    it("different", function() {
      expect(helpers.formatAccuracy(10, 11)).toBe('−9%');
      expect(helpers.formatAccuracy(10.9, 10)).toBe('+9%');
      expect(helpers.formatAccuracy(0.01, 0.011)).toBe('−9%');
      expect(helpers.formatAccuracy(0.011, 0.01)).toBe('+10%');
    });
  });
  describe("renderBBCode", function() {
    it("undefined", function() {
      expect(helpers.renderBBCode(undefined)).toBe('');
    });
    it("empty", function() {
      expect(helpers.renderBBCode('')).toBe('');
      expect(helpers.renderBBCode(' \n')).toBe('');
    });
    it("plain", function() {
      expect(helpers.renderBBCode('important stuff to know')).toBe('<p>important stuff to know</p>\n');
      expect(helpers.renderBBCode('here & now')).toBe('<p>here &amp; now</p>\n');
    });
    it("tags", function() {
      expect(helpers.renderBBCode('[b]important[/b] stuff to know')).toBe('<p><b>important</b> stuff to know</p>\n');
      expect(helpers.renderBBCode('[list][*]here[*]now[/list]').replace(/\n */g, '')).toBe('<ul><li>here</li><li>now</li></ul>');
    });
  });
  describe("nameCompare", function() {
    it("both empty", function() {
      expect(helpers.nameCompare(null, null)).toBe(0);
      expect(helpers.nameCompare('', null)).toBe(0);
      expect(helpers.nameCompare(null, '')).toBe(0);
      expect(helpers.nameCompare('', '')).toBe(0);
    });
    it("empty vs string", function() {
      expect(helpers.nameCompare('a', null)).toBeGreaterThan(0);
      expect(helpers.nameCompare(null, 'b')).toBeLessThan(0);
      expect(helpers.nameCompare('a', '')).toBeGreaterThan(0);
      expect(helpers.nameCompare('', 'b')).toBeLessThan(0);
    });
    it("just numbers", function() {
      expect(helpers.nameCompare('0', '0')).toBe(0);
      expect(helpers.nameCompare('3', '4')).toBeLessThan(0);
      expect(helpers.nameCompare('30', '4')).toBeGreaterThan(0);
      expect(helpers.nameCompare('120', '120')).toBe(0);
      expect(helpers.nameCompare('1201', '125')).toBeGreaterThan(0);
      expect(helpers.nameCompare('125', '1201')).toBeLessThan(0);
      expect(helpers.nameCompare('1002', '1010')).toBeLessThan(0);
      expect(helpers.nameCompare('1010', '1002')).toBeGreaterThan(0);
    });
    it("embedded numbers", function() {
      expect(helpers.nameCompare('A-0', 'a-0')).toBe(0);
      expect(helpers.nameCompare('a-3', 'A-4')).toBeLessThan(0);
      expect(helpers.nameCompare('A-30', 'A-4')).toBeGreaterThan(0);
      expect(helpers.nameCompare('B120C', 'B120C')).toBe(0);
      expect(helpers.nameCompare('B1201C', 'B125C')).toBeGreaterThan(0);
      expect(helpers.nameCompare('B125C', 'b1201c')).toBeLessThan(0);
      expect(helpers.nameCompare('B1002C', 'B1010C')).toBeLessThan(0);
      expect(helpers.nameCompare('B1010C', 'b1002c')).toBeGreaterThan(0);
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
