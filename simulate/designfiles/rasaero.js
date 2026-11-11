/*
 * Copyright 2026 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const xmlparser = require('xml-parser');
const errors = require('../../lib/errors');
const finish = require('./finish');
const xml = require('./xml');

const FORMAT = 'RASAero II';
const MIME = 'application/xml';

// RASAero II stores lengths in inches. A saved launch weight includes the motor,
// so this parser does not report that weight as dry mass. Recovery CD is the
// parachute, not the rocket. The file has no motor-mount tube, so the result
// leaves stages out and the caller asks for the mount.
const INCH = 0.0254;

const SustainerTags = new Set(['nosecone', 'bodytube', 'transition', 'boattail', 'fincan']);
const GuideTags = ['RodLength', 'RailGuideHeight', 'LaunchRailLength', 'RailLength', 'LaunchGuideLength'];

function parse(data, error) {
  if (data == null || typeof data !== 'string' || data.trim() === '') {
    error(errors.DATA_FILE_EMPTY, 'missing data');
    return;
  }

  const doc = xmlparser(data.replace(/^\uFEFF/, ''));
  if (doc?.root == null || !/rasaerodocument$/i.test(doc.root.name)) {
    error(errors.DATA_FILE_FORMAT, 'design file is not a RASAero II document');
    return;
  }

  const design = xml.child(doc.root, 'RocketDesign') ?? doc.root;
  let bodyDiameter = 0;
  for (const el of design.children ?? []) {
    const size = sizeOf(el);
    if (size == null || !airframe(el.name))
      continue;
    for (const diameter of [size.diameter, size.rear]) {
      if (diameter > 0)
        bodyDiameter = Math.max(bodyDiameter, diameter);
    }
  }

  if (!(bodyDiameter > 0)) {
    error(errors.INVALID_INFO, 'RASAero design has no body diameter');
    return;
  }

  const result = {
    format: FORMAT,
    mimeType: MIME,
    name: xml.text(doc.root, 'Name') ?? xml.text(doc.root, 'RocketName') ?? xml.text(design, 'Name'),
    bodyDiameter,
  };
  const guide = guideLength(doc.root);
  if (guide > 0)
    result.guideLength = guide;
  finish.assignCd(result, undefined, finish.fromRASAero(design));
  return result;
}

function airframe(name) {
  const key = (name ?? '').toLowerCase();
  return key === 'booster' || key.startsWith('booster1') || key.startsWith('booster2') || SustainerTags.has(key);
}

// A current file stores length and diameter as child elements. The rear diameter
// of a transition or boat tail counts when it is the widest point. Older files
// put length then diameter in the element text.
function sizeOf(el) {
  const words = (el.content ?? '').trim().split(/\s+/);
  const length = inches(words[0]) ?? inches(xml.text(el, 'Length') ?? xml.text(el, 'Len'));
  const diameter = inches(words[1]) ?? inches(xml.text(el, 'Diameter') ?? xml.text(el, 'Dia'));
  const rear = inches(xml.text(el, 'RearDiameter')) ?? inches(xml.text(el, 'BoattailRearDiameter'));
  if (length == null && diameter == null && rear == null)
    return;
  return { length, diameter, rear };
}

function inches(value) {
  if (value == null || value === '')
    return;
  const n = Number(String(value).trim().split(/\s+/)[0]);
  if (!Number.isFinite(n) || n <= 0)
    return;
  return n * INCH;
}

function guideLength(root) {
  for (const el of [xml.child(root, 'LaunchSite'), root]) {
    for (const tag of GuideTags) {
      const length = inches(xml.text(el, tag));
      if (length > 0)
        return length;
    }
  }
}

module.exports = {
  format: FORMAT,
  extension: '.cdx1',
  mimeType: MIME,
  parse,
};
