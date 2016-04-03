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
      expect(g.label).toBe('¼s');
      expect(metadata.burnTimeGroup(0.1).nominal).toBe(0.25);
      expect(metadata.burnTimeGroup(0.29).nominal).toBe(0.25);
    });
    it("1/2", function() {
      var g = metadata.burnTimeGroup(0.5);
      expect(g).toBeDefined();
      expect(g.nominal).toBe(0.5);
      expect(g.label).toBe('½s');
      expect(metadata.burnTimeGroup(0.4).nominal).toBe(0.5);
      expect(metadata.burnTimeGroup(0.59).nominal).toBe(0.5);
    });
    it("3/4", function() {
      var g = metadata.burnTimeGroup(0.75);
      expect(g).toBeDefined();
      expect(g.nominal).toBe(0.75);
      expect(g.label).toBe('¾s');
      expect(metadata.burnTimeGroup(0.71).nominal).toBe(0.75);
      expect(metadata.burnTimeGroup(0.79).nominal).toBe(0.75);
    });
    it("1", function() {
      var g = metadata.burnTimeGroup(1.0);
      expect(g).toBeDefined();
      expect(g.nominal).toBe(1.0);
      expect(g.label).toBe('1s');
      expect(metadata.burnTimeGroup(0.89).nominal).toBe(1.0);
      expect(metadata.burnTimeGroup(1.4).nominal).toBe(1.0);
    });
    it("3", function() {
      var g = metadata.burnTimeGroup(3.0);
      expect(g).toBeDefined();
      expect(g.nominal).toBe(3.0);
      expect(g.label).toBe('3s');
      expect(metadata.burnTimeGroup(2.8).nominal).toBe(3.0);
      expect(metadata.burnTimeGroup(3.2).nominal).toBe(3.0);
    });
    it("7", function() {
      var g = metadata.burnTimeGroup(7.0);
      expect(g).toBeDefined();
      expect(g.nominal).toBe(7.0);
      expect(g.label).toBe('7s+');
      expect(metadata.burnTimeGroup(6.9).nominal).toBe(7.0);
      expect(metadata.burnTimeGroup(7.1).nominal).toBe(7.0);
    });
    it("20", function() {
      var g = metadata.burnTimeGroup(20.0);
      expect(g).toBeDefined();
      expect(g.nominal).toBe(7.0);
      expect(g.label).toBe('7s+');
    });
  });

  describe("toDesignation", function() {
    it("missing", function() {
      expect(metadata.toDesignation()).toBe(undefined);
    });
    it("empty", function() {
      expect(metadata.toDesignation('')).toBe(undefined);
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
      expect(metadata.toCommonName()).toBe(undefined);
    });
    it("empty", function() {
      expect(metadata.toCommonName('')).toBe(undefined);
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
  describe("toImpulseClass", function() {
    it("missing", function() {
      expect(metadata.toImpulseClass()).toBe(undefined);
    });
    it("empty", function() {
      expect(metadata.toImpulseClass('')).toBe(undefined);
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
  });
});
