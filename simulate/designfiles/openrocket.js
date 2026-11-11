/*
 * Copyright 2026 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const zlib = require('zlib');
const xmlparser = require('xml-parser');
const errors = require('../../lib/errors');
const finish = require('./finish');
const xml = require('./xml');

const FORMAT = 'OpenRocket';
const MIME = 'application/x-openrocket';

// Point count is half the coordinate list in OpenRocket's ClusterConfiguration.
const ClusterCount = {
  single: 1,
  double: 2,
  '3-row': 3,
  '4-row': 4,
  '3-ring': 3,
  '4-ring': 4,
  '5-ring': 5,
  '6-ring': 6,
  '3-star': 4,
  '4-star': 5,
  '5-star': 6,
  '6-star': 7,
};

const MountTags = new Set(['bodytube', 'innertube']);
const BodyTags = new Set(['nosecone', 'bodytube', 'transition']);
const RadiusTags = ['outerradius', 'radius', 'aftradius', 'foreradius'];

const EOCD = Buffer.from([0x50, 0x4b, 0x05, 0x06]);

function parse(data, error) {
  const text = decode(data, error);
  if (text == null)
    return;

  const doc = xmlparser(text);
  if (doc?.root?.name !== 'openrocket') {
    error(errors.DATA_FILE_FORMAT, 'design file is not an OpenRocket document');
    return;
  }

  const rocket = xml.child(doc.root, 'rocket');
  if (rocket == null) {
    error(errors.INVALID_INFO, 'OpenRocket document has no rocket');
    return;
  }

  // The file lists the sustainer first. The launch stage is the last one.
  // Older tests put <stage> directly under <rocket>. Saved files wrap them in <subcomponents>.
  const stages = stageElements(rocket)
    .toReversed()
    .map(el => ({
      name: xml.text(el, 'name'),
      mmts: mountsOf(el, error),
      mass: replacingMass(el),
      cd: stageCd(el),
    }));

  const bodyDiameter = maxDiameter(rocket);
  if (!(bodyDiameter > 0)) {
    error(errors.INVALID_INFO, 'OpenRocket design has no body diameter');
    return;
  }

  const result = {
    format: FORMAT,
    mimeType: MIME,
    name: xml.text(rocket, 'name'),
    bodyDiameter,
    stages: stages.map(({ name, mmts }) => ({ name, mmts })),
  };
  const guideLength = rodLength(doc.root);
  if (guideLength > 0)
    result.guideLength = guideLength;

  // A stated launch-stage Cd wins. Otherwise the outside finish supplies a default.
  // A rocket-level mass override is the whole dry weight. Otherwise each stage
  // must state its own.
  const [launch] = stages;
  finish.assignCd(result, launch?.cd, finish.fromOpenRocket(rocket));
  const rocketMass = replacingMass(rocket);
  if (rocketMass > 0) {
    result.mass = rocketMass;
  } else {
    const masses = stages.map(stage => stage.mass);
    if (masses.length > 0 && masses.every(mass => mass > 0))
      result.mass = masses.reduce((sum, mass) => sum + mass, 0);
  }

  return result;
}

function decode(data, error) {
  if (data == null || data === '') {
    error(errors.DATA_FILE_EMPTY, 'missing data');
    return;
  }

  if (typeof data === 'string') {
    const trimmed = data.replace(/^\uFEFF/, '').trim();
    if (trimmed.startsWith('<'))
      return trimmed;
    data = Buffer.from(data, 'latin1');
  }
  if (!Buffer.isBuffer(data) || data.length === 0) {
    error(errors.DATA_FILE_EMPTY, 'missing data');
    return;
  }
  if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
    try {
      return zlib.gunzipSync(data).toString('utf8');
    } catch {
      error(errors.DATA_FILE_FORMAT, 'invalid gzip OpenRocket file');
      return;
    }
  }
  if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b) {
    const xmlText = unzipDesign(data);
    if (xmlText == null) {
      error(errors.DATA_FILE_FORMAT, 'OpenRocket archive has no rocket.ork entry');
      return;
    }
    return xmlText;
  }

  const text = data.toString('utf8').replace(/^\uFEFF/, '').trim();
  if (text.startsWith('<'))
    return text;
  error(errors.DATA_FILE_FORMAT, 'design file is not OpenRocket XML or a zip archive');
}

function unzipDesign(buf) {
  const eocd = findEocd(buf);
  if (eocd == null)
    return null;

  const count = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  let fallback = null;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== 0x02014b50)
      return null;
    const method = buf.readUInt16LE(offset + 10);
    const compSize = buf.readUInt32LE(offset + 20);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localOff = buf.readUInt32LE(offset + 42);
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLen);
    const preferred = name === 'rocket.ork' || name.endsWith('/rocket.ork');
    const possible = name.endsWith('.ork') || name.endsWith('.xml');
    if (preferred || (fallback == null && possible)) {
      const text = readEntry(buf, localOff, method, compSize);
      if (text == null)
        return null;
      if (preferred)
        return text;
      fallback = text;
    }
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return fallback;
}

function readEntry(buf, localOff, method, compSize) {
  if (localOff + 30 > buf.length || buf.readUInt32LE(localOff) !== 0x04034b50)
    return null;
  const nameLen = buf.readUInt16LE(localOff + 26);
  const extraLen = buf.readUInt16LE(localOff + 28);
  const dataStart = localOff + 30 + nameLen + extraLen;
  const dataEnd = dataStart + compSize;
  if (dataEnd > buf.length)
    return null;
  return inflate(buf.subarray(dataStart, dataEnd), method);
}

function findEocd(buf) {
  if (buf.length < 22)
    return;
  const min = Math.max(0, buf.length - (22 + 0xffff));
  const at = buf.lastIndexOf(EOCD, buf.length - 22);
  return at >= min ? at : undefined;
}

function inflate(slice, method) {
  if (method === 0)
    return slice.toString('utf8');
  if (method === 8) {
    try {
      return zlib.inflateRawSync(slice).toString('utf8');
    } catch {
      return null;
    }
  }
}

function stageElements(rocket) {
  const direct = (rocket.children ?? []).filter(el => el.name === 'stage');
  if (direct.length > 0)
    return direct;
  return (xml.child(rocket, 'subcomponents')?.children ?? []).filter(el => el.name === 'stage');
}

function mountsOf(stage, error) {
  const found = [];
  gather(stage, 1, found, error);
  return found;
}

function gather(el, multiplier, found, error) {
  const children = el.children ?? [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const { name } = child;
    if (name === 'podset' || name === 'parallelstage') {
      const copies = count(xml.text(child, 'instancecount'), 1);
      gather(child, multiplier * copies, found, error);
      continue;
    }
    if (MountTags.has(name) && xml.child(child, 'motormount') != null) {
      const mmt = toMount(child, multiplier, children, i, error);
      if (mmt != null)
        found.push(mmt);
    }
    gather(child, multiplier, found, error);
  }
}

function toMount(tube, multiplier, siblings, index, error) {
  const outer = outerRadius(tube, siblings, index);
  const thickness = xml.number(xml.text(tube, 'thickness')) ?? 0;
  const length = xml.number(xml.text(tube, 'length'));
  if (!(outer > thickness) || !(length > 0)) {
    error(errors.INVALID_INFO, 'OpenRocket motor mount has no diameter and length');
    return;
  }
  const overhang = xml.number(xml.text(xml.child(tube, 'motormount'), 'overhang')) ?? 0;
  return {
    diameter: 2 * (outer - thickness),
    length: length + overhang,
    count: clusterCount(tube, error) * multiplier,
  };
}

// A saved file often says radius "auto", meaning the tube continues the previous part.
function outerRadius(tube, siblings, index) {
  const stated = xml.number(xml.text(tube, 'outerradius')) ?? xml.number(xml.text(tube, 'radius'));
  if (stated > 0)
    return stated;
  for (let i = index - 1; i >= 0; i--) {
    const el = siblings[i];
    if (!BodyTags.has(el.name))
      continue;
    for (const tag of ['aftradius', 'outerradius', 'radius']) {
      const radius = xml.number(xml.text(el, tag));
      if (radius > 0)
        return radius;
    }
  }
}

function clusterCount(tube, error) {
  const name = xml.text(tube, 'clusterconfiguration');
  if (name == null)
    return 1;
  if (Object.hasOwn(ClusterCount, name))
    return ClusterCount[name];
  error(errors.INVALID_INFO, 'unknown OpenRocket cluster configuration "{1}"', name);
  return 1;
}

function count(value, fallback) {
  const n = xml.number(value);
  return n >= 1 ? Math.round(n) : fallback;
}

function replacingMass(el) {
  const replaces = xml.flag(xml.text(el, 'overridesubcomponentsmass')) ||
                   xml.flag(xml.text(el, 'overridesubcomponents'));
  const mass = xml.number(xml.text(el, 'overridemass'));
  if (replaces && mass > 0)
    return mass;
}

function stageCd(stage) {
  const replaces = xml.flag(xml.text(stage, 'overridesubcomponentscd')) ||
                   xml.flag(xml.text(stage, 'overridesubcomponents'));
  const cd = xml.number(xml.text(stage, 'overridecd'));
  if (replaces && cd > 0)
    return cd;
}

function maxDiameter(el, max = 0) {
  if (el == null || el.name === 'innertube')
    return max;
  if (BodyTags.has(el.name)) {
    for (const tag of RadiusTags) {
      const radius = xml.number(xml.text(el, tag));
      if (radius > 0)
        max = Math.max(max, radius * 2);
    }
  }
  for (const child of el.children ?? [])
    max = maxDiameter(child, max);
  return max;
}

function rodLength(root) {
  for (const sim of xml.child(root, 'simulations')?.children ?? []) {
    if (sim.name !== 'simulation')
      continue;
    const length = xml.number(xml.text(xml.child(sim, 'conditions'), 'launchrodlength'));
    if (length > 0)
      return length;
  }
}

module.exports = {
  format: FORMAT,
  extension: '.ork',
  mimeType: MIME,
  parse,
};
