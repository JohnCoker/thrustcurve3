/*
 * Copyright 2026 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

function child(el, name) {
  const want = name.toLowerCase();
  return el?.children?.find(c => c.name?.toLowerCase() === want);
}

function text(el, name) {
  const s = child(el, name)?.content?.trim();
  return s || undefined;
}

function number(value) {
  const m = String(value ?? '').trim().match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/);
  const n = m == null ? NaN : Number(m[0]);
  return Number.isFinite(n) ? n : undefined;
}

function flag(value) {
  return ['1', 'true', 'yes'].includes(String(value ?? '').trim().toLowerCase());
}

function* descendants(el) {
  for (const child of el?.children ?? []) {
    yield child;
    yield* descendants(child);
  }
}

module.exports = {
  child,
  text,
  number,
  flag,
  descendants,
};
