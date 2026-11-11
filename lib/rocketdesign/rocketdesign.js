/*
 * Copyright 2026 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const units = require('../units');

// Measurements the motor guide and the rocket form both require.
// The labels are what we ask the user to type when a design file omits them.
const Needed = [
  ['name', 'name'],
  ['bodyDiameter', 'body diameter'],
  ['weight', 'dry weight'],
  ['mmtDiameter', 'motor mount diameter'],
  ['mmtLength', 'motor mount length'],
  ['mmtCount', 'motor mount count'],
  ['cd', 'drag coefficient'],
  ['guideLength', 'guide length'],
];

const MountFields = ['mmtDiameter', 'mmtDiameterUnit', 'mmtLength', 'mmtLengthUnit', 'mmtCount'];

/*
 * Turn a parsed design file into the rocket the form edits.
 * Lengths and mass are in the caller's units. Mount diameter is millimeters,
 * the unit the rocket form already uses; saving fills in the meter value.
 * The widest tube of the first stage is the launch mount. It is moved to the
 * front of that stage, because saving copies that first tube onto the rocket.
 *
 * {
 *   rocket: { name, bodyDiameter, stages, ... },
 *   missing: [ 'dry weight' ]
 * }
 */
function fromDesign(extracted, options) {
  extracted = extracted || {};
  options = options || {};

  const lengthUnit = options.lengthUnit;
  const massUnit = options.massUnit;
  const guideUnit = options.guideUnit;
  const rocket = {
    public: true,
    name: designName(extracted, options.fileName),
    bodyDiameter: measure(extracted.bodyDiameter, 'length', lengthUnit),
    bodyDiameterUnit: lengthUnit,
    weight: measure(extracted.mass, 'mass', massUnit),
    weightUnit: massUnit,
    mmtDiameterUnit: 'mm',
    mmtLengthUnit: lengthUnit,
    cd: drag(extracted.cd),
    guideLength: measure(extracted.guideLength, 'length', guideUnit),
    guideLengthUnit: guideUnit,
  };

  const stages = stagesFrom(extracted.stages, lengthUnit);
  if (stages.length > 0) {
    stages[0].mmts = widestFirst(stages[0].mmts);
    rocket.stages = stages;
  }

  const main = stages.length > 0 && stages[0].mmts.length > 0 ? stages[0].mmts[0] : null;
  if (main != null) {
    if (main.mmtDiameter > 0) {
      rocket.mmtDiameter = main.mmtDiameter;
      rocket.mmtDiameterUnit = main.mmtDiameterUnit;
    }
    if (main.mmtLength > 0) {
      rocket.mmtLength = main.mmtLength;
      rocket.mmtLengthUnit = main.mmtLengthUnit;
    }
    if (main.mmtCount > 0)
      rocket.mmtCount = main.mmtCount;
  }

  return {
    rocket,
    missing: Needed.filter(([key]) => absent(rocket[key])).map(([, label]) => label),
  };
}

// Sentence shown above the form when the file left something out.
function prompt(missing) {
  if (missing == null || missing.length < 1)
    return;

  let list;
  if (missing.length === 1)
    list = missing[0];
  else if (missing.length === 2)
    list = missing[0] + ' or ' + missing[1];
  else
    list = missing.slice(0, -1).join(', ') + ', or ' + missing[missing.length - 1];
  const verb = missing.length === 1 ? 'it' : 'them';
  return 'The design file did not include the ' + list + '. Enter ' + verb + ' to save the rocket.';
}

/*
 * Attach a held design file, and the stages it contained, to a rocket the
 * form is about to save. The form's motor-mount fields are the launch mount,
 * already the first tube of the first stage. They replace that tube so a
 * correction survives the save hook, which copies it back onto the rocket.
 */
function applyImport(rocket, imported) {
  if (rocket == null || imported == null)
    return rocket;

  if (imported.content != null && imported.format != null && imported.mimeType != null) {
    const content = Buffer.isBuffer(imported.content)
      ? imported.content
      : Buffer.from(imported.content, 'base64');
    rocket.designFile = {
      name: imported.name,
      format: imported.format,
      mimeType: imported.mimeType,
      content,
    };
  }

  if (!Array.isArray(imported.stages) || imported.stages.length < 1)
    return rocket;

  rocket.stages = imported.stages.map(stage => ({
    name: stage && stage.name,
    mmts: Array.isArray(stage && stage.mmts) ? stage.mmts.map(mmt => Object.assign({}, mmt)) : [],
  }));

  const mount = mainMount(rocket);
  if (mount == null)
    return rocket;

  const stage = rocket.stages[0];
  if (stage.mmts.length > 0)
    Object.assign(stage.mmts[0], mount);
  else
    stage.mmts.unshift(mount);
  return rocket;
}

function stagesFrom(stages, lengthUnit) {
  if (!Array.isArray(stages))
    return [];
  return stages.map(stage => ({
    name: stage && stage.name,
    mmts: mountsFrom(stage && stage.mmts, lengthUnit),
  }));
}

function mountsFrom(mounts, lengthUnit) {
  if (!Array.isArray(mounts))
    return [];
  const found = [];
  mounts.forEach(mmt => {
    if (mmt == null)
      return;
    const diameter = mmtDiameter(mmt.diameter);
    const length = measure(mmt.length, 'length', lengthUnit);
    if (diameter == null && length == null)
      return;
    found.push({
      mmtDiameter: diameter,
      mmtDiameterUnit: diameter != null ? 'mm' : undefined,
      mmtLength: length,
      mmtLengthUnit: length != null ? lengthUnit : undefined,
      mmtCount: mmt.count > 0 ? Math.round(mmt.count) : 1,
    });
  });
  return found;
}

// Equal diameters keep their original order. A tube with no diameter sorts last.
function widestFirst(mounts) {
  if (!Array.isArray(mounts) || mounts.length < 2)
    return mounts;
  return mounts.map((mmt, index) => ({ mmt, index }))
    .sort((a, b) => {
      const width = b.mmt.mmtDiameter > 0 ? b.mmt.mmtDiameter : 0;
      const other = a.mmt.mmtDiameter > 0 ? a.mmt.mmtDiameter : 0;
      if (width !== other)
        return width - other;
      return a.index - b.index;
    })
    .map(item => item.mmt);
}

function mainMount(rocket) {
  if (!(rocket.mmtDiameter > 0) || !(rocket.mmtLength > 0))
    return;
  const mount = {};
  MountFields.forEach(name => {
    if (rocket[name] != null)
      mount[name] = rocket[name];
  });
  if (!(mount.mmtCount > 0))
    mount.mmtCount = 1;
  return mount;
}

function designName(extracted, fileName) {
  const named = extracted && typeof extracted.name === 'string' ? extracted.name.trim() : '';
  if (named !== '')
    return named;
  if (typeof fileName !== 'string')
    return;
  const base = fileName.split(/[/\\]/).pop().replace(/\.[^.]+$/, '').trim();
  return base !== '' ? base : undefined;
}

function measure(mks, type, unit) {
  if (!(mks > 0) || unit == null)
    return;
  const value = Math.round(units.convertUnitFromMKS(mks, type, unit) * 1000) / 1000;
  return value > 0 ? value : undefined;
}

function mmtDiameter(mks) {
  if (!(mks > 0))
    return;
  const value = Math.round(units.convertMMTFromMKS(mks) * 1000) / 1000;
  return value > 0 ? value : undefined;
}

function drag(cd) {
  if (!(cd > 0))
    return;
  const value = Math.round(cd * 100) / 100;
  return value >= 0.1 ? value : undefined;
}

function absent(value) {
  if (typeof value === 'string')
    return value.trim() === '';
  return !(value > 0);
}

module.exports = {
  fromDesign,
  prompt,
  applyImport,
};
