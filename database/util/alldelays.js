/*
 * Copyright 2021 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var process = require('process'),
    async = require('async'),
    mysql = require('mysql'),
    mongoose = require('mongoose'),
    schema = require('../schema');

function motorUpdates(motors) {
  motors.forEach(motor => {
    let delays = motor.delays.replace(/\s+/g, '').toUpperCase();
    if (delays !== motor.delays) {
      if (delays === '')
        delays = null;
    }
    if (delays != null) {
      delays = delays.replace(/^(.*)\b0-(\d+)$/, "$1$2");
      let parts = delays.split(/[^A-Z0-9]+/).filter(p => p !== '');
      parts = parts.filter((p, i) => parts.indexOf(p) === i);
      if (parts.length < 1)
        delays = null;
      else {
        parts.sort((l, r) => {
          let li = parseInt(l);
          let ri = parseInt(r);
          if (li >= 0 && ri >= 0)
            return li - ri;
          if (li >= 0)
            return -1;
          if (ri >= 0)
            return 1;
          if (l == "P")
            return 1;
          if (r == "P")
            return -1;
          if (l == "L")
            return 1;
          if (r == "L")
            return -1;
          if (l == "M")
            return 1;
          if (r == "M")
            return -1;
          console.error(`delay values "${li}" / "${ri}" invalid`);
        });
        delays = parts.join(",");
      }
      if (delays !== motor.delays) {
        let s = `db.motors.updateOne({ _id: ObjectId("${motor._id}") }, { $set: { delays: `;
        if (delays == null)
          s += "null";
        else
          s += '"' + delays + '"';
      s += ' }}); // ' + motor.designation + ' (' + motor.delays + ')';
        console.log(s);
      }
    }
  });
}

function buildUpdates() {
  mongoose.Promise = global.Promise;
  mongoose.connect('mongodb://localhost/thrustcurve',
                   {},
                   function(err) {
                     if (err) {
                       console.error('! unable to connect to MongoDB');
                       return;
                     }
                     const motors = schema.MotorModel(mongoose);
                     const ctiId = mongoose.Types.ObjectId('5f4294d200050d0000000004');
                     motors.find({
                       delays: { $ne: null },
                     }).exec(function(err, results) {
                       if (err) {
                         console.error('! unable to query motors');
                         return;
                       }
                       console.error('* queried ' + results.length + ' motors');
                       console.log('use thrustcurve;');
                       motorUpdates(results);
                       mongoose.disconnect();
                     });
                   });
}

buildUpdates();
