"use strict";

const data = require('..'),
      XMLFormat = data.XMLFormat,
      JSONFormat = data.JSONFormat;

describe("data", function() {
  describe("XMLFormat", function() {
    describe("singular", function() {
      it("things", function() {
	expect(XMLFormat.singular('things')).toBe('thing');
      });
      it("thingies", function() {
	expect(XMLFormat.singular('thingies')).toBe('thingy');
      });
      it("thingses", function() {
	expect(XMLFormat.singular('thingses')).toBe('things');
      });
    });

    describe("empty", function() {
      var fmt;
      it("construct", function() {
	fmt = new XMLFormat({ root: "empty" });
      });
      it("close", function() {
	fmt.close();
      });
      it("type", function() {
	expect(fmt.type()).toBe('text/xml');
      });
      it("toString", function() {
	var s = fmt.toString().replace(/\n\s*/g, '');
	expect(s).toBe('<?xml version="1.0" encoding="UTF-8"?><empty></empty>');
      });
    });
    describe("element", function() {
      var fmt;
      it("construct", function() {
	fmt = new XMLFormat({ root: "element" });
      });
      it("element", function() {
	expect(fmt.element('place', { name: 'Somewhere', abbrev: 'Where' })).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/^<\?[^>]+>/, '').replace(/\n\s*/g, '');
	expect(s).toBe('<element><place abbrev="Where">Somewhere</place></element>');
      });
    });
    describe("element-list", function() {
      var fmt;
      it("construct", function() {
	fmt = new XMLFormat({ root: "element-list" });
      });
      it("elementList", function() {
	expect(fmt.elementList('things', [ 'one', 'two', 'three' ])).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/^<\?[^>]+>/, '').replace(/\n\s*/g, '');
	expect(s).toBe('<element-list><things><thing>one</thing><thing>two</thing><thing>three</thing></things></element-list>');
      });
    });
    describe("length-list", function() {
      var fmt;
      it("construct", function() {
	fmt = new XMLFormat({ root: "length-list" });
      });
      it("lengthList", function() {
	expect(fmt.lengthList('lengths', [ 0.006, 0.0105, 0.018001, 0.02399999 ])).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/^<\?[^>]+>/, '').replace(/\n\s*/g, '');
	expect(s).toBe('<length-list><lengths><length>6</length><length>10.5</length><length>18</length><length>24</length></lengths></length-list>');
      });
    });
    describe("id", function() {
      var fmt;
      it("construct", function() {
	fmt = new XMLFormat({ root: "id" });
      });
      it("id", function() {
	expect(fmt.id('thing', '012345678abcdef012345678')).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/^<\?[^>]+>/, '').replace(/\n\s*/g, '');
	expect(s).toBe('<id><thing>012345678abcdef012345678</thing></id>');
      });
    });
    describe("id-list", function() {
      var fmt;
      it("construct", function() {
	fmt = new XMLFormat({ root: "id-list" });
      });
      it("idList", function() {
	expect(fmt.idList('things', [ '012345678abcdef012345678', 'abcdef012345678901abcdef', '876543210fedcba876543210' ])).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/^<\?[^>]+>/, '').replace(/\n\s*/g, '');
	expect(s).toBe('<id-list><things><thing>012345678abcdef012345678</thing><thing>abcdef012345678901abcdef</thing><thing>876543210fedcba876543210</thing></things></id-list>');
      });
    });
  });

  describe("JSONFormat", function() {
    describe("camelCase", function() {
      it("thing", function() {
	expect(JSONFormat.camelCase('thing')).toBe('thing');
      });
      it("the-thing", function() {
	expect(JSONFormat.camelCase('the-thing')).toBe('theThing');
      });
      it("one-more-thing", function() {
	expect(JSONFormat.camelCase('one-more-thing')).toBe('oneMoreThing');
      });
    });

    describe("value", function() {
      it("undefined", function() {
	expect(JSONFormat.value()).toBe(null);
      });
      it("null", function() {
	expect(JSONFormat.value(null)).toBe(null);
      });
      it("'foo'", function() {
	expect(JSONFormat.value('foo')).toBe('foo');
      });
      it("real", function() {
	expect(JSONFormat.value('11.1')).toBe(11.1);
      });
      it("fraction", function() {
	expect(JSONFormat.value('0.11')).toBe(0.11);
      });
      it("int", function() {
	expect(JSONFormat.value('11')).toBe(11);
      });
      it("NaN", function() {
	expect(JSONFormat.value(0/0)).toBe(null);
      });
      it("date", function() {
	expect(JSONFormat.value(new Date('2016-03-26T18:51:30Z'))).toBe('2016-03-26T18:51:30.000Z');
      });
    });

    describe("empty", function() {
      var fmt;
      it("construct", function() {
	fmt = new JSONFormat();
      });
      it("close", function() {
	fmt.close();
      });
      it("type", function() {
	expect(fmt.type()).toBe('application/json');
      });
      it("toString", function() {
	var s = fmt.toString().replace(/\n\s*/g, '');
	expect(s).toBe('{}');
      });
    });
    describe("element", function() {
      var fmt;
      it("construct", function() {
	fmt = new JSONFormat();
      });
      it("element", function() {
	expect(fmt.element('place', { name: 'Somewhere', abbrev: 'Where' })).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/\n\s*/g, '').replace(/ *: +/g, ':');
	expect(s).toBe('{"place":{"name":"Somewhere","abbrev":"Where"}}');
      });
    });
    describe("element-list", function() {
      var fmt;
      it("construct", function() {
	fmt = new JSONFormat();
      });
      it("elementList", function() {
	expect(fmt.elementList('things', [ 'one', 'two', 'three' ])).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/\n\s*/g, '').replace(/ *: +/g, ':');
	expect(s).toBe('{"things":["one","two","three"]}');
      });
    });
    describe("length-list", function() {
      var fmt;
      it("construct", function() {
	fmt = new JSONFormat();
      });
      it("lengthList", function() {
	expect(fmt.lengthList('lengths', [ 0.006, 0.0105, 0.018001, 0.02399999 ])).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/\n\s*/g, '').replace(/ *: +/g, ':');
	expect(s).toBe('{"lengths":[6,10.5,18,24]}');
      });
    });
    describe("id", function() {
      var fmt;
      it("construct", function() {
	fmt = new JSONFormat();
      });
      it("id", function() {
	expect(fmt.id('thing', '012345678abcdef012345678')).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/\n\s*/g, '').replace(/ *: +/g, ':');
	expect(s).toBe('{"thing":"012345678abcdef012345678"}');
      });
    });
    describe("id-list", function() {
      var fmt;
      it("construct", function() {
	fmt = new JSONFormat();
      });
      it("idList", function() {
	expect(fmt.idList('things', [ '012345678abcdef012345678', 'abcdef012345678901abcdef', '876543210fedcba876543210' ])).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/\n\s*/g, '').replace(/ *: +/g, ':');
	expect(s).toBe('{"things":["012345678abcdef012345678","abcdef012345678901abcdef","876543210fedcba876543210"]}');
      });
    });
  });
});
