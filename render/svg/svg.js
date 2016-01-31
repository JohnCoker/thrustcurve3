/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const MIME_TYPE = 'image/svg+xml';

function contentXML(s) {
  if (s == null || s === '')
    return '';

  s = s.toString();
  return s.replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
}

function attributeXML(s) {
  if (s == null || s === '')
    return '""';

  s = s.toString();
  return '"' +
         s.replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;') +
         '"';
}

class Image {
  constructor(width, height) {
    this._width = width;
    this._height = height;
    this._fill = this._stroke = 'black';
    this._thickness = 1;
    this._align = 'start';
    this._fontSize = '10pt';
    this._fontFamily = 'Helvetica';
    this._path = [];
    this._text = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none">\n';
  }

  static get format() {
    return MIME_TYPE;
  }

  get format() {
    return MIME_TYPE;
  }

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }

  get fillStyle() {
    return this._fill;
  }

  set fillStyle(v) {
    this._fill = v;
  }

  get strokeStyle() {
    return this._fill;
  }

  set strokeStyle(v) {
    this._stroke = v;
  }

  get lineWidth() {
    return this._thickness;
  }

  set lineWidth(v) {
    this._thickness = v;
  }

  get textAlign() {
    return this._align;
  }

  set textAlign(v) {
    if (v == 'end' || v == 'right')
      this._align = 'end';
    else if (v == 'middle' || v == 'center')
      this._align = 'middle';
    else
      this._align = 'start';
  }

  get font() {
    var s = '';

    if (this._fontStyle)
      s += this._fontStyle;

    if (this._fontWeight) {
      if (s)
	s += ' ';
      s += this._fontWeight;
    }

    if (this._fontSize) {
      if (s)
	s += ' ';
      s += this._fontSize;
    }

    if (this._fontFamily) {
      if (s)
	s += ' ';
      s += this._fontFamily;
    }

    return s;
  }

  set font(v) {
    var match;

    if (v == null || v === '') {
      this._fontStyle = undefined;
      this._fontWeight = undefined;
      this._fontSize = undefined;
      this._fontFamily = undefined;
      return;
    }

    // strip off style prefix
    match = /(normal|italic|oblique)/i.exec(v);
    if (match) {
      this._fontStyle = match[1];
      v = v.substring(match.index + match[1].length).trim();
    } else {
      this._fontStyle = undefined;
    }

    // strip off weight
    match = /(bold|lighter|bolder)/i.exec(v);
    if (match) {
      this._fontWeight = match[1];
      v = v.substring(match.index + match[1].length).trim();
    } else {
      this._fontWeight = undefined;
    }

    // font size
    match = /([0-9.]+(pt|px|em))/i.exec(v);
    if (match) {
      this._fontSize = match[1];
      v = v.substring(match.index + match[1].length).trim();
    } else {
      this._fontSize = undefined;
    }

    // anything else is the font family
    if (v)
      this._fontFamily = v;
    else
      this._fontFamily = undefined;
  }

  strokeRect(x, y, width, height) {
    this._text += ' <rect x=' + attributeXML(x) + ' y=' + attributeXML(y) + ' width=' + attributeXML(width) + ' height=' + attributeXML(height);

    if (this._thickness > 0)
      this._text += ' stroke-width=' + attributeXML(this._thickness);
    if (this._stroke)
      this._text += ' stroke=' + attributeXML(this._stroke);

    this._text += ' fill="none" />\n';
  }

  fillRect(x, y, width, height) {
    this._text += ' <rect x=' + attributeXML(x) + ' y=' + attributeXML(y) + ' width=' + attributeXML(width) + ' height=' + attributeXML(height);

    if (this._fill)
      this._text +=' fill=' + attributeXML(this._fill);

    this._text += ' stroke="none" />\n';
  }

  strokeCircle(x, y, r) {
    this._text += ' <circle cx=' + attributeXML(x) + ' cy=' + attributeXML(y) + ' r=' + attributeXML(r);

    if (this._thickness > 0)
      this._text += ' stroke-width=' + attributeXML(this._thickness);
    if (this._stroke)
      this._text += ' stroke=' + attributeXML(this._stroke);

    this._text += ' fill="none" />\n';
  }

  fillCircle(x, y, r, color) {
    this._text += ' <circle cx=' + attributeXML(x) + ' cy=' + attributeXML(y) + ' r=' + attributeXML(r);

    if (this._fill)
      this._text +=' fill=' + attributeXML(this._fill);

    this._text += ' stroke="none" />\n';
  }

  beginPath() {
    this._path = [];
  }

  moveTo(x, y) {
    this._path.push({ c: 'm', x: x, y: y });
  }

  lineTo(x, y) {
    this._path.push({ c: this._path.length > 0 ? 'l' : 'm', x: x, y: y });
  }

  closePath() {
    var i;
    if (this._path.length > 1) {
      // find prior moveTo
      for (i = this._path.length - 1; i > 0; i--) {
        if (this._path[i].c == 'm')
          break;
      }
      this._path.push({ c: 'l', x: this._path[i].x, y: this._path[i].y });
    }
  }

  stroke() {
    var start, i;

    start = 0;
    while (start < this._path.length) {
      // draw next shape (up to next moveTo)
      this._text += ' <polyline points="';
      for (i = start; i < this._path.length && (i == start || this._path[i].c == 'l'); i++) {
        if (i > start)
          this._text += ' ';
        this._text += this._path[i].x + ',' + this._path[i].y;
      }
      this._text += '"';

      if (this._thickness > 0)
        this._text += ' stroke-width=' + attributeXML(this._thickness);
      if (this._stroke)
        this._text += ' stroke=' + attributeXML(this._stroke);

      this._text += ' fill="none" />\n';

      // on to next shape
      start = i;
    }
  }

  fill() {
    var start, i;

    start = 0;
    while (start < this._path.length) {
      // draw next shape (up to next moveTo)
      this._text += ' <polyline points="';
      for (i = start; i < this._path.length && (i == start || this._path[i].c == 'l'); i++) {
        if (i > start)
          this._text += ' ';
        this._text += this._path[i].x + ',' + this._path[i].y;
      }
      this._text += '"';

      if (this._fill)
        this._text += ' fill=' + attributeXML(this._fill);

      this._text += ' stroke="none" />\n';

      // on to next shape
      start = i;
    }
  }

  fillText(str, x, y) {
    this._text += ' <text x=' + attributeXML(x) + ' y=' + attributeXML(y);

    if (this._align)
      this._text += ' text-anchor=' + attributeXML(this._align);
    if (this._fill)
      this._text += ' fill=' + attributeXML(this._fill);
    if (this._fontStyle)
      this._text += ' font-style=' + attributeXML(this._fontStyle);
    if (this._fontWeight)
      this._text += ' font-weight=' + attributeXML(this._fontWeight);
    if (this._fontSize)
      this._text += ' font-size=' + attributeXML(this._fontSize);
    if (this._fontFamily)
      this._text += ' font-family=' + attributeXML(this._fontFamily);

    this._text += '>';
    this._text += contentXML(str);
    this._text += '</text>\n';
  }

  fillTextVert(str, x, y) {
    this._text += ' <text x=' + attributeXML(x) + ' y=' + attributeXML(y) + ' transform="rotate(-90 ' + x + ',' + y + ')"';

    if (this._align)
      this._text += ' text-anchor=' + attributeXML(this._align);
    if (this._fill)
      this._text +=' fill=' + attributeXML(this._fill);
    if (this._fontStyle)
      this._text += ' font-style=' + attributeXML(this._fontStyle);
    if (this._fontWeight)
      this._text += ' font-weight=' + attributeXML(this._fontWeight);
    if (this._fontSize)
      this._text += ' font-size=' + attributeXML(this._fontSize);
    if (this._fontFamily)
      this._text += ' font-size=' + attributeXML(this._fontFamily);

    this._text += '>';
    this._text += contentXML(str);
    this._text += '</text>\n';
  }

  render() {
    return this._text + '</svg>';
  }
}

/**
 * <p>The svg module draws scalable vector graphics images.</p>
 *
 * <p>The Image class interface takes inspiration from the HTML5 canvas, although
 * it only implements the stuff needed for rendering graphs.</p>
 *
 * @module graphs
 */
module.exports = {
  /**
   * The MIME type for SVG images.
   * @member string
   */
  format: MIME_TYPE,

  /**
   * Construct an image object on which we can draw.
   * @param {number} width
   * @param {number} height
   */
  Image: Image,
};

