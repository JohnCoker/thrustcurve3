/*
 * Copyright 2026 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const DAY = 24 * 60 * 60;
const WEEK = 'public, max-age=' + (7 * DAY);

module.exports = {
  // permanent redirects
  '301': WEEK,
  // sitemap.xml and llms-full.txt
  sitemap: WEEK,
  // Express maxAge for files in public/
  public_ms: 30 * DAY * 1000,
};
