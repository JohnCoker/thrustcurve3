"use strict";

const spreadsheet = require('..');

describe("spreadsheet", function() {
  describe("Worksheet", function() {
    var sheet;
    it("is defined", function() {
      expect(typeof spreadsheet.Worksheet).toBe('function');
    });
    it("new", function() {
      sheet = new spreadsheet.Worksheet('sheet1');
      expect(typeof sheet).toBe('object');
      expect(sheet.name).toBe('sheet1');
    });
    it("setLabel", function() {
      sheet.setLabel(0, 0, 'Value');
      sheet.setLabel(0, 1, 'Value', 'mmt');
      sheet.setLabel(0, 2, 'Value', 'duration');
      sheet.setLabel(0, 3, 'Value', 'length');
      sheet.setLabel(0, 4, 'Value', 'mass');
    });
    it("setLabel", function() {
      sheet.setString(1, 0, 'String');
    });
    it("setNumber", function() {
      sheet.setNumber(2, 0, 0);
      sheet.setNumber(2, 1, 0/0);
      sheet.setNumber(2, 2, 1);
      sheet.setNumber(2, 3, 1.23456);
    });
    it("setUnit", function() {
      sheet.setUnit(3, 0, 0, 'length');
      sheet.setUnit(3, 1, 0/0, 'length');
      sheet.setUnit(3, 2, 1, 'length');
      sheet.setUnit(3, 3, 1.23456, 'length');
      sheet.setUnit(3, 4, 0.098, 'mmt');
      sheet.setUnit(3, 5, 7.567, 'duration');
    });
    it("setDate", function() {
      sheet.setDate(4, 0, new Date());
      sheet.setDate(4, 1, undefined);
    });
  });

  describe("Workbook", function() {
    var book;
    it("is defined", function() {
      expect(typeof spreadsheet.Workbook).toBe('function');
    });
    it("new, empty", function() {
      book = new spreadsheet.Workbook();
      expect(typeof book).toBe('object');
      expect(book.sheets).toEqual([]);
      expect(book.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
    it("new, options", function() {
      var sheet = new spreadsheet.Worksheet('sheet1');
      book = new spreadsheet.Workbook({
        sheets: [sheet]
      });
      expect(typeof book).toBe('object');
      expect(book.sheets).toEqual([sheet]);
      expect(book.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });
});
