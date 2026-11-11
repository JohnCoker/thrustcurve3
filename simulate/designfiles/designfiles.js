/*
 * Copyright 2026 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const errors = require('../../lib/errors');
const openrocket = require('./openrocket');
const rocksim = require('./rocksim');
const rasaero = require('./rasaero');

const AllFormats = [ openrocket, rocksim, rasaero ];

function formatInfo(format) {
  if (format == null || format === '')
    return;

  const key = String(format).toLowerCase().replace(/^\./, '');
  return AllFormats.find(info =>
    info.format.toLowerCase() === key || info.extension.slice(1) === key);
}

function guessFormat(data) {
  if (data == null || data === '')
    return;

  if (Buffer.isBuffer(data)) {
    if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b)
      return openrocket.format;
    if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b)
      return openrocket.format;
    data = data.toString('utf8');
  }
  if (typeof data !== 'string')
    return;

  const s = data.replace(/^\uFEFF/, '').trim().toLowerCase();
  if (s.includes('<openrocket'))
    return openrocket.format;
  if (s.includes('<rocksimdocument'))
    return rocksim.format;
  if (s.includes('<rasaerodocument') || s.includes('.rasaerodocument'))
    return rasaero.format;
}

function parseData(format, data, error) {
  error ??= () => {};

  const info = formatInfo(format);
  if (info == null) {
    error(errors.DATA_FILE_FORMAT, 'unknown design file format "{1}"', format);
    return;
  }
  return info.parse(data, error);
}

/*
 * Reads a rocket design file into the measurements the motor guide can use.
 * Lengths are meters and mass is kilograms. The first stage lights at launch.
 *
 * The overall dry weight is the design's mass override. OpenRocket states that as one rocket value,
 * or as each stage's own mass. RockSim states it as each stage's known mass when UseKnownMass is set.
 * The stage masses are summed.
 *
 * Cd is the file's stated drag coefficient when it has one. Otherwise it is inferred from the outside
 * finish and cdInferred is true.
 *
 * RASAero II has no motor-mount tube, so that result omits stages and the info must be entered by hand.
 *
 * {
 *   format: "OpenRocket",
 *   mimeType: "application/x-openrocket",
 *   name: "Alpha",
 *   bodyDiameter: 0.0248,
 *   mass: 0.085,
 *   guideLength: 0.9144,
 *   cd: 0.45,
 *   cdInferred: true,
 *   stages: [
 *     {
 *       name: "Sustainer",
 *       mmts: [ { diameter: 0.018, length: 0.073, count: 1 } ]
 *     }
 *   ]
 * }
 */
module.exports = {
  AllFormats,
  formatInfo,
  guessFormat,
  parseData,
  parseOpenRocket: openrocket.parse,
  parseRockSim: rocksim.parse,
  parseRASAero: rasaero.parse,
};
