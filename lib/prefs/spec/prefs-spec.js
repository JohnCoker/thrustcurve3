var prefs = require("..");

describe('prefs', function() {
  beforeEach(function() {
    prefs.clear();
  });

  describe("empty", function() {
    it("get", function() {
      expect(prefs.get("foo")).toBeUndefined();
      expect(prefs.get("")).toBeUndefined();
      expect(prefs.get(14)).toBeUndefined();
      expect(prefs.get(null)).toBeUndefined();
    });
    it("all", function() {
      var d = prefs.all();
      expect(typeof d).toBe('object');
      expect(Object.keys(d).length).toBe(0);
    });
  });

  describe("set", function() {
    beforeEach(function() {
      prefs.clear();
      prefs.set("foo", 44);
      prefs.set("bar", "eighty-eight");
    });
    it("get", function() {
      expect(prefs.get("foo")).toBe(44);
      expect(prefs.get("bar")).toBe("eighty-eight");
      expect(prefs.get("")).toBeUndefined();
      expect(prefs.get(14)).toBeUndefined();
      expect(prefs.get(null)).toBeUndefined();
    });
    it("all", function() {
      var d = prefs.all();
      expect(typeof d).toBe('object');
      expect(Object.keys(d).length).toBe(2);
      expect(Object.keys(d).indexOf('foo')).toBeGreaterThan(-1);
      expect(Object.keys(d).indexOf('bar')).toBeGreaterThan(-1);
    });
  });

  describe("clear", function() {
    beforeEach(function() {
      prefs.clear();
      prefs.set("foo", 44);
      prefs.set("bar", "eighty-eight");
      prefs.clear();
    });
    it("all", function() {
      var d = prefs.all();
      expect(typeof d).toBe('object');
      expect(Object.keys(d).length).toBe(0);
    });
  });
});

