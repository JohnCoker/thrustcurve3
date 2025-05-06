/*
 * Copyright 2015-2020 John Coker for ThrustCurve.org
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

function printData(format, parsed, error) {
  if (format == null || typeof format != 'string' || format === '') {
    error(errors.DATA_FILE_FORMAT, 'missing data file format to write');
    return;
  }
  if (parsed == null || parsed.info == null || typeof parsed.points == null) {
    error(errors.DATA_FILE_EMPTY, 'missing parsed data to write');
    return;
  }
  if (format.toLowerCase() == 'rasp')
    return rasp.print(parsed, error);
  else if (format.toLowerCase() == 'rocksim')
    return rocksim.print(parsed, error);
  else {
    error(errors.DATA_FILE_FORMAT, 'unknown data file format "{1}" to write', format);
    return;
  }
}

const A_IMPULSE = 1.25;
const MIN_VAL = 0.001;

function computeInfo(points, error) {
  if (points == null || points.length < 2) {
    error(errors.BAD_MOTOR_DATA, 'no points');
    return;
  }
  points = points.slice();
  points.sort((a, b) => a.time - b.time);

  // compute basic motor stats
  let burnTime = points.reduce((prev, p) => Math.max(prev, p.time), 0);
  let maxThrust = points.reduce((prev, p) => Math.max(prev, p.thrust), 0);
  let totalImpulse = points.reduce((prev, p, i) => {
    let t0 = i > 0 ? points[i - 1].time : 0;
    let n0 = i > 0 ? points[i - 1].thrust : 0;
    return prev + (points[i].time - t0) * ((points[i].thrust + n0) / 2);
  }, 0);
  if (burnTime <= MIN_VAL || totalImpulse < MIN_VAL) {
    error(errors.BAD_MOTOR_DATA, 'no time/thrust data');
    return;
  }
  let avgThrust = totalImpulse / burnTime;

  // generate a common name
  let name;
  if (totalImpulse > 0) {
    let letter = 0;
    let cls = A_IMPULSE;
    while (totalImpulse > cls * 2) {
      letter++;
      cls *= 2;
    }
    name = '';
    while (letter >= 26) {
      name = String.fromCharCode(65 + letter % 26) + name;
      letter = Math.floor(letter / 26) - 1;
    }
    name = String.fromCharCode(65 + letter) + name;
    if (avgThrust < 2)
      name += avgThrust.toFixed(1);
    else if (avgThrust < 10_000)
      name += Math.round(avgThrust).toFixed();
    else
      name += new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(avgThrust)
  }

  return { name, totalImpulse, avgThrust, maxThrust, burnTime };
}

function mergeData(inputs, error) {
  if (inputs == null || inputs.length < 1) {
    error(errors.BAD_MOTOR_INFO, 'no data inputs');
    return;
  }

  // determine merged burn time (including offsets)
  let missing = 0, burnTime = 0, zeroOffset = 0;
  inputs.forEach(input => {
    if (input.points == null || !(input.points.length > 1)) {
      missing++;
      return;
    }
    let bt = 0;
    if (!(bt > 0) && input.points.length > 1)
      bt = input.points[input.points.length - 1].time;
    if (bt > 0) {
      let t = bt;
      if (input.offset > 0)
        t += input.offset;
      else
        zeroOffset++;
      if (t > burnTime)
        burnTime = t;
    }
  });
  if (missing > 0) {
    error(errors.BAD_MOTOR_DATA, 'data inputs are missing points');
    return;
  }
  if (!(burnTime > 0) || !isFinite(burnTime)) {
    error(errors.BAD_MOTOR_DATA, 'data inputs have no positive time points');
    return;
  }
  if (zeroOffset < 1) {
    error(errors.BAD_MOTOR_DATA, 'data inputs all have positive offsets');
    return;
  }

  // build high-resolution point array
  const hires = [];
  {
    const N = Math.max(burnTime * 100, 100);
    const tStep = burnTime / N;

    // make sure there is an early point
    if (tStep > 0.49) {
      hires.push({
        time: 0.49,
        thrust: 0,
      });
      i++;
    }

    // other points are spaced evenly through the burn
    for (let i = 0; i < N; i++) {
      hires.push({
        time: (i + 1) * tStep,
        thrust: 0,
      });
    }
  }

  // add each motor's data
  let missingData = 0;
  inputs.forEach(input => {
    let points = input.points.slice();
    if (points == null || points.length < 2) {
      missingData++;
      return;
    }
    points.sort((a, b) => a.time - b.time);
    if (input.offset > 0)
      points = points.map(p => { return { time: p.time + input.offset, thrust: p.thrust }; });
    if (input.count > 0 && input.count != 1)
      points = points.map(p => { return { time: p.time, thrust: p.thrust * input.count }; });
    let t0 = input.offset > 0 ? input.offset : 0;
    let iPoint = 0;
    let lastPoint = { time: t0, thrust: 0 };
    hires.forEach((out, i) => {
      if (out.time <= t0)
        return;
      while (iPoint < points.length && points[iPoint].time <= out.time)
        lastPoint = points[iPoint++];
      if (iPoint >= points.length) return;

      let nextPoint = points[iPoint];
      let range = nextPoint.time - lastPoint.time;
      if (range > 0) {
        // interpolate
        let dist = (nextPoint.time - out.time) / range;
        out.thrust += lastPoint.thrust * dist + nextPoint.thrust * (1 - dist);
      }
    });
  });
  if (missingData > 0) {
    error(errors.BAD_MOTOR_DATA, 'data inputs are missing data');
    return;
  }
  let maxThrust = hires.reduce((prev, out) => Math.max(prev, out.thrust), 0);
  if (maxThrust < MIN_VAL) {
    error(errors.BAD_MOTOR_DATA, 'data inputs have no thrust');
    return;
  }

  // remove leading/trailing zero thrust points
  {
    const epsilon = 0.001;
    while (hires.length > 0 && hires[0].thrust < epsilon)
      hires.splice(0, 1);
    while (hires.length > 1 && hires[hires.length - 1].thrust < epsilon)
      hires.splice(hires.length - 1);
  }

  // remove predictable points
  {
    const epsilon = maxThrust / 1000;
    let seenMax = false;
    let i = 1;
    while (i < hires.length - 1) {
      if (hires[i].thrust >= maxThrust && !seenMax) {
        // keep a point at max thrust
        seenMax = true;
        i++;
      } else if (hires[i].thrust === 0 &&
                 (hires[i - 1].thrust > MIN_VAL || hires[i + 1].thrust > MIN_VAL)) {
        // preserve transitions to/from zero (burnout, ignition)
        i++;
      } else {
        // predict this point from the prior and next
        let range = hires[i + 1].time - hires[i - 1].time;
        let dist = (hires[i + 1].time - hires[i].time) / range;
        let predicted = hires[i - 1].thrust * dist + hires[i + 1].thrust * (1 - dist);
        if (Math.abs(predicted - hires[i].thrust) < epsilon)
          hires.splice(i, 1);
        else
          i++;
      }
    }
  }

  // make sure there are no internal zero points (staging gaps)
  hires.forEach((out, i) => {
    if (out.thrust < MIN_VAL)
      out.thrust = MIN_VAL;
  });

  // make sure there is a final zero thrust point at the burn time
  let tEnd = burnTime > hires[hires.length - 1].time ? burnTime : hires[hires.length - 1].time + MIN_VAL;
  hires.push({ time: tEnd, thrust: 0 });

  // compute motor info
  let info = computeInfo(hires, error) ?? {};
  if (info.name != null)
    info.manufacturer = 'Custom';
  info.diameter = inputs.reduce((prev, input) => {
    if (input.info.diameter > 0) {
      if (prev == null || prev < input.info.diameter)
        prev = input.info.diameter;
    }
    return prev;
  }, undefined);
  info.length = inputs.reduce((prev, input) => {
    if (input.info.length > 0) {
      if (prev == null || prev < input.info.length)
        prev = input.info.length;
    }
    return prev;
  }, undefined);
  info.propellantWeight = inputs.reduce((prev, input) => {
    if (input.info.propellantWeight > 0)
      prev += input.count > 0 ? input.info.propellantWeight * input.count : input.info.propellantWeight;
    return prev;
  }, 0);
  info.totalWeight = inputs.reduce((prev, input) => {
    if (input.info.totalWeight > 0)
      prev += input.count > 0 ? input.info.totalWeight * input.count : input.info.totalWeight;
    return prev;
  }, 0);

  // build a summary comment
  {
    let s = 'Merge of ' + inputs.length + ' motors:\n';
    inputs.forEach(input => {
      s += ' - ' + input.info.manufacturer + ' ' + input.info.name;
      if (input.count > 0 && input.count != 1)
        s += ', count ' + input.count;
      if (input.offset > 0)
        s += ', offset ' + input.offset;
      s += '\n';
    });
    s += 'Produced by ThrustCurve.org: https://thrustcurve.org/motors/merge.html\n';
    info.comment = s;
  }

  return { info, points: hires };
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
 * <li>propellantWeight: weight of propellant</li>
 * <li>totalWeight: weight ready to fly</li>
 * <li>totalImpulse: are under thrust curve</li>
 * <li>avgThrust average thrust</li>
 * <li>maxThrust maximum instantaneous thrust</li>
 * <li>burnTime: burn time (absolute or normalized)</li>
 * <li>isp: specific impulse</li>
 * <li>comment: free-form text describing the file</li>
 * </ul>
 *
 * <p>The <em>points</em> array contains objects, one per data point.
 * Each point has at least time and thrust.
 * Other values are file-dependent, but also converted to MKS.</p>
 * <ul>
 * <li>time: time since since start of burn</li>
 * <li>thrust: instantaneous thrust</li>
 * <li>propellantWeight: remaining mass of propellant</li>
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
 *     propellantWeight: 0.919744,
 *     totalWeight: 1.48736,
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
  AllFormats,

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
  formatInfo,

  /**
   * <p>Guess the file format from the contents.  All files are assumed to be text.</p>
   * @function
   * @param {string} data
   * @return {string} format
   */
  guessFormat,

  /**
   * <p>Parse the data given the specified file format.</p>
   * @function
   * @param {string} format data file format
   * @param {string} data data file content
   * @param {function} error error reporter
   * @return {object} parsed structure
   */
  parseData,

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

  /**
   * <p>Write the parsed data as the specified file format.</p>
   * @function
   * @param {string} format data file format
   * @param {string} parsed parsed data
   * @param {function} error error reporter
   * @return {string} formatted data file
   */
  printData,

  /**
   * <p>Write the parsed data as RASP file format.</p>
   * <p>This requires the info needed for the header line to be present in <code>info</code>.</p>
   * @function
   * @param {string} parsed parsed data
   * @param {function} error error reporter
   * @return {string} formatted data file
   */
  printRASP: rasp.print,

  /**
   * <p>Write the parsed data as RockSim file format.</p>
   * <p>This requires at least the name and manufacturer to be present in <code>info</code>.</p>
   * @function
   * @param {string} parsed parsed data
   * @param {function} error error reporter
   * @return {string} formatted data file
   */
  printRockSim: rocksim.print,

  /**
   * <p>Combine multiple data in RASP file format into one.</p>
   * @function
   * @param {string[]} data data files content
   * @param {function} error error reporter
   * @return {string} combined file
   */
  combineRASP: rasp.combine,

  /**
   * <p>Combine multiple data in RockSim file format into one.</p>
   * @function
   * @param {string[]} data data files content
   * @param {function} error error reporter
   * @return {string} combined file
   */
  combineRockSim: rocksim.combine,

  /**
   * <p>Compute name and thrust stats for data points.</p>
   * @function
   * @param {object[]} points data points
   * @param {function} error error reporter
   * @return {object} computed info
   */
  computeInfo,

  /**
   * <p>Merge multiple parsed files into a single virtual motor.</p>
   * <p>Optionally, a <code>count</code> and <code>offset</code> can be specified in each input data.</p>
   * @function
   * @param {object[]} inputs array of input files
   * @param {function} error error reporter
   * @return {object} merged output files
   */
  mergeData,
};
