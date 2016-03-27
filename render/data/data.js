/*
 * Copyright 2016 John Coker for ThrustCurve.org
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

  elementList(listName, values) {
  }

  lengthList(listName, values) {
    if (values == null || values.length < 1)
      return false;

    return this.elementList(listName, _.map(values, function(v) {
      // convert to millimeters and round
      var s = (v * 1000).toFixed(1);
      return s.replace(/\.0$/, '');
    }));
  }

  close() {
  }

  toString() {
  }

  send(res) {
    res.type(this.type()).send(this.toString());
  }

  static singular(listName) {
    if (/ses$/.test(listName))
      return listName.substring(0, listName.length - 2);
    else if (/ies$/.test(listName))
      return listName.substring(0, listName.length - 3) + 'y';
    else
      return listName.replace(/s$/, '');
  }
}

class XMLFormat extends Format {
  constructor(root) {
    super();
    this._w = new XMLWriter(true);
    this._w.startDocument('1.0', 'UTF-8');
    if (root)
      this.root(root);
  }

  root(name) {
    if (this._root)
      throw new Error('XML document already has a root (' + this._root + ').');

    this._root = name;
    this._w.startElement(name);
    this._open = true;
  }

  type() {
    return 'text/xml';
  }

  element(name, value) {
    var keys, k, i;

    if (value == null)
      return false;

    this._w.startElement(name);

    if (typeof value == 'object') {
      keys = Object.keys(value);
      for (i = 1; i < keys.length; i++) {
	k = keys[i];
	this._w.writeAttribute(k, value[k]);
      }
      k = keys[0];
      this._w.text(value[k]);
    } else {
      this._w.text(value);
    }

    this._w.endElement(name);
    return true;
  }

  elementList(listName, values) {
    var eltName, i;

    if (values == null || values.length < 1)
      return false;

    this._w.startElement(listName);

    eltName = Format.singular(listName);
    for (i = 0; i < values.length; i++)
      this.element(eltName, values[i]);

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
}

class JSONFormat extends Format {
  constructor(root) {
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

  elementList(listName, values) {
    if (values == null || values.length < 1)
      return false;

    this._obj[JSONFormat.camelCase(listName)] = _.map(values, JSONFormat.value);
    return true;
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

    // use available value types
    if (typeof value == 'string') {
      if (/^[0-9]+(\.[0-9]+)?$/.test(value))
	return parseFloat(value);
      if (value == 'true')
	return true;
      if (value == 'false')
	return false;
    }

    // format dates as ISO 8869
    if (value instanceof Date)
      return value.toISOString();

    // NaN and Inf not valid in JSON
    if (typeof value == 'number' && (isNaN(value) || value.isInfinite()))
      return null;

    // recures into arrays and objects
    if (Array.isArray(value))
      return _.map(value, JSONFormat.value);
    else if (typeof value == 'object')
      return _.mapObject(value, JSONFormat.value);

    return value;
  }
}

/**
 * <p>The data module is used to build data responses in XML or JSON for the API.</p>
 *
 * <p>The basic model is:</p>
 * <ol>
 * <li>create with root element, or call root() after creation</li>
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

