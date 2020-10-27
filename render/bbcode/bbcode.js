/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const MIME_TYPE = 'text/html';

function makeURL(s) {
  s = s.trim().replace(/"/g, '&quot;');
  if (!/^[a-z]+:/.test(s))
    s = 'http://' + s;
  return s;
}

function buildLink(url, anchor) {
  if (anchor == null || anchor === '') {
    anchor = url;
    if (!/^http/.test(anchor))
      anchor = anchor.replace(/^[a-z]+:/, '');
  }

  return '<a href="' + makeURL(url) + '">' + expandTags(anchor) + '</a>';
}

function expandTags(s) {
  s = s.replace(/\[b\]([^\[]*)\[\/b\]/gi, function(whole, body) {
        return '<b>' + expandTags(body) + '</b>';
      })
      .replace(/\[i\]([^\[]*)\[\/i\]/gi, function(whole, body) {
        return '<i>' + expandTags(body) + '</i>';
      })
      .replace(/\[tt\]([^\[]*)\[\/tt\]/gi, function(whole, body) {
        return '<code>' + expandTags(body) + '</code>';
      })
      .replace(/\[big\]([^\[]*)\[\/big\]/gi, function(whole, body) {
        return '<big>' + expandTags(body) + '</big>';
      })
      .replace(/\[small\]([^\[]*)\[\/small\]/gi, function(whole, body) {
        return '<small>' + expandTags(body) + '</small>';
      })
      .replace(/\[url\]([^\[]*)\[\/url\]/gi, function(whole, url) {
        return buildLink(url);
      })
      .replace(/\[link\]([^\[]*)\[\/link\]/gi, function(whole, url) {
        return buildLink(url);
      })
      .replace(/\[email\]([^\[]*)\[\/email\]/gi, function(whole, email) {
        return buildLink('mailto:' + email);
      })
      .replace(/\[url=([^\]]*)\]([^\[]*)\[\/url\]/gi, function(whole, url, anchor) {
        return buildLink(url, anchor);
      })
      .replace(/\[link=([^\]]*)\]([^\[]*)\[\/link\]/gi, function(whole, url, anchor) {
        return buildLink(url, anchor);
      })
      .replace(/\[email=([^\]]*)\]([^\[]*)\[\/email\]/gi, function(whole, email, anchor) {
        return buildLink('mailto:' + email, anchor);
      });

  return s;
}

function buildList(block) {
  var tag, body, items,
      t, i;

  // determine which style list and remove [list] markup
  if (/^\[list=\d/.test(block))
    tag = 'ol';
  else
    tag = 'ul';
  block = block.replace(/\[\/?list[^\]]*\]/gi, '');

  body = '<' + tag + '>';

  // split the list into items and process each one
  items = block.trim().split(/\[\*\]/);
  for (i = 0; i < items.length; i++) {
    t = items[i].trim();
    if (t === '')
      continue;
    body += '\n  <li>' + expandTags(t) + '</li>'; 
  }

  body += '\n</' + tag + '>\n';
  return body;
}

function buildPar(block) {
  block = block.trim();
  return '<p>' + expandTags(block) + '</p>\n';
}

function render(input) {
  var blocks, output, block, i;

  if (input == null)
    return '';
  input = input.trim();
  if (input === '')
    return '';

  output = '';

  /*
   * Break the input into blocks, separated by blank lines.
   * We generate blank lines around block tags like [list].
   */
  input = input.replace(/\[list/gi, "\n\n$&")
               .replace(/\[\/list\]/gi, "$&\n\n");
  blocks = input.split(/([ \t\r]*\n){2,}/);
  for (i = 0; i < blocks.length; i++) {
    block = blocks[i].trim();
    if (block === '')
      continue;

    // replace dangerous characters
    block = block.replace(/&/g, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;');

    if (/^\[list/.test(block))
      output += buildList(block);
    else
      output += buildPar(block);
  }

  return output;
}

/**
 * <p>The bbcode module converts <a href="https://en.wikipedia.org/wiki/BBCode">BBCode</a>
 * into HTML for display.</p>
 *
 * <p>Only a small number of tags are supported since BBCode is only used in notes.</p>
 * <ul>
 * <li><code>[b]</code> bold</li>
 * <li><code>[i]</code> italic</li>
 * <li><code>[link]</code> web link (also <code>[url]</code></li>
 * <li><code>[list]</code> bulleted or numbered list</li>
 * </ul>
 *
 * @module bbcode
 */
module.exports = {
  /**
   * The MIME type for HMTL.
   * @member string
   */
  format: MIME_TYPE,

  /**
   * Render BBCode as HTML.
   * @param {string} input BBCode block
   * @return {number} HTML result
   */
  render: render
};

