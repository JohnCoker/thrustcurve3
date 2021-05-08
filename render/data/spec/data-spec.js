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
    describe("elementFull", function() {
      var fmt;
      it("construct", function() {
	fmt = new XMLFormat({ root: "element" });
      });
      it("elementFull", function() {
	expect(fmt.elementFull('place', { name: 'Somewhere', abbrev: 'Where' })).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/^<\?[^>]+>/, '').replace(/\n\s*/g, '');
	expect(s).toBe('<element><place><name>Somewhere</name><abbrev>Where</abbrev></place></element>');
      });
    });
    describe("elementList", function() {
      var fmt;
      it("construct", function() {
	fmt = new XMLFormat({ root: "element-list" });
      });
      it("elementList", function() {
	expect(fmt.elementList('the-things', [ 'one', 'two', 'three' ])).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/^<\?[^>]+>/, '').replace(/\n\s*/g, '');
	expect(s).toBe('<element-list>' +
                        '<the-things>' +
                         '<the-thing>one</the-thing>' +
                         '<the-thing>two</the-thing>' +
                         '<the-thing>three</the-thing>' +
                        '</the-things>' +
                       '</element-list>');
      });
    });
    describe("elementListFull", function() {
      var fmt;
      it("construct", function() {
	fmt = new XMLFormat({ root: "element-list" });
      });
      it("elementListFull", function() {
	expect(fmt.elementListFull('the-things', [
          { 'the-name': 'one', x: 1 }, { 'the-name': 'two', x: 2 }, { 'the-name': 'three', x: 3 }
        ])).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/^<\?[^>]+>/, '').replace(/\n\s*/g, '');
	expect(s).toBe('<element-list>' +
                        '<the-things>' +
                         '<the-thing><the-name>one</the-name><x>1</x></the-thing>' +
                         '<the-thing><the-name>two</the-name><x>2</x></the-thing>' +
                         '<the-thing><the-name>three</the-name><x>3</x></the-thing>' +
                        '</the-things>' +
                       '</element-list>');
      });
    });
    describe("elementListFull extra", function() {
      var fmt;
      it("construct", function() {
	fmt = new XMLFormat({ root: "element-list" });
      });
      it("elementListFull", function() {
	expect(fmt.elementListFull('the-things', [
          { 'the-name': 'one', x: 1 }, { 'the-name': 'two', x: 2 }, { 'the-name': 'three', x: 3 }
        ], { 'thing-count': 3 })).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/^<\?[^>]+>/, '').replace(/\n\s*/g, '');
	expect(s).toBe('<element-list>' +
                        '<the-things>' +
                         '<the-thing><the-name>one</the-name><x>1</x></the-thing>' +
                         '<the-thing><the-name>two</the-name><x>2</x></the-thing>' +
                         '<the-thing><the-name>three</the-name><x>3</x></the-thing>' +
                         '<thing-count>3</thing-count>' +
                        '</the-things>' +
                       '</element-list>');
      });
    });
    describe("elementListFull child name", function() {
      var fmt;
      it("construct", function() {
	fmt = new XMLFormat({ root: "element-list" });
      });
      it("elementListFull", function() {
	expect(fmt.elementListFull('the-things', 'thang', [
          { 'the-name': 'one', x: 1 }, { 'the-name': 'two', x: 2 }, { 'the-name': 'three', x: 3 }
        ], { 'thing-count': 3 })).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/^<\?[^>]+>/, '').replace(/\n\s*/g, '');
	expect(s).toBe('<element-list>' +
                        '<the-things>' +
                         '<thang><the-name>one</the-name><x>1</x></thang>' +
                         '<thang><the-name>two</the-name><x>2</x></thang>' +
                         '<thang><the-name>three</the-name><x>3</x></thang>' +
                         '<thing-count>3</thing-count>' +
                        '</the-things>' +
                       '</element-list>');
      });
    });
    describe("lengthList", function() {
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

    describe("kebabCase", function() {
      it("thing", function() {
	expect(JSONFormat.kebabCase('thing')).toBe('thing');
      });
      it("theThing", function() {
	expect(JSONFormat.kebabCase('theThing')).toBe('the-thing');
      });
      it("oneMoreThing", function() {
	expect(JSONFormat.kebabCase('oneMoreThing')).toBe('one-more-thing');
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
	expect(JSONFormat.value(11.1)).toBe(11.1);
      });
      it("fraction", function() {
	expect(JSONFormat.value(0.11)).toBe(0.11);
      });
      it("int", function() {
	expect(JSONFormat.value(11)).toBe(11);
      });
      it("NaN", function() {
	expect(JSONFormat.value(0/0)).toBe(null);
      });
      it("date", function() {
	expect(JSONFormat.value(new Date('2016-03-26T18:51:30Z'))).toBe('2016-03-26');
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
    describe("elementFull", function() {
      var fmt;
      it("construct", function() {
	fmt = new JSONFormat();
      });
      it("elementFull", function() {
	expect(fmt.elementFull('place', { name: 'Somewhere', abbrev: 'Where' })).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/\n\s*/g, '').replace(/ *: +/g, ':');
	expect(s).toBe('{"place":{"name":"Somewhere","abbrev":"Where"}}');
      });
    });
    describe("elementList", function() {
      var fmt;
      it("construct", function() {
	fmt = new JSONFormat();
      });
      it("elementList", function() {
	expect(fmt.elementList('the-things', [ 'one', 'two', 'three' ])).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/\n\s*/g, '').replace(/ *: +/g, ':');
	expect(s).toBe('{"theThings":["one","two","three"]}');
      });
    });
    describe("elementListFull", function() {
      var fmt;
      it("construct", function() {
	fmt = new JSONFormat({ root: "element-list" });
      });
      it("elementListFull", function() {
	expect(fmt.elementListFull('the-things', [
          { 'the-name': 'one', x: 1 }, { 'the-name': 'two', x: 2 }, { 'the-name': 'three', x: 3 }
        ])).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/\n\s*/g, '');
	expect(s).toBe('{"theThings": [' +
                       '{"theName": "one","x": 1},' +
                       '{"theName": "two","x": 2},' +
                       '{"theName": "three","x": 3}' +
                      ']}');
      });
    });
    describe("elementListFull extra", function() {
      var fmt;
      it("construct", function() {
	fmt = new JSONFormat({ root: "element-list" });
      });
      it("elementListFull", function() {
	expect(fmt.elementListFull('the-things', [
          { 'the-name': 'one', x: 1 }, { 'the-name': 'two', x: 2 }, { 'the-name': 'three', x: 3 }
        ], { 'thing-count': 3 })).toBe(true);
      });
      it("close", function() {
	fmt.close();
      });
      it("toString", function() {
	var s = fmt.toString().replace(/\n\s*/g, '');
	expect(s).toBe('{' +
                       '"theThings": [' +
                       '{"theName": "one","x": 1},' +
                       '{"theName": "two","x": 2},' +
                       '{"theName": "three","x": 3}' +
                       '],' +
                       '"thingCount": 3' +
                       '}');
      });
    });
    describe("lengthList", function() {
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
  });
});
