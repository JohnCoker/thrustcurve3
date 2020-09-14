"use strict";

const number = require("../number");

describe("number", function() {
  it("isInt", function() {
    expect(number.isInt("")).toBe(false);
    expect(number.isInt("0")).toBe(true);
    expect(number.isInt("1000")).toBe(true);
    expect(number.isInt("-1")).toBe(true);
    expect(number.isInt("01")).toBe(true);
    expect(number.isInt("01.")).toBe(false);
    expect(number.isInt("1.")).toBe(false);
    expect(number.isInt("1.01")).toBe(false);
    expect(number.isInt("010")).toBe(true);
  });
  it("isNonNegInt", function() {
    expect(number.isNonNegInt("")).toBe(false);
    expect(number.isNonNegInt("0")).toBe(true);
    expect(number.isNonNegInt("1000")).toBe(true);
    expect(number.isNonNegInt("-1")).toBe(false);
    expect(number.isNonNegInt("01")).toBe(true);
    expect(number.isNonNegInt("01.")).toBe(false);
    expect(number.isNonNegInt("1.")).toBe(false);
    expect(number.isNonNegInt("1.01")).toBe(false);
    expect(number.isNonNegInt("010")).toBe(true);
  });
  it("isPosInt", function() {
    expect(number.isPosInt("")).toBe(false);
    expect(number.isPosInt("0")).toBe(false);
    expect(number.isPosInt("1000")).toBe(true);
    expect(number.isPosInt("-1")).toBe(false);
    expect(number.isPosInt("01")).toBe(true);
    expect(number.isPosInt("01.")).toBe(false);
    expect(number.isPosInt("1.")).toBe(false);
    expect(number.isPosInt("1.01")).toBe(false);
    expect(number.isPosInt("010")).toBe(true);
  });
  it("isNumber", function() {
    expect(number.isNumber("")).toBe(false);
    expect(number.isNumber("0")).toBe(true);
    expect(number.isNumber("1000")).toBe(true);
    expect(number.isNumber("-1")).toBe(true);
    expect(number.isNumber("01")).toBe(true);
    expect(number.isNumber("01.")).toBe(true);
    expect(number.isNumber("1.")).toBe(true);
    expect(number.isNumber("1.01")).toBe(true);
    expect(number.isNumber(".0")).toBe(true);
    expect(number.isNumber(".01")).toBe(true);
    expect(number.isNumber(".")).toBe(false);
    expect(number.isNumber("064.9091")).toBe(true);
  });
  it("parseNumber", function() {
    expect(number.parseNumber("")).toBeNaN();
    expect(number.parseNumber("0")).toBe(0);
    expect(number.parseNumber("1000")).toBe(1000);
    expect(number.parseNumber("-1")).toBe(-1);
    expect(number.parseNumber("01")).toBe(1);
    expect(number.parseNumber("01.")).toBe(1.0);
    expect(number.parseNumber("1.")).toBe(1.0);
    expect(number.parseNumber("1.01")).toBe(1.01);
    expect(number.parseNumber(".0")).toBe(0);
    expect(number.parseNumber(".01")).toBe(0.01);
    expect(number.parseNumber(".")).toBeNaN();
    expect(number.parseNumber("064.9091")).toBe(64.9091);
    expect(number.parseNumber(64.9091)).toBe(64.9091);
  });
});
