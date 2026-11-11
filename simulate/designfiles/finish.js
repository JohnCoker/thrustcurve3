/*
 * Copyright 2026 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const xml = require('./xml');

// The guide's finish menu is four starting points for a Cd the user can type.
// A design file's finish is mapped onto those same numbers.
const POLISHED = 0.3;
const SMOOTH = 0.45;
const REGULAR = 0.6;
const ROUGH = 1.0;

const OpenRocketFinish = {
  mirror: POLISHED,
  polished: POLISHED,
  finishpolished: POLISHED,
  optimum: SMOOTH,
  smooth: SMOOTH,
  normal: REGULAR,
  unfinished: ROUGH,
  roughunfinished: ROUGH,
  rough: ROUGH,
};

// RockSim FinishCode, using OpenRocket's import mapping.
const RockSimFinish = {
  0: POLISHED,
  1: SMOOTH,
  2: REGULAR,
  3: ROUGH,
};

const RASAeroFinish = {
  'smooth (zero roughness)': POLISHED,
  polished: POLISHED,
  'sheet metal': SMOOTH,
  'smooth paint': SMOOTH,
  'camouflage paint': REGULAR,
  'rough camouflage paint': ROUGH,
  'galvanized metal': ROUGH,
  'cast iron (very rough)': ROUGH,
};

const Airframe = new Set(['nosecone', 'bodytube', 'transition']);

function assignCd(result, stated, inferred) {
  if (stated > 0) {
    result.cd = stated;
    result.cdInferred = false;
  } else if (inferred > 0) {
    result.cd = inferred;
    result.cdInferred = true;
  }
}

function fromOpenRocket(rocket) {
  return roughest(openRocketFinishes(rocket));
}

function fromRockSim(design) {
  const found = [];
  for (const name of ['Stage1Parts', 'Stage2Parts', 'Stage3Parts'])
    rockSimFinishes(xml.child(design, name), false, found);
  return roughest(found);
}

function fromRASAero(design) {
  const surface = (xml.text(design, 'Surface') ?? '').toLowerCase();
  return RASAeroFinish[surface];
}

// The roughest outside surface wins. A smoother nose does not cancel a
// regularly painted body, and a motor mount inside a tube does not count.
function roughest(values) {
  const cds = values.filter(cd => cd > 0);
  if (cds.length === 0)
    return;
  return Math.max(...cds);
}

function openRocketFinishes(el, found = []) {
  if (el == null || el.name === 'innertube')
    return found;
  if (Airframe.has(el.name)) {
    const cd = OpenRocketFinish[(xml.text(el, 'finish') ?? '').toLowerCase()];
    if (cd != null)
      found.push(cd);
  }
  for (const child of el.children ?? [])
    openRocketFinishes(child, found);
  return found;
}

function rockSimFinishes(el, insideTube, found) {
  if (el == null)
    return;
  const name = el.name;
  const tube = name === 'BodyTube';
  if (!insideTube && (name === 'NoseCone' || tube || name === 'Transition')) {
    const cd = RockSimFinish[xml.number(xml.text(el, 'FinishCode'))];
    if (cd != null)
      found.push(cd);
  }
  for (const child of el.children ?? [])
    rockSimFinishes(child, insideTube || tube, found);
}

module.exports = {
  assignCd,
  fromOpenRocket,
  fromRockSim,
  fromRASAero,
};
