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
    let parts = motor.delays.toUpperCase().replace(/\b0-(\d+)\b/g, "$1").split(",");
    parts = parts.filter((p, i) => parts.indexOf(p) === i);
    let seconds = parts.map(p => {
      if (parseInt(p) >= 0)
        return p;
      if (p == "P")
        return p;
      if (p == "S")
        return "6";
      if (p == "M")
        return "10";
      if (p == "L")
        return "14";
      if (p == "X" || p == "XL")
        return "18";
      console.error(`invalid delays "${motor.delays}" for ${motor.designation}`);
      return null;
    });
    if (motor.type == 'reload' && motor.diameter <= 0.055)
      seconds = adjustable(seconds, 4);
    else if (motor.type == 'SU' && motor.diameter <= 0.055)
      seconds = adjustable(seconds, 6);
    seconds = seconds.filter((p, i) => seconds.indexOf(p) === i);
    seconds.sort((l, r) => {
      let li = parseInt(l);
      let ri = parseInt(r);
      if (li >= 0 && ri >= 0)
        return li - ri;
      if (li >= 0)
        return -1;
      if (l == r)
        return 0;
      return 1;
    });
    let delays = seconds.join(",");
    if (delays != motor.delays) {
      let s = `db.motors.updateOne({ _id: ObjectId("${motor._id}") }, { $set: { delays: "${seconds}" } })`;
      s += ' // ' + motor.designation + ' (' + motor.delays + ') ' + Math.round(motor.diameter * 1000) + 'mm';
      console.log(s);
    }
  });
}

function adjustable(seconds, min) {
  let remove = [2, 4, 6, 8];
  let add = [];
  seconds.forEach(d => {
    let base = parseInt(d);
    if (base > min) {
      remove.forEach(r => {
        let s = base - r;
        if (s >= min && seconds.indexOf(s.toFixed()) < 0 && add.indexOf(s.toFixed()) < 0)
          add.push(s.toFixed());
      });
    }
  });
  return seconds.concat(add);
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
                     const atId = mongoose.Types.ObjectId('5f4294d200050d0000000001');
                     motors.find({
                       _manufacturer: atId,
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

