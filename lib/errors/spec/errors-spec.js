var errors = require("../errors");

describe("errors", function() {
  describe("format", function() {
    it("code only", function() {
      expect(errors.format(errors.DATA_FILE_EMPTY)).toBe('error 102');
    });
    it("message", function() {
      expect(errors.format(errors.DATA_FILE_EMPTY, "no stuff")).toBe('no stuff');
    });
    it("message w/ param", function() {
      expect(errors.format(errors.DATA_FILE_FORMAT, "bad stuff in {1}", "foo.txt")).toBe('bad stuff in foo.txt');
    });
    it("message w/ params", function() {
      expect(errors.format(errors.DATA_FILE_FORMAT, "bad stuff in {1}, line {2}", "foo.txt", 17)).toBe('bad stuff in foo.txt, line 17');
    });
  });
  describe("print", function() {
    it("invalid code", function() {
      expect(function() {
        errors.print(errors.NOT_AN_ERROR);
      }).toThrowError('missing error code');
    });
    it("no message", function() {
      expect(function() {
        errors.print(errors.DATA_FILE_EMPTY);
      }).toThrowError('missing error message');
    });
    it("missing param index", function() {
      expect(function() {
        errors.print(errors.DATA_FILE_EMPTY, "empty file {}", "foo.txt");
      }).toThrowError('invalid message parameters: empty file {}');
    });
    it("invalid param index", function() {
      expect(function() {
        errors.print(errors.DATA_FILE_EMPTY, "empty file {0}", "foo.txt");
      }).toThrowError('invalid message parameters: empty file {0}');
      expect(function() {
        errors.print(errors.DATA_FILE_EMPTY, "empty file {x}", "foo.txt");
      }).toThrowError('invalid message parameters: empty file {x}');
      expect(function() {
        errors.print(errors.DATA_FILE_EMPTY, "empty file {1}, line {2}", "foo.txt");
      }).toThrowError('invalid message parameter: {2}');
    });
  });
  describe("Collector", function() {
    var c;
    it("construct", function() {
      expect(function() {
        c = errors.Collector();
      }).not.toThrow();
      expect(c).toBeDefined();
      expect(typeof c).toBe('function');
    });
    it("empty", function() {
      expect(c.hasErrors()).toBe(false);
      expect(c.errorCount()).toBe(0);
      expect(c.lastError()).toBeUndefined();
    });
    it("code only", function() {
      expect(function() {
        c(errors.DATA_FILE_EMPTY);
      }).not.toThrow();
      expect(c.hasErrors()).toBe(true);
      expect(c.errorCount()).toBe(1);
      expect(c.lastError().code).toBe(errors.DATA_FILE_EMPTY);
      expect(c.lastError().message).toBe('error 102');
    });
    it("message", function() {
      expect(function() {
        c(errors.DATA_FILE_EMPTY, "no stuff");
      }).not.toThrow();
      expect(c.errorCount()).toBe(2);
      expect(c.lastError().code).toBe(errors.DATA_FILE_EMPTY);
      expect(c.lastError().message).toBe('no stuff');
    });
    it("message w/ param", function() {
      expect(function() {
        c(errors.DATA_FILE_FORMAT, "bad stuff in {1}", "foo.txt");
      }).not.toThrow();
      expect(c.errorCount()).toBe(3);
      expect(c.lastError().code).toBe(errors.DATA_FILE_FORMAT);
      expect(c.lastError().message).toBe('bad stuff in foo.txt');
    });
    it("message w/ params", function() {
      expect(function() {
        c(errors.DATA_FILE_FORMAT, "bad stuff in {1}, line {2}", "foo.txt", 17);
      }).not.toThrow();
      expect(c.errorCount()).toBe(4);
      expect(c.lastError().code).toBe(errors.DATA_FILE_FORMAT);
      expect(c.lastError().message).toBe('bad stuff in foo.txt, line 17');
    });
    it("reset", function() {
      expect(function() {
        c.reset();
      }).not.toThrow();
      expect(c.hasErrors()).toBe(false);
      expect(c.errorCount()).toBe(0);
      expect(c.lastError()).toBeUndefined();
    });
  });
});
