/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const errors = require('../../lib/errors'),
      rasp = require('./rasp.js'),
      rocksim = require('./rocksim.js');

const AllFormats = [ rasp, rocksim ];

function formatInfo(format) {
  var i;

  if (format == null || format === '')
    return;

  format = format.toLowerCase();
  for (i = 0; i < AllFormats.length; i++) {
    if (AllFormats[i].format.toLowerCase() == format || AllFormats[i].extension.substring(1) == format)
      return AllFormats[i];
  }
}

function guessFormat(data) {
  var s, line;

  if (typeof data != 'string' || data === '')
    return;
  s = data.toLowerCase().trim();

  // look for stats line of RASP files
  line = s;
  if (/^;/.test(line))
    line = s.replace(/\s*;[^\r\n]*\r?\n/g, '').trim();
  line = line.split('\n')[0].trim();
  if (/^1\/[248]A(0\.)[1-9]|[A-Z][1-9]/i.test(line) && line.split(' ').length == 7)
    return rasp.format;

  // look for engine element of RockSim files
  if (s.indexOf('<engine') >= 0)
    return rocksim.format;
}

function parseData(format, data, error) {
  if (format == null || typeof format != 'string' || format === '') {
    error(errors.DATA_FILE_FORMAT, 'missing data file format to parse');
    return;
  }
  if (data == null || typeof data != 'string' || data === '') {
    error(errors.DATA_FILE_EMPTY, 'missing data file data to parse');
    return;
  }
  if (format.toLowerCase() == 'rasp')
    return rasp.parse(data, error);
  else if (format.toLowerCase() == 'rocksim')
    return rocksim.parse(data, error);
  else {
    error(errors.DATA_FILE_FORMAT, 'unknown data file format "{1}" to parse', format);
    return;
  }
}

/**
 * The <b>parsers</b> module contains code to parse simulator data files in various formats.
 * Not only do simulator data files such as RASP and RockSim contain thrust curve data
 * points, they also contain meta information.</p>
 *
 * <p>The parsers return an object with three immediate children:</p>
 * <ul>
 * <li>format: the file format</li>
 * <li>info: metadata from the file</li>
 * <li>points: time/thrust data points</li>
 * </ul>
 *
 * <p>The <em>info</em> object contains standard information specified by the file.
 * Not all formats provide all these values, but where valid values are specified,
 * they are included (converted to MKS units).
 * The possible values are:</p>
 * <ul>
 * <li>name: common name or manufacturer designation</li>
 * <li>manufacturer: motor manufacturer</li>
 * <li>type: motor type</li>
 * <li>diameter: nominal diameter of MMT</li>
 * <li>length: overall length of motor</li>
 * <li>delays: dash-separated list of delay times</li>
 * <li>propellantMass: weight of propellant</li>
 * <li>totalMass: weight ready to fly</li>
 * <li>totalImpulse: are under thrust curve</li>
 * <li>avgThrust average thrust</li>
 * <li>maxThrust maximum instantaneous thrust</li>
 * <li>burnTime: burn time (absolute or normalized)</li>
 * <li>isp: specific impulse</li>
 * </ul>
 *
 * <p>The <em>points</em> array contains objects, one per data point.
 * Each point has at least time and thrust.
 * Other values are file-dependent, but also converted to MKS.</p>
 * <ul>
 * <li>time: time since since start of burn</li>
 * <li>thrust: instantaneous thrust</li>
 * <li>propellantMass: remaining mass of propellant</li>
 * </ul>
 *
 * <p>For example, a RASP file for the AeroTech K550 might produce:</p>
 * <pre>
 * {
 *   format: "RASP",
 *   info: {
 *     name: "K550W",
 *     diameter: 0.054,
 *     length: 0.41,
 *     delays: "0",
 *     propellantMass: 0.919744,
 *     totalMass: 1.48736,
 *     manufacturer: "AT"
 *   },
 *   points: [
 *     {
 *       time: 0.065,
 *       thrust: 604.264
 *     },
 *     …
 *     {
 *       time: 3.356,
 *       thrust: 0
 *     }
 *   ]
 * }
 * </pre>
 *
 * <p>Note that an error reporter is required for all parsing functions,
 * even if a no-op.</p>
 *
 * @module parsers
 */
module.exports = {
  /**
   * The supported file formats.
   * @member {object[]} info format information
   * @member {string} info.format offical format name
   * @member {string} info.extension file extension
   * @member {string} info.mimeType MIME type for serving data
   * @member {object} info.parse format-specific parser
   */
  AllFormats: AllFormats,

  /**
   * Get the information for a single format
   * @function
   * @param {string} format file format
   * @return {object} info
   * @return {string} info.format offical format name
   * @return {string} info.extension file extension
   * @return {string} info.mimeType MIME type for serving data
   * @return {object} info.parse format-specific parser
   */
  formatInfo: formatInfo,

  /**
   * <p>Guess the file format from the contents.  All files are assumed to be text.</p>
   * @function
   * @param {string} data
   * @return {string} format
   */
  guessFormat: guessFormat,

  /**
   * <p>Parse the data given the specified file format.</p>
   * @function
   * @param {string} format data file format
   * @param {string} data data file content
   * @param {function} error error reporter
   * @return {object} parsed structure
   */
  parseData: parseData,

  /**
   * <p>Parse the data in RASP file format.</p>
   * @function
   * @param {string} data data file content
   * @param {function} error error reporter
   * @return {object} parsed structure
   */
  parseRASP: rasp.parse,

  /**
   * <p>Parse the data in RockSim file format.</p>
   * @function
   * @param {string} data data file content
   * @param {function} error error reporter
   * @return {object} parsed structure
   */
  parseRockSim: rocksim.parse,
};
