/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const fs = require('fs');

// https://github.com/monperrus/crawler-user-agents/
var crawlers = JSON.parse(fs.readFileSync(__dirname + '/crawler-user-agents.json', 'utf8'));
crawlers.forEach(function(o) {
  o.regexp = new RegExp(o.pattern, 'i');
  o.hits = 0;
});

function match(ua) {
  if (ua == null || ua === '' || ua == '-')
    return true;

  for (var i = 0; i < crawlers.length; i++) {
    if (crawlers[i].regexp.test(ua)) {
      crawlers[i].hits++;
      return true;
    }
  }
  return false;
}

/**
 * <p>The crawlers module contains a small database of robot user agents which is
 * consulted to determine if the current request is from a crawler/robot/spider.</p>
 *
 * <p>The short list of bot agents is from
 * <a href="https://github.com/monperrus/crawler-user-agents">crawler-user-agents</a>.</p>
 *
 * @module crawlers
 */
module.exports = {
  /**
   * Test whether a specified user agent is a known robot.
   * If the user agent is empty or missing, that counts as a bot.
   * @function
   * @param {string} ua user agent string
   * @return {boolean} true if known bot
   */
  match: match,

  /**
   * The list of known robots.
   * @member {object[]}
   */
  all: crawlers
};
