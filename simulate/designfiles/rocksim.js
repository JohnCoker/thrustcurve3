/*
 * Copyright 2026 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const xmlparser = require('xml-parser');
const errors = require('../../lib/errors');
const finish = require('./finish');
const xml = require('./xml');

const FORMAT = 'RockSim';
const MIME = 'application/xml';

// RockSim XML lengths are millimeters and masses are grams.
const MM = 0.001;
const G = 0.001;

// Stage3 is the sustainer. The launch stage is the lowest one that has parts.
const StageParts = [
  { element: 'Stage1Parts', mass: 'Stage1Mass', name: 'Second booster' },
  { element: 'Stage2Parts', mass: 'Stage2Mass', name: 'Booster' },
  { element: 'Stage3Parts', mass: 'Stage3Mass', name: 'Sustainer' },
];

const BodyTags = new Set(['NoseCone', 'BodyTube', 'Transition']);
const DiaTags = ['OD', 'BaseDia', 'FrontDia', 'RearDia', 'Dia'];

function parse(data, error) {
  if (data == null || typeof data !== 'string' || data.trim() === '') {
    error(errors.DATA_FILE_EMPTY, 'missing data');
    return;
  }

  const doc = xmlparser(unwrapCdata(data));
  if (doc?.root?.name !== 'RockSimDocument') {
    error(errors.DATA_FILE_FORMAT, 'design file is not a RockSim document');
    return;
  }

  const design = xml.child(xml.child(doc.root, 'DesignInformation'), 'RocketDesign');
  if (design == null) {
    error(errors.INVALID_INFO, 'RockSim document has no rocket design');
    return;
  }

  let bodyDiameter = 0;
  const stages = [];
  const stageMasses = [];
  for (const spec of StageParts) {
    const parts = xml.child(design, spec.element);
    if (!parts?.children?.length)
      continue;
    bodyDiameter = Math.max(bodyDiameter, maxDiameter(parts));
    stages.push({
      name: spec.name,
      mmts: mergeMounts(mountsOf(parts, error)),
    });
    stageMasses.push(xml.number(xml.text(design, spec.mass)));
  }

  // Later files store the body diameter. Version 1 leaves it to be read from the parts.
  const savedDiameter = xml.number(xml.text(design, 'MaxDiaWithoutFins'));
  if (savedDiameter > 0)
    bodyDiameter = savedDiameter * MM;
  if (!(bodyDiameter > 0)) {
    error(errors.INVALID_INFO, 'RockSim design has no body diameter');
    return;
  }

  const result = {
    format: FORMAT,
    mimeType: MIME,
    name: xml.text(design, 'Name'),
    bodyDiameter,
    stages,
  };
  const guide = xml.number(xml.text(design, 'LaunchGuideLength'));
  if (guide > 0)
    result.guideLength = guide * MM;
  // Version 1 has one FixedCd. Later files add FixedCd2 and FixedCd3 for the stack.
  // A calculated design takes its Cd from the outside finish instead.
  const calculateCd = xml.text(design, 'CalculateCD') ?? xml.text(design, 'ProCalculateCD');
  const stated = calculateCd != null && !xml.flag(calculateCd) ? statedCd(design, stages.length) : undefined;
  finish.assignCd(result, stated, finish.fromRockSim(design));
  // UseKnownMass is the design's mass override. The known stage masses sum to the dry weight.
  if (xml.flag(xml.text(design, 'UseKnownMass')) &&
      stageMasses.length > 0 && stageMasses.every(mass => mass > 0))
    result.mass = stageMasses.reduce((sum, mass) => sum + mass, 0) * G;
  return result;
}

function statedCd(design, stageCount) {
  const specific = stageCount === 2 ? 'FixedCd2' : stageCount >= 3 ? 'FixedCd3' : null;
  const value = (specific && xml.text(design, specific)) ?? xml.text(design, 'FixedCd') ?? xml.text(design, 'Cd');
  return xml.number(value);
}

// xml-parser stops at a CDATA section, and RockSim wraps names in one.
function unwrapCdata(data) {
  return data.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, inner) => inner.replace(/</g, ' '));
}

function mountsOf(el, error) {
  const found = [];
  for (const tube of xml.descendants(el)) {
    if (tube.name !== 'BodyTube' || !xml.flag(xml.text(tube, 'IsMotorMount')))
      continue;
    const diaMm = xml.number(xml.text(tube, 'MotorDia')) ?? xml.number(xml.text(tube, 'ID'));
    const lenMm = xml.number(xml.text(tube, 'Len'));
    if (!(diaMm > 0) || !(lenMm > 0)) {
      error(errors.INVALID_INFO, 'RockSim motor mount has no diameter and length');
      continue;
    }
    const overhang = xml.number(xml.text(tube, 'EngineOverhang')) ?? 0;
    const copies = xml.number(xml.text(tube, 'EngineCount') ?? xml.text(tube, 'MotorCount'));
    found.push({
      diameter: diaMm * MM,
      length: (lenMm + overhang) * MM,
      count: copies >= 1 ? Math.round(copies) : 1,
    });
  }
  return found;
}

function mergeMounts(mounts) {
  const merged = [];
  for (const mmt of mounts) {
    const same = merged.find(item =>
      Math.abs(item.diameter - mmt.diameter) < 1e-6 &&
      Math.abs(item.length - mmt.length) < 1e-6);
    if (same)
      same.count += mmt.count;
    else
      merged.push({ ...mmt });
  }
  return merged;
}

function maxDiameter(el) {
  let max = 0;
  for (const node of [el, ...xml.descendants(el)]) {
    if (!BodyTags.has(node?.name))
      continue;
    for (const tag of DiaTags) {
      const mm = xml.number(xml.text(node, tag));
      if (mm > 0)
        max = Math.max(max, mm * MM);
    }
  }
  return max;
}

module.exports = {
  format: FORMAT,
  extension: '.rkt',
  mimeType: MIME,
  parse,
};
