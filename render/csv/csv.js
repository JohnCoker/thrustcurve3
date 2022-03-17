/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const units = require('../../lib/units'),
      number = require('../../lib/number');

const CSV = 'text/csv';

class File {
  constructor() {
    this._data = "";
    this._col = 0;
  }

  get mimeType() {
    return CSV;
  }

  row(cols) {
    var i;
    if (cols && cols.length > 0) {
      if (this._col > 0) {
	this._data += '\r\n';
	this._col = 0;
      }
      for (i = 0; i < cols.length; i++)
	this.col(cols[i]);
    }
    this._data += "\r\n";
    this._col = 0;
  }

  col(text) {
    if (this._col > 0)
      this._data += ',';

    if (text == null)
      text = '';
    else if (typeof text != 'string')
      text = String(text).valueOf();
    if (text !== '') {
      if (/[,"\s]/.test(text)) {
	this._data += '"';
	this._data += text.replace(/"/, '""');
	this._data += '"';
      } else {
	this._data += text;
      }
    }

    this._col++;
  }

  colLabel(text, unit) {
    if (unit != null) {
      if (unit == 'mmt')
        text += ' (mm)';
      else if (unit == 'duration')
        text += ' (s)';
      else
        text += ' (' + units.getUnitPref(unit).label + ')';
    }
    this.col(text);
  }

  colNumber(num, prec) {
    if (typeof num != 'number' || !isFinite(num))
      this.col('');
    else
      this.col(number.toFixed(num, prec));
  }

  colUnit(num, unit) {
    if (typeof num != 'number' || !isFinite(num))
      this.col('');
    else if (unit === 'mmt')
      this.colNumber(units.convertMMTFromMKS(num), -1);
    else if (unit === 'duration')
      this.colNumber(num, 1);
    else {
      unit = units.getUnitPref(unit);
      this.colNumber(unit.fromMKS(num), unit.digits);
    }
  }

  emptyCols(n) {
    while (n-- > 0)
      this.col('');
  }

  produce() {
    if (this._col > 0) {
      this._data += '\r\n';
      this._col = 0;
    }
    return this._data;
  }
}

/**
 * The <b>csv</b> module builds "comma-separated values" files.
 *
 * @module csv
 */
module.exports = {
  /**
   * The MIME type for CSV files.
   * @member {string}
   */
  CSV: CSV,

  /**
   * Class that provides the methods to build up a file by writing columns and rows.
   * @member {function} constructor
   */
  File: File,
};
