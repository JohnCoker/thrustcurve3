/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const process = require('process'),
      fs = require('fs'),
      readline = require('readline'),
      async = require('async'),
      mongoose = require('mongoose'),
      schema = require('../schema'),
      crawlers = require('../../lib/crawlers');

/**
 * <p>The <b>accesslog</b> module is a main program for loading Apache access logs
 * from the old web site as entries in the MotorView model,
 * which is used to track popular motors.</p>
 *
 * <p>We expect the input files to be in the Apache
 * <a href="https://httpd.apache.org/docs/2.2/en/logs.html">combined log format</a>,
 * using the date, path, referer and user agent in generating views.</p>
 *
 * <p>The user agent is used to weed out bot hits, using the short list from
 * <a href="https://github.com/monperrus/crawler-user-agents">crawler-user-agents</a>.</p>
 *
 * <p>The referer [sic] is used to guess at the source of the view.</p>
 *
 * <p>The year can be adjusted to the current one to make old records current using the
 * <code>--fixyear</code> option.</p>
 *
 * @module accesslog
 */
module.exports = {};

const USAGE = 'usage: accesslog [ --fixyear ] filename ...';

if (!process.argv || process.argv.length < 3) {
  console.log(USAGE);
  process.exit(0);
}
let files = [];
let fixyear = false;
let badarg = false;
process.argv.slice(2).forEach(arg => {
  if (arg === '-y' || arg === '--fixyear') {
    fixyear = true;
  } else if (/^-/.test(arg)) {
    badarg = true;
  } else {
    if (!fs.existsSync(arg) || !fs.statSync(arg).isFile()) {
      console.error('accesslog: argument "' + arg + '" not a file"');
      badarg = true;
    }
    files.push(arg);
  }
});
if (files.length < 1 || badarg) {
  console.error(USAGE);
  process.exit(1);
}

function parseDate(s) {
  let parts = /^0?([0-9]+)\/([A-Z][a-z]+)\/([0-9]+):0?([0-9]+):0?([0-9]+):0?([0-9]+) /i.exec(s);
  if (parts == null || parts.length < 7)
    return;

  let y = parseInt(parts[3]);
  if (fixyear)
    y = new Date().getFullYear();

  let m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(parts[2]);
  if (m < 0)
    return;

  return new Date(y, m, parseInt(parts[1]),
                  parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6]));
}

const LogRegex = /^([0-9a-f.:]+) - - \[([0-9]{2}\/[a-z]{3}\/[0-9]{4}:[0-9]{2}:[0-9]{2}:[0-9]{2}[^\]]*)\] "((?:[^"\\]|\\.)*)" ([0-9]+) (-|[0-9]+) "((?:[^"\\]|\\.)*)" "((?:[^"\\]|\\.)*)"/i;

let Motor, MotorView;
let motorCache = {};
let total = 0;

function load(fn, cb) {
  let rl, entries, lineNum, bots, errors, badIds, inserted;

  console.log('* reading file ' + fn + ' ...');
  rl = readline.createInterface({
    input: fs.createReadStream(fn),
    output: null,
    terminal: false
  });
  rl.resume();

  let addView = function(entry, motor) {
    if (motor == null) {
      badIds++;
    } else {
      let mv = new MotorView({
        createdAt: entry.date,
        updatedAt: entry.date,
        _motor: motor._id,
        source: entry.source
      });
      MotorView.create(mv);
      inserted++;
    }
  };

  entries = [];
  lineNum = errors = bots = badIds = inserted = 0;
  rl.on('line', function(line) {
    let parsed, entry;

    lineNum++;
    parsed = LogRegex.exec(line);
    if (parsed == null || parsed.length < 5) {
      errors++;
      if (errors > 10) {
        rl.close();
        return;
      }
      console.error('! ' + fn + ', line ' + lineNum + ' incorrect format');
      return;
    }

    // make sure the motor was found
    if (parsed[4] != '200')
      return;

    // parse date
    let date = parseDate(parsed[2]);
    if (date == null) {
      errors++;
      if (errors > 10) {
        rl.close();
        return;
      }
      console.error('! ' + fn + ', line ' + lineNum + ' invalid date "' + parsed[2] + '"');
      return;
    }

    // make sure this is a motor display page
    let get = /^GET \/motorsearch\.jsp\?id=([0-9]+)/.exec(parsed[3]);
    if (get == null)
      return;

    // check the user agent
    let agent = parsed[7];
    if (agent === '' || agent === '-' || crawlers.match(agent)) {
      bots++;
      return;
    }

    // we have a view entry
    entry = {
      date: date,
      oldId: get[1],
    };
    entries.push(entry);

    // guess source from referer
    let referer = parsed[6];
    if (referer && referer != '-') {
      if (/thrustcurve\.org/.test(referer)) {
        if (/motorguide\.jsp/.test(referer))
          entry.source = 'guide';
        else if (/motorsearch\.jsp/.test(referer))
          entry.source = 'search';
        else if (/browser\.jsp/.test(referer))
          entry.source = 'browser';
        else if (/mfrsearch\.jsp/.test(referer))
          entry.source = 'manufacturer';
        else if (/updates\.jsp/.test(referer))
          entry.source = 'updates';
      }
    }

    // look up the motor record and add the entry
    if (motorCache.hasOwnProperty(entry.oldId)) {
      addView(entry, motorCache[entry.oldId]);
    } else {
      Motor.findOne({ migratedId: parseInt(entry.oldId) }, function(err, motor) {
        motorCache[entry.oldId] = motor;
        if (err) {
          console.error('! error trying to find motor ' + entry.oldId);
          console.error(err);
          errors++;
        } else {
          addView(entry, motor);
        }
      });
    }
  });
  rl.on('close', function() {
    console.log('* - ' + entries.length + ' entries read on ' + lineNum + ' lines (excluding ' + bots + ' bots)');
    setTimeout(function() {
      total += inserted;
      console.log('* - ' + inserted + ' views inserted (' + badIds + ' bad motor IDs)');
      if (errors > 0)
        cb(errors + ' loading errors', 'loaded views');
      else
        cb(null, 'loaded views');
    }, 2000);
  });
}

// open DB
let steps = [
  function(cb) {
    mongoose.Promise = global.Promise;
    mongoose.connect('mongodb://localhost/thrustcurve', {
    }, function(err) {
      if (err) {
        console.error('! unable to connect to MongoDB');
      } else {
        console.log('* connected to MongoDB on localhost');
        Motor = schema.MotorModel(mongoose);
        MotorView = schema.MotorViewModel(mongoose);
      }
      cb(err, 'connect to MongoDB');
    });
  }
];

// load each log file
files.forEach(fn => {
  steps.push(function(cb) {
    load(fn, cb);
  });
});

// close DB
steps.push(function(cb) {
  mongoose.disconnect();
  cb(null, 'closed databases');
});

async.series(steps, function(err, _result) {
  if (err) {
    if (err !== true)
      console.error('! ' + err.message || err);
  } else {
    console.log('* all finished (' + total + ' views)');
  }
});

