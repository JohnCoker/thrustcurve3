/*
 * Copyright 2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

function rgb2hsl(...args) {
  let r, g, b;
  if (args.length == 1) {
    let m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/.exec(args[0]);
    if (m == null)
      return;
    r = parseInt(m[1], 16);
    g = parseInt(m[2], 16);
    b = parseInt(m[3], 16);
  } else if (args.length == 3) {
    r = clamp(args[0], 0, 255);
    g = clamp(args[1], 0, 255);
    b = clamp(args[2], 0, 255);
  } else
    return;

  r /= 255;
  g /= 255;
  b /= 255;
  let cmin = Math.min(r,g,b),
      cmax = Math.max(r,g,b),
      delta = cmax - cmin,
      h = 0;
  if (delta == 0) {
    // gray
    h = 0;
  } else if (cmax == r) {
    // red is max
    h = ((g - b) / delta) % 6;
  } else if (cmax == g) {
    // green is max
    h = (b - r) / delta + 2;
  } else {
    // blue is max
    h = (r - g) / delta + 4;
  }

  h = Math.round(h * 60);
  if (h < 0)
    h += 360;

  let l = (cmax + cmin) / 2;
  let s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return [round(h, 1), round(s, 2), round(l, 2)];
}

function rgb2css(r, g, b) {
  if (arguments.length != 3)
    return;
  r = clamp(r, 0, 255);
  g = clamp(g, 0, 255);
  b = clamp(b, 0, 255);
  if (r < 1/128 && g < 1/128 && b < 1/128)
    return 'black';
  if (r > 255-1/128 && g > 255-1/128 && b > 255-1/128)
    return 'white';
  return '#' + hex2(r) + hex2(g) + hex2(b);
}

function hsl2rgb(h, s, l) {
  if (arguments.length != 3)
    return;
  while (h >= 360)
    h -= 360;
  h = clamp(h, 0, 360);
  s = clamp(s, 0, 1);
  l = clamp(l, 0, 1);

  let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c / 2,
      r, g, b;
  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return [r, g, b];
}

function hsl2css(h, s, l) {
  if (arguments.length != 3)
    return;
  while (h >= 360)
    h -= 360;
  h = clamp(h, 0, 360);
  s = clamp(s, 0, 1);
  l = clamp(l, 0, 1);

  if (l >= 1)
    return 'white';
  if (l <= 0)
    return 'black';
  return 'hsl(' + h.toFixed() + ', ' + (s * 100).toFixed() + '%, ' + (l * 100).toFixed() + '%)';
}

function hueCircle(start, n) {
  const hsl = rgb2hsl(start);
  if (hsl == null)
    return;
  const [h0, s, l] = hsl;
  if (h0 == null)
    return;

  let results = [];
  results.push(start);
  const dh = 360 / n;
  for (let i = 1; i < n; i++)
    results.push(rgb2css.apply(undefined, hsl2rgb(h0 + i * dh, s, l)));
  return results;
}

function clamp(v, min, max) {
  if (typeof v === 'string')
    v = parseFloat(v);
  if (typeof v !== 'number' || !isFinite(v) || v < min)
    return min;
  if (v > max)
    return max;
  return v;
}

function round(v, digits)
{
  let scale = digits > 0 ? Math.pow(10, digits) : 1;
  return Math.round(v * scale) / scale;
}

function hex2(n) {
  let s = n.toString(16);
  if (s.length < 2)
    s = '0' + s;
  return s;
}

/**
 * <p>The color module contains methods for formatting and converting CSS color values.
 *
 * <p>These functions all return undefined if the number of arguments is wrong and convert
 * and clamp argument values to the expected range.
 *
 * @module color
 */
module.exports = {
  /**
   * Convert an RGB color into HSL (hue, saturation, lightness) values.
   * A single argument an RGB color as a 6-digit hex value. The arguments are
   * the individual red, green, blue values in [0..255].
   * @function
   * @return {number[]} hue [0..360), saturation [0..1], lightness [0..1]
   */
  rgb2hsl,

  /**
   * Convert an RGB color triple into a CSS color spec.
   * @function
   * @param {number} red value [0..255]
   * @param {number} green value [0..255]
   * @param {number} blue value [0..255]
   * @return {string} CSS color spec
   */
  rgb2css,

  /**
   * Convert an HSL color triple into RGB (red, green, blue) values.
   * @function
   * @param {number} hue degree value [0..360)
   * @param {number} saturation fraction in [0..1]
   * @param {number} lightness fraction in [0..1]
   * @return {number[]} red, green, blue values in [0..255]
   */
  hsl2rgb,

  /**
   * Convert an HSL color triple into a CSS color spec.
   * @function
   * @param {number} hue degree value [0..360)
   * @param {number} saturation fraction in [0..1]
   * @param {number} lightness fraction in [0..1]
   * @return {string} CSS color spec
   */
  hsl2css,

  /**
   * Produce a set of hues around the color wheel including the specified
   * value, all with the same saturation and lightness.
   * @function
   * @param {string} start starting RGB color
   * @param {number} n number of results
   * @return {string[]} CSS color specs
   */
  hueCircle,
};
