/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const xlsx = require('xlsx'),
      units = require('../../lib/units');

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

class Worksheet {
  constructor(name) {
    this._name = name;
    this._range = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }};
    this._cells = {};
  }

  get name() {
    return this._name;
  }

  setCell(r, c, cell) {
    var ref;

    if (this._range.s.r > r)
      this._range.s.r = r;
    if (this._range.s.c > c)
      this._range.s.c = c;
    if (this._range.e.r < r)
      this._range.e.r = r;
    if (this._range.e.c < c)
      this._range.e.c = c;

    ref = xlsx.utils.encode_cell({ c: c, r: r });
    this._cells[ref] = cell;
  }

  setLabel(r, c, v, u) {
    if (u != null) {
      if (u == 'mmt')
        v += ' (mm)';
      else if (u == 'duration')
        v += ' (s)';
      else
        v += ' (' + units.getUnitPref(u).label + ')';
    }
    this.setString(r, c, v);
  }

  setString(r, c, v) {
    this.setCell(r, c, {
      t: 's',
      v: v
    });
  }

  setNumber(r, c, v) {
    if (typeof v != 'number' || isNaN(v))
      return;
    this.setCell(r, c, {
      t: 'n',
      v: v.toFixed(4)
    });
  }

  setUnit(r, c, v, u) {
    if (u == 'mmt') {
      this.setNumber(r, c, units.convertMMTFromMKS(v));
    } else if (u == 'duration') {
      this.setNumber(r, c, v);
    } else {
      this.setNumber(r, c, units.convertPrefFromMKS(v, u));
    }
  }

  setDate(r, c, v) {
    this.setCell(r, c, {
      t: 'd',
      v: v
    });
  }

  setColWidths() {
    var a, i;

    if (arguments.length === 1 && Array.isArray(arguments[0]))
      a = arguments[0];
    else
      a = arguments;

    this._widths = [];
    for (i = 0; i < a.length; i++)
      this._widths.push({ wch: a[i] });
  }

  produce() {
    this._cells['!ref'] = xlsx.utils.encode_range(this._range);
    if (this._widths)
      this._cells['!cols'] = this._widths;
    return this._cells;
  }
}

class Workbook {
  constructor(opts) {
    if (opts && Array.isArray(opts.sheets))
      this._sheets = opts.sheets.slice();
    else
      this._sheets = [];
  }

  get mimeType() {
    return XLSX;
  }

  addSheet(s) {
    this._sheets.push(s);
  }

  get sheets() {
    return this._sheets;
  }

  set sheets(s) {
    if (s && Array.isArray(s))
      this._sheets = s.slice();
    else
      this._sheets = [];
  }

  produce() {
    var wb, n, i;

    wb = {
      SheetNames: [],
      Sheets: {}
    };
    for (i = 0; i < this._sheets.length; i++) {
      n = this._sheets[i].name;
      wb.SheetNames[i] = n;
      wb.Sheets[n] = this._sheets[i].produce();
    }
    return xlsx.write(wb, {
      bookType: 'xlsx',
      bookSST: true,
      type: 'binary'
    });
  }
}

/**
 * The <b>spreadsheet</b> module builds spreadsheet files.
 *
 * @module spreadsheet
 */
module.exports = {
  /**
   * The list of supported spreadsheet formats.
   * @member {string[]}
   */
  AllFormats: [XLSX],

  /**
   * The MIME type for XLSX spreadsheets.
   * @member {string}
   */
  XLSX: XLSX,

  /**
   * Class that provides the methods to build up a single sheet.
   * @member {function} constructor
   */
  Worksheet: Worksheet,

  /**
   * Class that provides the methods to build up a file of sheets.
   * @member {function} constructor
   */
  Workbook: Workbook,
};
