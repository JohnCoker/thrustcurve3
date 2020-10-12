"use strict";

const metadata = require('../../metadata'),
      errors = require('../../errors'),
      api1 = require('..');

describe('api1', function() {
  describe("hasOwnProperty", function() {
    it("exists", function() {
      expect(typeof api1.hasOwnProperty).toBe('function');
    });
    it("simple", function() {
      let example = {
        foo: 17,
        bar: 'some stuff',
        bazArray: [1, 3, 5],
        'bum-object': { a: 12, b: 13 },
      };
      expect(api1.hasOwnProperty(example, 'foo')).toBe(true);
      expect(api1.hasOwnProperty(example, 'bar')).toBe(true);
      expect(api1.hasOwnProperty(example, 'bazArray')).toBe(true);
      expect(api1.hasOwnProperty(example, 'bum-object')).toBe(true);
      expect(api1.hasOwnProperty(example, 'boo')).toBe(false);
      expect(api1.hasOwnProperty(example, 'baz-array')).toBe(false);
      expect(api1.hasOwnProperty(example, 'bumObject')).toBe(false);
    });
    it("prototype", function() {
      expect(api1.hasOwnProperty({}, 'toString')).toBe(false);
    });
    it("invalid property", function() {
      expect(api1.hasOwnProperty({}, '')).toBe(false);
      expect(api1.hasOwnProperty({}, undefined)).toBe(false);
      expect(api1.hasOwnProperty({}, null)).toBe(false);
      expect(api1.hasOwnProperty({}, 7)).toBe(false);
    });
    it("non object", function() {
      expect(api1.hasOwnProperty(undefined, 'foo')).toBe(false);
      expect(api1.hasOwnProperty(null, 'foo')).toBe(false);
      expect(api1.hasOwnProperty('x', 'foo')).toBe(false);
      expect(api1.hasOwnProperty(7, 'foo')).toBe(false);
    });
  });

  describe("getElement", function() {
    it("exists", function() {
      expect(typeof api1.getElement).toBe('function');
    });
    it("simple", function() {
      expect(api1.getElement({}, 'foo')).toBeUndefined();
      expect(api1.getElement({ foo: "x" }, 'foo')).toBe('x');
      expect(api1.getElement({ foo: [11, 12] }, 'foo')).toEqual([11, 12]);
    });
    it("trimmed", function() {
      expect(api1.getElement({ foo: null }, 'foo')).toBeUndefined();
      expect(api1.getElement({ foo: '' }, 'foo')).toBe('');
      expect(api1.getElement({ foo: ' ' }, 'foo')).toBe('');
      expect(api1.getElement({ foo: ' 14 ' }, 'foo')).toBe('14');
      expect(api1.getElement({ foo: '*' }, 'foo')).toBeUndefined();
      expect(api1.getElement({ foo: 'all' }, 'foo')).toBeUndefined();
      expect(api1.getElement({ foo: ['x'] }, 'foo')).toBe('x');
    });
    it("XML", function() {
      expect(api1.getElement({}, 'foo-bar')).toBeUndefined();
      expect(api1.getElement({ "foo-bar": "x" }, 'foo-bar')).toBe('x');
    });
    it("JSON", function() {
      expect(api1.getElement({}, 'fooBar')).toBeUndefined();
      expect(api1.getElement({ "fooBar": "x" }, 'fooBar')).toBe('x');
    });
    it("XML parsing", function() {
      expect(api1.getElement({}, 'foo-bar', api1.intValue, errors.throw)).toBeUndefined();
      expect(api1.getElement({ "foo-bar": "21" }, 'foo-bar', api1.intValue, errors.throw)).toBe(21);
      let errs = new errors.Collector();
      expect(api1.getElement({ "foo-bar": "2ish" }, 'foo-bar', api1.intValue, errs)).toBeUndefined();
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid foo-bar value "2ish".');
    });
    it("JSON parsing", function() {
      expect(api1.getElement({}, 'foo-bar', api1.intValue, errors.throw)).toBeUndefined();
      expect(api1.getElement({ "foo-bar": 21 }, 'foo-bar', api1.intValue, errors.throw)).toBe(21);
      let errs = new errors.Collector();
      expect(api1.getElement({ "fooBar": "2ish" }, 'foo-bar', api1.intValue, errs)).toBeUndefined();
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid fooBar value "2ish".');
    });
  });

  describe("getElementName", function() {
    it("exists", function() {
      expect(typeof api1.getElementName).toBe('function');
    });
    it("simple", function() {
      expect(api1.getElementName({}, 'foo')).toBe('foo');
      expect(api1.getElementName({}, 'foo', { isXML: true })).toBe('foo');
      expect(api1.getElementName({}, 'foo', { isJSON: true })).toBe('foo');
      expect(api1.getElementName({ foo: "x" }, 'foo')).toBe('foo');
      expect(api1.getElementName({ foo: "x" }, 'foo', { isXML: true })).toBe('foo');
      expect(api1.getElementName({ foo: "x" }, 'foo', { isJSON: true })).toBe('foo');
      expect(api1.getElementName({ foo: [11, 12] }, 'foo')).toBe('foo');
    });
    it("XML", function() {
      expect(api1.getElementName({}, 'foo-bar')).toBe('foo-bar');
      expect(api1.getElementName({}, 'foo-bar', { isXML: true })).toBe('foo-bar');
      expect(api1.getElementName({ "foo-bar": "x" }, 'foo-bar')).toBe('foo-bar');
    });
    it("JSON", function() {
      expect(api1.getElementName({}, 'foo-bar')).toBe('foo-bar');
      expect(api1.getElementName({}, 'foo-bar', { isJSON: true })).toBe('fooBar');
      expect(api1.getElementName({ "fooBar": "x" }, 'foo-bar')).toBe('fooBar');
    });
  });

  describe("trimValue", function() {
    it("missing", function() {
      expect(api1.trimValue(undefined)).toBeUndefined();
      expect(api1.trimValue(null)).toBeUndefined();
    });
    it("wildcards", function() {
      expect(api1.trimValue('*')).toBeUndefined();
      expect(api1.trimValue('all')).toBeUndefined();
    });
    it("arrays", function() {
      expect(api1.trimValue([])).toBeUndefined();
      expect(api1.trimValue(['x'])).toBe('x');
      expect(api1.trimValue([11, 12])).toEqual([11, 12]);
    });
  });

  describe("intValue", function() {
    it("natural", function() {
      expect(api1.intValue(0)).toBe(0);
      expect(api1.intValue('0')).toBe(0);
      expect(api1.intValue(102)).toBe(102);
      expect(api1.intValue('102')).toBe(102);
      expect(api1.intValue(-1)).toBe(-1);
      expect(api1.intValue('-1')).toBe(-1);
    });
    it("round", function() {
      expect(api1.intValue(1e-9)).toBe(0);
      expect(api1.intValue(101.99999999)).toBe(102);
    });
    it("invalid", function() {
      expect(api1.intValue(false)).toBeUndefined();
      expect(api1.intValue('boo')).toBeUndefined();
      expect(api1.intValue('11ish')).toBeUndefined();
      expect(api1.intValue(NaN)).toBeUndefined();
      expect(api1.intValue(Infinity)).toBeUndefined();
    });
  });

  describe("numberValue", function() {
    it("valid", function() {
      expect(api1.numberValue(0)).toBe(0);
      expect(api1.numberValue('0')).toBe(0);
      expect(api1.numberValue(102.345)).toBe(102.345);
      expect(api1.numberValue('102.345')).toBe(102.345);
      expect(api1.numberValue(-22.33)).toBe(-22.33);
      expect(api1.numberValue('-22.33')).toBe(-22.33);
      expect(api1.numberValue(0.01)).toBe(0.01);
      expect(api1.numberValue('.01')).toBe(0.01);
      expect(api1.numberValue(101.9)).toBe(101.9);
    });
    it("invalid", function() {
      expect(api1.numberValue(false)).toBeUndefined();
      expect(api1.numberValue('boo')).toBeUndefined();
      expect(api1.numberValue('11,22')).toBeUndefined();
      expect(api1.numberValue(NaN)).toBeUndefined();
      expect(api1.numberValue(Infinity)).toBeUndefined();
    });
  });

  describe("booleanValue", function() {
    it("true", function() {
      expect(api1.booleanValue('true')).toBe(true);
      expect(api1.booleanValue('True')).toBe(true);
      expect(api1.booleanValue('1')).toBe(true);
      expect(api1.booleanValue('on')).toBe(true);
      expect(api1.booleanValue('yes')).toBe(true);
      expect(api1.booleanValue(1)).toBe(true);
    });
    it("false", function() {
      expect(api1.booleanValue('false')).toBe(false);
      expect(api1.booleanValue('False')).toBe(false);
      expect(api1.booleanValue('0')).toBe(false);
      expect(api1.booleanValue('off')).toBe(false);
      expect(api1.booleanValue('no')).toBe(false);
      expect(api1.booleanValue(0)).toBe(false);
    });
    it("invalid", function() {
      expect(api1.booleanValue(undefined)).toBeUndefined();
      expect(api1.booleanValue(null)).toBeUndefined();
      expect(api1.booleanValue('')).toBeUndefined();
      expect(api1.booleanValue('probably')).toBeUndefined();
      expect(api1.booleanValue(12.5)).toBeUndefined();
    });
  });

  describe("dateValue", function() {
    it("date", function() {
      expect(api1.dateValue('2020-09-13')).toEqual(new Date(2020, 8, 13));
      expect(api1.dateValue('2020-9-13')).toEqual(new Date(2020, 8, 13));
    });
    it("datetime", function() {
      expect(api1.dateValue('2020-09-13T12:13:14.000Z')).toEqual(new Date(2020, 8, 13));
      expect(api1.dateValue('2020-9-13T12:00:00-07:00')).toEqual(new Date(2020, 8, 13));
    });
    it("invalid", function() {
      expect(api1.dateValue('20-09-13')).toBeUndefined();
      expect(api1.dateValue('2020-0-13')).toBeUndefined();
      expect(api1.dateValue('2020-13-09')).toBeUndefined();
      expect(api1.dateValue('2020-09-00')).toBeUndefined();
      expect(api1.dateValue('2020-09-32')).toBeUndefined();
    });
  });

  describe("closeTo", function() {
    it("ints", function() {
      expect(api1.closeTo(0, 0)).toBe(true);
      expect(api1.closeTo(2, 2)).toBe(true);
      expect(api1.closeTo(-2, -2)).toBe(true);
      expect(api1.closeTo(-2, 2)).toBe(false);
      expect(api1.closeTo(2, -2)).toBe(false);
      expect(api1.closeTo(1, 0)).toBe(false);
      expect(api1.closeTo(-1, 0)).toBe(false);
      expect(api1.closeTo(-2, -1)).toBe(false);
    });
    it("floats", function() {
      expect(api1.closeTo(0.51627384, 0.51627384)).toBe(true);
      expect(api1.closeTo(5162.7384, 0.51627384)).toBe(false);
      expect(api1.closeTo(5162.7384, 5162.74)).toBe(false);
      expect(api1.closeTo(Math.sqrt(2) * Math.sqrt(2), 2)).toBe(true);
    });
  });

  describe("getMaxResults", function() {
    it("unspecified", function() {
      expect(api1.getMaxResults({}, errors.throw)).toBe(20);
      expect(api1.getMaxResults({}, errors.throw, 9)).toBe(9);
      expect(api1.getMaxResults({}, errors.throw, -1)).toBe(-1);
    });
    it("specified JSON", function() {
      expect(api1.getMaxResults({ maxResults: 14 }, errors.throw)).toBe(14);
      expect(api1.getMaxResults({ maxResults: 14 }, errors.throw, 9)).toBe(14);
      expect(api1.getMaxResults({ maxResults: 14 }, errors.throw, -1)).toBe(14);
    });
    it("specified XML", function() {
      expect(api1.getMaxResults({ 'max-results': 14 }, errors.throw)).toBe(14);
      expect(api1.getMaxResults({ 'max-results': 14 }, errors.throw, 9)).toBe(14);
      expect(api1.getMaxResults({ 'max-results': 14 }, errors.throw, -1)).toBe(14);
    });
    it("invalid JSON", function() {
      let errs = new errors.Collector();
      expect(api1.getMaxResults({ 'maxResults': 'many' }, errs)).toBe(20);
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid maxResults value "many".');
    });
    it("invalid XML", function() {
      let errs = new errors.Collector();
      expect(api1.getMaxResults({ 'max-results': 'many' }, errs)).toBe(20);
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid max-results value "many".');
    });
  });

  describe("searchQuery", function() {
    const cache = metadata.sample();
    it("empty", function() {
      expect(api1.searchQuery(undefined, cache, errors.throw)).toEqual({});
      expect(api1.searchQuery(null, cache, errors.throw)).toEqual({});
      expect(api1.searchQuery({}, cache, errors.throw)).toEqual({});
    });
    it("manufacturer", function() {
      expect(api1.searchQuery({ manufacturer: "Estes" }, cache, errors.throw)).toEqual({
        _manufacturer: "mfr000000000000000000002",
      });
      let errs = new errors.Collector();
      expect(api1.searchQuery({ manufacturer: "Thiokol" }, cache, errs)).toEqual({
        _manufacturer: null,
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid manufacturer value "Thiokol".');
    });
    it("designation", function() {
      expect(api1.searchQuery({ designation: "D12" }, cache, errors.throw)).toEqual({
        $or: [ { designation: "D12" }, { altDesignation: "D12" } ]
      });
      let errs = new errors.Collector();
      expect(api1.searchQuery({ designation: "" }, cache, errs)).toEqual({
        designation: null,
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid designation value "".');
    });
    it("commonName", function() {
      expect(api1.searchQuery({ "common-name": "D12" }, cache, errors.throw)).toEqual({
        $or: [ { commonName: "D12" }, { altName: "D12" } ]
      });
      expect(api1.searchQuery({ commonName: "D12" }, cache, errors.throw)).toEqual({
        $or: [ { commonName: "D12" }, { altName: "D12" } ]
      });
      let errs = new errors.Collector();
      expect(api1.searchQuery({ commonName: "3X" }, cache, errs)).toEqual({
        commonName: null,
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid commonName value "3X".');
    });
    it("designation", function() {
      expect(api1.searchQuery({ designation: "D12" }, cache, errors.throw)).toEqual({
        $or: [ { designation: "D12" }, { altDesignation: "D12" } ]
      });
      let errs = new errors.Collector();
      expect(api1.searchQuery({ designation: "" }, cache, errs)).toEqual({
        designation: null,
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid designation value "".');
    });
    it("commonName and designation", function() {
      expect(api1.searchQuery({ "common-name": "F12", designation: "F12J" }, cache, errors.throw)).toEqual({
        $and: [
          { $or: [ { designation: "F12J" }, { altDesignation: "F12J" } ] },
          { $or: [ { commonName: "F12" }, { altName: "F12" } ] },
        ]          
      });
    });
    it("impulseClass", function() {
      expect(api1.searchQuery({ "impulse-class": "D" }, cache, errors.throw)).toEqual({
        impulseClass: "D",
      });
      expect(api1.searchQuery({ impulseClass: "D" }, cache, errors.throw)).toEqual({
        impulseClass: "D",
      });
      let errs = new errors.Collector();
      expect(api1.searchQuery({ impulseClass: "Ω" }, cache, errs)).toEqual({
        impulseClass: null,
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid impulseClass value "Ω".');
    });
    it("diameter", function() {
      expect(api1.searchQuery({ diameter: "54" }, cache, errors.throw)).toEqual({
        diameter: { $gt: 0.0525, $lt: 0.0555 },
      });
      expect(api1.searchQuery({ diameter: 54 }, cache, errors.throw)).toEqual({
        diameter: { $gt: 0.0525, $lt: 0.0555 },
      });
      let errs = new errors.Collector();
      expect(api1.searchQuery({ diameter: "1in" }, cache, errs)).toEqual({
        diameter: 0,
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid diameter value "1in"; expected millimeters.');
    });
    it("type", function() {
      expect(api1.searchQuery({ type: "SU" }, cache, errors.throw)).toEqual({
        type: 'SU',
      });
      let errs = new errors.Collector();
      expect(api1.searchQuery({ type: "hypergol" }, cache, errs)).toEqual({
        type: null,
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid type value "hypergol".');
    });
    it("certOrg", function() {
      expect(api1.searchQuery({ "cert-org": "NAR" }, cache, errors.throw)).toEqual({
        _certOrg: "org000000000000000000001",
      });
      expect(api1.searchQuery({ certOrg: "NAR" }, cache, errors.throw)).toEqual({
        _certOrg: "org000000000000000000001",
      });
      let errs = new errors.Collector();
      expect(api1.searchQuery({ certOrg: "XRA" }, cache, errs)).toEqual({
        _certOrg: null,
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid certOrg value "XRA".');
    });
    it("sparky", function() {
      expect(api1.searchQuery({ sparky: "true" }, cache, errors.throw)).toEqual({
        sparky: true,
      });
      expect(api1.searchQuery({ sparky: false }, cache, errors.throw)).toEqual({
        sparky: false,
      });
      let errs = new errors.Collector();
      expect(api1.searchQuery({ sparky: "sometimes" }, cache, errs)).toEqual({
        sparky: null,
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid sparky value "sometimes"; expected true/false.');
    });
    it("info-updated-since", function() {
      expect(api1.searchQuery({ "info-updated-since": "2020-01-01" }, cache, errors.throw)).toEqual({
        updatedAt: { $gte: new Date(2020, 0, 1) },
      });
      expect(api1.searchQuery({ infoUpdatedSince: "2010-12-1" }, cache, errors.throw)).toEqual({
        updatedAt: { $gte: new Date(2010, 11, 1) },
      });
      let errs = new errors.Collector();
      expect(api1.searchQuery({ infoUpdatedSince: "yesterday" }, cache, errs)).toEqual({
        updatedAt: null,
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid infoUpdatedSince value "yesterday"; expected ISO date.');
    });
    it("data-updated-since", function() {
      expect(api1.searchQuery({ "data-updated-since": "2020-01-01" }, cache, errors.throw)).toEqual({
        simfiles: { updatedAt: { $gte: new Date(2020, 0, 1) } },
      });
      expect(api1.searchQuery({ dataUpdatedSince: "2010-12-1" }, cache, errors.throw)).toEqual({
        simfiles: { updatedAt: { $gte: new Date(2010, 11, 1) } },
      });
      let errs = new errors.Collector();
      expect(api1.searchQuery({ dataUpdatedSince: "last week" }, cache, errs)).toEqual({
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid dataUpdatedSince value "last week"; expected ISO date.');
    });
    it("has-data-files", function() {
      expect(api1.searchQuery({ "has-data-files": "true" }, cache, errors.throw)).toEqual({
        simfiles: { $exists: true },
      });
      expect(api1.searchQuery({ hasDataFiles: "false" }, cache, errors.throw)).toEqual({
        simfiles: { $exists: false },
      });
      let errs = new errors.Collector();
      expect(api1.searchQuery({ hasDataFiles: "some" }, cache, errs)).toEqual({
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid hasDataFiles value "some"; expected true/false.');
    });
    it("availability", function() {
      expect(api1.searchQuery({ availability: "available" }, cache, errors.throw)).toEqual({
        availability: { $in: [ 'regular', 'occasional' ] },
      });
      expect(api1.searchQuery({ availability: "regular" }, cache, errors.throw)).toEqual({
        availability: 'regular',
      });
      let errs = new errors.Collector();
      expect(api1.searchQuery({ availability: "yesteryear" }, cache, errs)).toEqual({
        availability: null,
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid availability value "yesteryear".');
    });
  });

  describe("downloadQuery", function() {
    const cache = metadata.sample();
    it("empty", function() {
      let errs = new errors.Collector();
      expect(api1.downloadQuery({}, cache, errs)).toEqual({ _motor: "0" });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('No motor IDs specified to download files for.');
    });
    it("motorId", function() {
      expect(api1.downloadQuery({ "motor-id": "123" }, cache, errors.throw)).toEqual({ _motor: { $in: ['123'] } });
      expect(api1.downloadQuery({ motorId: "abcdef000000abcdef123456" }, cache, errors.throw)).toEqual({
        _motor: { $in: ["abcdef000000abcdef123456"] } });
    });
    it("motorIds", function() {
      expect(api1.downloadQuery({ "motor-ids": ["123", "456"] }, cache, errors.throw)).toEqual({
        _motor: { $in: ["123", "456"] }
      });
      expect(api1.downloadQuery({
        motorIds: ["abcdef000000abcdef123456", "fedcba000000fedcba654321"]
      }, cache, errors.throw)).toEqual({
        _motor: { $in: ["abcdef000000abcdef123456", "fedcba000000fedcba654321"] }
      });
    });
    it("both IDs", function() {
      let errs = new errors.Collector();
      expect(api1.downloadQuery({
        motorId: "123",
        motorIds: ['abcdef000000abcdef123456', 'fedcba000000fedcba654321']
      }, cache, errs)).toEqual({ _motor: "0" });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Both motorId and motorIds specified.');
    });
    it("format", function() {
      expect(api1.downloadQuery({ motorId: "123", format: "RASP" }, cache, errors.throw)).toEqual({
        _motor: { $in: ["123"] },
        format: "RASP"
      });
      let errs = new errors.Collector();
      expect(api1.downloadQuery({ motorId: "123", format: "another" }, cache, errs)).toEqual({
        _motor: { $in: ["123"] },
        format: "another"
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid format value "another".');
    });
    it("license", function() {
      expect(api1.downloadQuery({ motorId: "123", license: "free" }, cache, errors.throw)).toEqual({
        _motor: { $in: ["123"] },
        license: "free"
      });
      let errs = new errors.Collector();
      expect(api1.downloadQuery({ motorId: "123", license: "expensive" }, cache, errs)).toEqual({
        _motor: { $in: ["123"] },
        license: "expensive"
      });
      expect(errs.errorCount()).toBe(1);
      expect(errs.lastError().message).toBe('Invalid license value "expensive".');
    });
  });
});
