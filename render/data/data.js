/*
 * Copyright 2016-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const _ = require('underscore'),
      XMLWriter = require('xml-writer');

class Format {

  type() {
  }

  root(name) {
  }

  element(name, value) {
  }

  elementListFull(listName, values, extra) {
  }

  lengthList(listName, values) {
    if (values == null || values.length < 1)
      return false;

    return this.elementList(listName, _.map(values, function(v) {
      // convert to millimeters and round
      if (typeof v === 'number' && isFinite(v))
        return Math.round(v * 10000) / 10;
    }));
  }

  error(errs) {
    if (errs == null || errs.errorCount() < 1)
      return false;

    let s = '';
    errs.errors.forEach(e => {
      if (s !== '')
        s += '\n';
      s += e.message;
    });
    this.element('error', s);

    return true;
  }

  close() {
  }

  toString() {
  }

  send(res, failed) {
    if (failed)
      res.status(400);
    res.type(this.type()).send(this.toString());
  }

  static singular(listName) {
    if (/ses$/.test(listName))
      return listName.substring(0, listName.length - 2);
    else if (/ria$/.test(listName))
      return listName.substring(0, listName.length - 3) + 'rion';
    else if (/ies$/.test(listName))
      return listName.substring(0, listName.length - 3) + 'y';
    else
      return listName.replace(/s$/, '');
  }
}

class XMLFormat extends Format {
  constructor(options) {
    super();
    this._w = new XMLWriter(true);
    this._w.startDocument('1.0', 'UTF-8');
    if (options && options.root)
      this.root(options.root);
  }

  root(name, schema) {
    if (this._root)
      throw new Error('XML document already has a root (' + this._root + ').');

    this._root = name;
    this._w.startElement(name);
    this._open = true;
    if (schema) {
      this._w.writeAttribute("xmlns", "http://www.thrustcurve.org/" + schema);
      this._w.writeAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
      let m = /^(\d+)\/([a-z]+)Response$/i.exec(schema);
      if (m != null) {
        let file = m[1] + "/" + m[2].toLowerCase() + "-response.xsd";
        this._w.writeAttribute("xsi:schemaLocation", "http://www.thrustcurve.org/" + schema +
                               " http://www.thrustcurve.org/" + file);
      }
    }
  }

  type() {
    return 'text/xml';
  }

  element(name, value) {
    if (value == null)
      return false;

    this._w.startElement(name);

    if (typeof value == 'object') {
      let keys = Object.keys(value);
      for (let i = 1; i < keys.length; i++) {
	let k = keys[i];
        let v = XMLFormat.value(value[k]);
        if (v == null || v === '')
          continue;
	this._w.writeAttribute(k, v);
      }
      let k0 = keys[0];
      this._w.text(XMLFormat.value(value[k0]));
    } else {
      let v = XMLFormat.value(value);
      if (v != null)
        this._w.text(v);
    }

    this._w.endElement(name);
    return true;
  }

  elementFull(name, value) {
    if (value == null)
      return false;

    this._w.startElement(name);

    this._children(value, true);

    this._w.endElement(name);
    return true;
  }

  elementList(listName, values, force) {
    if (force) {
      if (values == null)
        values = [];
    } else if (values == null || values.length < 1)
      return false;

    this._w.startElement(listName);

    let eltName = Format.singular(listName);
    for (let i = 0; i < values.length; i++)
      this.element(eltName, values[i]);

    this._w.endElement(listName);
    return true;
  }

  elementListFull(listName, values, extra) {
    let eltName;
    if (arguments.length > 2 && typeof arguments[1] == 'string') {
      eltName = arguments[1];
      values = arguments[2];
      extra = arguments[3];
    } else
      eltName = Format.singular(listName);
    if (values == null || values.length < 1)
      values = [];

    this._w.startElement(listName);

    for (let i = 0; i < values.length; i++)
      this.elementFull(eltName, values[i]);

    if (extra != null)
      this._children(extra);

    this._w.endElement(listName);
    return true;
  }

  close() {
    if (this._open) {
      this._w.endDocument();
      this._open = false;
    }
  }

  toString() {
    this.close();
    return this._w.toString();
  }

  _children(value, full) {
    if (typeof value == 'object') {
      let keys = Object.keys(value);
      for (let i = 0; i < keys.length; i++) {
	let k = keys[i];
        let v;
        if (Array.isArray(value[k])) {
          v = value[k];
          if (v.length < 1 && !full)
            continue;
        } else {
          if (full && typeof value[k] === 'string') {
            v = value[k];
          } else {
            v = XMLFormat.value(value[k]);
            if (v == null || v === '')
              continue;
          }
        }
        this._w.startElement(k);
        if (Array.isArray(v)) {
          let innerName = XMLFormat.singular(k);
          v.forEach(e => {
            this._w.startElement(innerName);
            this._children(e, full);
            this._w.endElement(innerName);
          });
        } else {
	  this._w.text(v);
        }
        this._w.endElement(k);
      }
    } else {
      let v = XMLFormat.value(value);
      if (v != null)
        this._w.text(v);
    }
  }

  static value(value) {
    // undefined not valid in XML
    if (value == null)
      return null;

    // format date only
    if (value instanceof Date)
      return value.toISOString().replace(/T.*$/, '');

    // NaN and Inf not valid in XML
    if (typeof value === 'number' && !isFinite(value))
      return null;

    // recurse into arrays and objects
    if (Array.isArray(value))
      return _.map(value, XMLFormat.value);
    else if (typeof value === 'object')
      return _.mapObject(value, XMLFormat.value);

    return String(value);
  }
}

class JSONFormat extends Format {
  constructor(options) {
    super();
    this._obj = {};
  }

  type() {
    return 'application/json';
  }

  element(name, value) {
    if (value == null)
      return false;

    this._obj[JSONFormat.camelCase(name)] = JSONFormat.value(value);
    return true;
  }

  elementFull(name, value) {
    return this.element(name, value);
  }

  elementList(listName, values, force) {
    if (force) {
      if (values == null)
        values = [];
    } else if (values == null || values.length < 1)
      return false;

    this._obj[JSONFormat.camelCase(listName)] = _.map(values, JSONFormat.value);
    return true;
  }

  elementListFull(listName, values, extra) {
    if (arguments.length > 2 && typeof arguments[1] == 'string') {
      // child element name not needed
      values = arguments[2];
      extra = arguments[3];
    }

    if (values == null || values.length < 1)
      values = [];

    let r = this.elementList(listName, values, true);
    if (extra != null) {
      let top = this._obj;
      Object.keys(extra).forEach(k => {
        let v = JSONFormat.value(extra[k]);
        if (v != null)
          top[JSONFormat.camelCase(k)] = v;
      });
    }
    return r;
  }

  toString() {
    return JSON.stringify(this._obj, undefined, 2);
  }

  static camelCase(name) {
    return name.replace(/-([a-z])/g, function(m, p1) {
      return p1.toUpperCase();
    });
  }

  static value(value) {
    // undefined not valid in JSON
    if (value == null)
      return null;

    // format date only
    if (value instanceof Date)
      return value.toISOString().replace(/T.*$/, '');

    // NaN and Inf not valid in JSON
    if (typeof value === 'number' && !isFinite(value))
      return null;

    // recurse into arrays and objects
    if (Array.isArray(value))
      return _.map(value, JSONFormat.value);
    else if (typeof value === 'object') {
      let mapped = {};
      Object.keys(value).forEach(k => {
        let v = JSONFormat.value(value[k]);
        if (v == null || v === '')
          return;
        mapped[JSONFormat.camelCase(k)] = v;
      });

      return mapped;
    }

    return value;
  }
}

/**
 * <p>The data module is used to build data responses in XML or JSON for the API.</p>
 *
 * <p>The basic model is:</p>
 * <ol>
 * <li>create with root element on options, or call root() after creation</li>
 * <li>add single elements or list of elements</li>
 * <li>close</li>
 * <li>use toString or send</li>
 * </ol>
 *
 * <p>Element names should be XML style (using lower-case and hyphens),
 * which will be converted to camelCase identifiers for JSON.</p>
 *
 * <pre>
 * elementList('the-things', ['one', 'two', 'three'])
 * </pre>
 *
 * <pre>
 * &lt;the-things&gt;
 *   &lt;the-thing&gt;one&lt;/the-thing&gt;
 *   &lt;the-thing&gt;two&lt;/the-thing&gt;
 *   &lt;the-thing&gt;three&lt;/the-thing&gt;
 * &lt;/the-things&gt;
 * </pre>
 *
 * <pre>
 * "theThings": [
 *   "one",
 *   "two",
 *   "three
 * ]
 * </pre>
 *
 * <p>The constructor takes an options object, which for XML can include the root element name.
 * This value is ignored for JSON.</p>
 *
 * <pre>
 * var format = new XMLFormat({ root: 'metadata-response' });
 * </pre>
 *
 * @module data
 */
module.exports = {
  /**
   * A data formatter for XML.
   */
  XMLFormat: XMLFormat,

  /**
   * A data formatter for JSON.
   */
  JSONFormat: JSONFormat,
};

