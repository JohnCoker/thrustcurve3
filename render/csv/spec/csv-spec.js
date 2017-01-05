"use strict";

const csv = require('..');

describe("csv", function() {
  describe("empty", function() {
    var file;
    it("create", function() {
      file = new csv.File();
    });
    it("produce", function() {
      expect(file.produce()).toBe('');
    });
  });
  describe("header labels", function() {
    var file;
    it("create", function() {
      file = new csv.File();
      file.colLabel("Name");
      file.colLabel("MMT", 'mmt');
      file.colLabel("Time", 'duration');
      file.colLabel("Speed", 'velocity');
    });
    it("produce", function() {
      expect(file.produce()).toBe('Name,"MMT (mm)","Time (s)","Speed (m/s)"\r\n');
    });
  });
  describe("row-wise", function() {
    var file;
    it("create", function() {
      file = new csv.File();
      file.row(["Name", "Age"]);
      file.row(["Sam", 27]);
      file.row(["Nell", 28]);
    });
    it("produce", function() {
      expect(file.produce()).toBe('Name,Age\r\nSam,27\r\nNell,28\r\n');
    });
  });
  describe("column-wise", function() {
    var file;
    it("create", function() {
      file = new csv.File();
      file.col("Name");
      file.col("Age");
      file.row();

      file.col("Sam");
      file.col(27);
      file.row();

      file.col("Nell");
      file.col(28);
      file.row();
    });
    it("produce", function() {
      expect(file.produce()).toBe('Name,Age\r\nSam,27\r\nNell,28\r\n');
    });
  });
  describe("numbers and units", function() {
    var file;
    it("create", function() {
      file = new csv.File();
      file.row(["Name", "Age", "Speed"]);

      file.col("Sam");
      file.colNumber(27);
      file.colUnit(4, 'velocity');
      file.row();

      file.col("Nell");
      file.colNumber(28);
      file.colUnit(3.7654321, 'velocity');
      file.row();
    });
    it("produce", function() {
      expect(file.produce()).toBe('Name,Age,Speed\r\nSam,27,4.0\r\nNell,28,3.8\r\n');
    });
  });
});
