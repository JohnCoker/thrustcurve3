"use strict";

const metadata = require('..');

describe("metadata", function() {

  describe("burnTimeGroups", function() {
    it("defined", function() {
      var g = metadata.burnTimeGroups;
      expect(g).toBeDefined();
      expect(Array.isArray(g)).toBe(true);
      expect(g.length).toBeGreaterThan(6);
    });
  });

  describe("burnTimeGroup", function() {
    it("invalid", function() {
      expect(metadata.burnTimeGroup()).toBeUndefined();
      expect(metadata.burnTimeGroup(null)).toBeUndefined();
      expect(metadata.burnTimeGroup(0/0)).toBeUndefined();
      expect(metadata.burnTimeGroup(0)).toBeUndefined();
    });
    it("1/4", function() {
      var g = metadata.burnTimeGroup(0.25);
      expect(g).toBeDefined();
      expect(g.nominal).toBe(0.25);
      expect(g.label).toBe('¼\u00A0s');
      expect(metadata.burnTimeGroup(0.1).nominal).toBe(0.25);
      expect(metadata.burnTimeGroup(0.29).nominal).toBe(0.25);
    });
    it("1/2", function() {
      var g = metadata.burnTimeGroup(0.5);
      expect(g).toBeDefined();
      expect(g.nominal).toBe(0.5);
      expect(g.label).toBe('½\u00A0s');
      expect(metadata.burnTimeGroup(0.4).nominal).toBe(0.5);
      expect(metadata.burnTimeGroup(0.59).nominal).toBe(0.5);
    });
    it("3/4", function() {
      var g = metadata.burnTimeGroup(0.75);
      expect(g).toBeDefined();
      expect(g.nominal).toBe(0.75);
      expect(g.label).toBe('¾\u00A0s');
      expect(metadata.burnTimeGroup(0.71).nominal).toBe(0.75);
      expect(metadata.burnTimeGroup(0.79).nominal).toBe(0.75);
    });
    it("1", function() {
      var g = metadata.burnTimeGroup(1.0);
      expect(g).toBeDefined();
      expect(g.nominal).toBe(1.0);
      expect(g.label).toBe('1\u00A0s');
      expect(metadata.burnTimeGroup(0.89).nominal).toBe(1.0);
      expect(metadata.burnTimeGroup(1.4).nominal).toBe(1.0);
    });
    it("3", function() {
      var g = metadata.burnTimeGroup(3.0);
      expect(g).toBeDefined();
      expect(g.nominal).toBe(3.0);
      expect(g.label).toBe('3\u00A0s');
      expect(metadata.burnTimeGroup(2.8).nominal).toBe(3.0);
      expect(metadata.burnTimeGroup(3.2).nominal).toBe(3.0);
    });
    it("7", function() {
      var g = metadata.burnTimeGroup(7.0);
      expect(g).toBeDefined();
      expect(g.nominal).toBe(7.0);
      expect(g.label).toBe('7\u00A0s+');
      expect(metadata.burnTimeGroup(6.9).nominal).toBe(7.0);
      expect(metadata.burnTimeGroup(7.1).nominal).toBe(7.0);
    });
    it("20", function() {
      var g = metadata.burnTimeGroup(20.0);
      expect(g).toBeDefined();
      expect(g.nominal).toBe(7.0);
      expect(g.label).toBe('7\u00A0s+');
    });
  });

  describe("toDesignation", function() {
    it("missing", function() {
      expect(metadata.toDesignation()).toBeUndefined();
    });
    it("empty", function() {
      expect(metadata.toDesignation('')).toBeUndefined();
    });
    it("C6", function() {
      expect(metadata.toDesignation('C6')).toBe('C6');
    });
    it("a3", function() {
      expect(metadata.toDesignation('a3')).toBe('A3');
    });
    it("micro maxx ii", function() {
      expect(metadata.toDesignation('micro maxx ii')).toBe('MICRO_MAXX_II');
    });
  });
  describe("toCommonName", function() {
    it("missing", function() {
      expect(metadata.toCommonName()).toBeUndefined();
    });
    it("empty", function() {
      expect(metadata.toCommonName('')).toBeUndefined();
    });
    it("C6", function() {
      expect(metadata.toCommonName('C6')).toBe('C6');
    });
    it("g80w", function() {
      expect(metadata.toCommonName('g80w')).toBe('G80');
    });
    it("41F36-11A", function() {
      expect(metadata.toCommonName('41F36-11A')).toBe('F36');
    });
    it("41-F36-11A", function() {
      expect(metadata.toCommonName('41-F36-11A')).toBe('F36');
    });
  });
  describe("isCommonName", function() {
    it("missing", function() {
      expect(metadata.isCommonName()).toBe(false);
    });
    it("empty", function() {
      expect(metadata.isCommonName('')).toBe(false);
    });
    it("C6", function() {
      expect(metadata.isCommonName('C6')).toBe(true);
    });
    it("g80w", function() {
      expect(metadata.isCommonName('g80w')).toBe(false);
    });
    it("g80", function() {
      expect(metadata.isCommonName('g80')).toBe(false);
    });
    it("G80", function() {
      expect(metadata.isCommonName('G80')).toBe(true);
    });
    it("41F36-11A", function() {
      expect(metadata.isCommonName('41F36-11A')).toBe(false);
    });
  });
  describe("toImpulseClass", function() {
    it("missing", function() {
      expect(metadata.toImpulseClass()).toBeUndefined();
    });
    it("empty", function() {
      expect(metadata.toImpulseClass('')).toBeUndefined();
    });
    it("C", function() {
      expect(metadata.toImpulseClass('C')).toBe('C');
    });
    it("1/2A", function() {
      expect(metadata.toImpulseClass('1/2A')).toBe('A');
    });
    it("k", function() {
      expect(metadata.toImpulseClass('k')).toBe('K');
    });
    it("Ω", function() {
      expect(metadata.toImpulseClass('Ω')).toBeUndefined();
    });
  });
  describe("isImpulseClass", function() {
    it("missing", function() {
      expect(metadata.isImpulseClass()).toBe(false);
    });
    it("empty", function() {
      expect(metadata.isImpulseClass('')).toBe(false);
    });
    it("C", function() {
      expect(metadata.isImpulseClass('C')).toBe(true);
    });
    it("1/2A", function() {
      expect(metadata.isImpulseClass('1/2A')).toBe(false);
    });
    it("k", function() {
      expect(metadata.isImpulseClass('k')).toBe(false);
    });
    it("Ω", function() {
      expect(metadata.isImpulseClass('Ω')).toBe(false);
    });
  });

  describe("Categories", function() {
    var c = metadata.Categories;
    it ("is array", function() {
      expect(c).toBeDefined();
      expect(Array.isArray(c)).toBe(true);
      expect(c.length).toBeGreaterThan(3);
    });
    it ("has labels", function() {
      var i;
      for (i = 0; i < c.length; i++)
	expect(typeof c[i].label).toBe('string');
    });
    it ("has values", function() {
      var i;
      for (i = 0; i < c.length; i++)
	expect(typeof c[i].value).toBe('string');
    });
    it ("has regex", function() {
      var i;
      for (i = 0; i < c.length; i++) {
	expect(typeof c[i].regex).toBe('object');
	expect(c[i].regex instanceof RegExp).toBe(true);
      }
    });
  });
  describe("toCategory", function() {
    it("missing", function() {
      expect(metadata.toCategory()).toBeUndefined();
    });
    it("empty", function() {
      expect(metadata.toCategory('')).toBeUndefined();
    });
    it("A", function() {
      var c = metadata.toCategory('A');
      expect(c).toBeDefined();
      expect(c.value).toBe('lpr');
    });
    it("M", function() {
      var c = metadata.toCategory('M');
      expect(c).toBeDefined();
      expect(c.value).toBe('hpr');
    });
    it("M, specific", function() {
      var c = metadata.toCategory('M', true);
      expect(c).toBeDefined();
      expect(c.value).toBe('l3');
    });
    it("Z", function() {
      expect(metadata.toCategory('Z')).toBeUndefined();
    });
  });

  describe("sample", function() {
    let cache;
    it("get", function() {
      cache = metadata.sample();
      expect(cache).toBeDefined();
    });
    it("manufacturers", function() {
      expect(cache.manufacturers.length).toBe(3);
      let e = cache.manufacturers.byName('Estes');
      expect(e).toBeDefined();
      expect(e._id).toBe('mfr000000000000000000002');
      expect(e.name).toBe('Estes Industries');
      expect(e.abbrev).toBe('Estes');
    });
    it("certOrgs", function() {
      expect(cache.certOrgs.length).toBe(2);
      let e = cache.certOrgs.byName('NAR');
      expect(e._id).toBe('org000000000000000000001');
      expect(e).toBeDefined();
      expect(e.name).toBe('National Association of Rocketry');
      expect(e.abbrev).toBe('NAR');
    });
    it("allMotors", function() {
      let all = cache.allMotors;
      expect(all).toBeDefined();
      expect(all.manufacturers.length).toBe(3);
      expect(all.certOrgs.length).toBe(2);
      expect(all.types).toEqual(["SU", "reload"]);
      expect(all.diameters.length).toBe(9);
      expect(all.impulseClasses.length).toBe(14);
    });
    it("availableMotors", function() {
      let avail = cache.availableMotors;
      expect(avail).toBeDefined();
      expect(avail.manufacturers.length).toBe(2);
      expect(avail.certOrgs.length).toBe(2);
      expect(avail.types).toEqual(["SU", "reload"]);
      expect(avail.diameters.length).toBe(9);
      expect(avail.impulseClasses.length).toBe(14);
    });
    it("missing name", function() {
      expect(cache.manufacturers.byName(null)).toBeUndefined();
      expect(cache.manufacturers.byName("No Such Co")).toBeUndefined();
      expect(cache.manufacturers.byName("No Such Co", true).name).toBe("Unknown");
      expect(cache.certOrgs.byName(null)).toBeUndefined();
      expect(cache.certOrgs.byName("No Such Org")).toBeUndefined();
      expect(cache.certOrgs.byName("No Such Org", true).name).toBe("Unknown");
    });
    it("diametersMM", function() {
      let all = cache.allMotors;
      expect(all.diametersMM().length).toBe(9);
      expect(all.diametersMM()[0]).toBe('13');
    });
  });
});
