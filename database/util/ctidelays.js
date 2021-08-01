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

const designationToMinDelay = {};

function parseDelays() {
  const designations = Object.keys(CTI_DELAYS);
  designations.forEach(desig => {
    const raw = CTI_DELAYS[desig];
    let delays = raw.toLowerCase();
    delays = delays.replace(/^"/, '').replace(/"$/, '').replace(/\s+/g, '');
    delays = delays.replace(/,adjustable$/, '').replace(/\(fixed.*$/, '').replace(/(s|secs?|seconds?)$/, '');
    delays = delays.replace(/\?/, '-').replace(/(\d)to(\d)/, '$1-$2');

    // plugged
    if (delays == 'plugged') {
      designationToMinDelay[desig] = {
        raw: raw,
        style: 'plugged',
      };
      return;
    }
      

    // range
    let m = /^(\d+)-(\d+)$/.exec(delays);
    if (m) {
      designationToMinDelay[desig] = {
        raw: raw,
        style: 'range',
        min: Math.min(parseInt(m[1]), parseInt(m[2])),
      };
      return;
    }

    // fixed
    if (/^(\d+)$/.test(delays)) {
      if (/adjustable/.test(raw)) {
        designationToMinDelay[desig] = {
          raw: raw,
          style: 'adjustable',
          min: 2,
        };
      } else {
        designationToMinDelay[desig] = {
          raw: raw,
          style: 'fixed',
          min: parseInt(delays),
        };
      }
      return;
    }

    // list of values
    if (/^\d+,[\d,.]+$/.test(delays)) {
      designationToMinDelay[desig] = {
        raw: raw,
        style: 'list',
        min: delays.split(/[,.]/).reduce((p, n) => Math.min(p, n)),
      };
      return;
    }

    console.error('cannot parse delay', raw);
  });
  console.error('* parsed ' + Object.keys(designationToMinDelay).length + ' delays');
}

function motorUpdates(motors) {
  const designations = Object.keys(designationToMinDelay);
  designations.forEach(desig => {
    const spec = designationToMinDelay[desig];

    let motor = motors.find(m => m.designation == desig);
    let fixDesig = false;
    if (motor == null) {
      let cn = desig.replace(/^\d+/, '').replace(/-.*$/, '');
      let possible = motors.filter(m => m.commonName == cn);
      if (possible.length == 1) {
        motor = possible[0];
        fixDesig = true;
      } else {
        console.error('missing motor ' + desig + ' (' + possible.length + ' matches for common name ' + cn + ')');
        return;
      }
    }

    let delays;
    if (spec.style == 'plugged' || /-P$/.test(desig)) {
      delays = 'P';
    } else if (spec.style == 'fixed') {
      if (/-\d+A$/.test(desig)) {
        console.error('fixed delay (' + spec.raw + ') for ' + desig);
        return;
      }
      delays = spec.min;
    } else {
      let m = /-(\d+)A$/.exec(desig);
      if (!m) {
        console.error('adjustable delay (' + spec.raw + ') for ' + desig);
        return;
      }
      let max = parseInt(m[1]);
      let min = spec.min;
      if (!(min > 0)) {
        console.error('missing minimum value (' + spec.raw + ') for ' + desig);
        return;
      }
      let adjust;
      if (motor.diameter <= 0.038)
        adjust = [0, 3, 5, 7, 9];
      else if (motor.diameter == 0.054)
        adjust = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      else {
        console.error('adjustable delay (' + spec.raw + ') for ' + Math.round(1000 * motor.diameter) + 'mm ' + motor.designation);
        return;
      }
      let list = [];
      adjust.forEach(d => {
        let s = max - d;
        if (s >= min)
          list.unshift(s);
      });
      delays = list.join(",");
    }
    if (fixDesig || delays != motor.delays) {
      let s = `db.motors.updateOne({ _id: ObjectId("${motor._id}") }, { $set: { `;
      if (fixDesig) {
        s += ` designation: "${desig}",`;
        if (/^HP/.test(motor.designation))
          s += ` altDesignation: "${motor.designation}",`;
      }
      if (delays != motor.delays)
        s += ` delays: "${delays}",`;
      s += ' }});';
      if (!fixDesig)
        s += ' // ' + desig;
      console.log(s);
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
                       $or: [
                         { _manufacturer: ctiId },
                         { _relatedMfr: ctiId },
                       ]
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

/**
 * Scraped from the CTI web site on July 27, 2021 by Robert Kieffer.
 *
 * https://gist.github.com/broofa/0814dcadefa50bdd7c9566afb3333462
 */
const CTI_DELAYS = {
  "26E31-15A": "\"15?6 seconds, adjustable\"",
  "24E22-13A": "\"13-4 seconds, adjustable\"",
  "25E75-17A": "\"17 seconds, adjustable\"",
  "53F70-14A": "\"14 - 5 s, adjustable\"",
  "50F51-13A": "\"13 - 4 s, adjustable\"",
  "75F51-12A": "\"12-3 seconds, adjustable\"",
  "68F240-15A": "\"15-7 seconds, adjustable\"",
  "60F50-13A": "\"13-4 seconds, adjustable\"",
  "74F85-15A": "\"15 seconds, adjustable\"",
  "73F30-6A": "\"7-2 seconds, adjustable\"",
  "68F79-13A": "\"13-4 seconds, adjustable\"",
  "143G150-13A": "\"13-4 seconds, adjustable\"",
  "137G127-14A": "\"14 seconds, adjustable\"",
  "114G100-14A": "\"14 seconds, adjustable\"",
  "142G117-11A": "\"11-4 seconds, adjustable\"",
  "140G145-15A": "\"15?6 seconds, adjustable \"",
  "144G65-8A": "\"8-3 seconds, adjustable\"",
  "139G107-12A": "\"12?3 seconds, adjustable\"",
  "131G84-10A": "\"10-2 seconds, adjustable\"",
  "56F31-12A": "\"12 - 3 s, adjustable\"",
  "55F29-12A": "\"12,9,7,5,3\"",
  "51F36-14A": "\"14,11,9,7,5\"",
  "41F36-11A": "\"11,8,6,4,2\"",
  "57F59-12A": "\"12,9,7,5,3\"",
  "53F32-12A": "\"12 - 3 s, adjustable\"",
  "56F120-14A": "\"14,11,9,7,5\"",
  "108G57-12A": "\"12,9,7,5,3\"",
  "107G83-14A": "\"14,11,9,7,5\"",
  "84G88-11A": "\"11,8,6,4,2\"",
  "116G126-13A": "\"13,10,8,6,4\"",
  "108G68-13A": "\"13,10.8.6.4\"",
  "93G80-14A": "\"14,11,9,7,5\"",
  "110G250-14A": "\"14,11,8,7,5\"",
  "164H90-12A": "\"12,9,7,5,3\"",
  "168H87-12A": "\"12,9,7,5,3\"",
  "138G106-14A": "\"14,11,9,7,5\"",
  "159G118-15A": "\"15,12,10,8,6\"",
  "163H133-14A": "\"14,11,9,7,5\"",
  "159G125-14A": "\"14,11,9,7,5\"",
  "125G131-14A": "\"14,11,9,7,5\"",
  "166H163-14A": "\"14,11,9,7,5\"",
  "168H54-10A": "\"10,7,5,3\"",
  "159G54-12A": "\"12,9,7,5,3\"",
  "168H410-14A": "\"14,11,9,7,5\"",
  "143G33-9A": "\"9 - 2 s, adjustable\"",
  "216H118-12A": "\"12,9,7,5,3\"",
  "176H123-12A": "\"12,9,7,5,3\"",
  "217H170-14A": "\"14,11,9,7,5\"",
  "207H151-15A": "\"15,12,10,8,6\"",
  "166H175-14A": "\"14,11,9,7,5\"",
  "229H255-14A": "\"14,11,9,7,5\"",
  "217H135-12A": "\"12,9,7,5,3\"",
  "186H42-10A": "\"10 - 1 s, adjustable\"",
  "268H140-11A": "\"11,8,6,4,2\"",
  "220H160-14A": "\"14,11,9,7,5\"",
  "261H200-14A": "\"14,11,9,7,5\"",
  "260H194-14A": "\"14,11,9,7,6\"",
  "206H237-13A": "\"13,10,8,6,4\"",
  "234H53-12A": "\"12 - 3 s, adjustable\"",
  "312H160-12A": "\"12,9,7,5,3\"",
  "348I204-13A": "\"13,10,8,6,4\"",
  "258H180-14A": "\"14,11,9,7,5\"",
  "315H255-14A": "\"14,11,9,7,5\"",
  "311H233-14A": "\"14,11,9,7,6\"",
  "253H295-13A": "\"13,10,8,6,4\"",
  "282H399-12A": "\"12,9,7,5,3\"",
  "298H159-15A": "\"15,12,10,8,6\"",
  "381I224-15A": "\"15,12,10,8,6\"",
  "305H226-14A": "\"14,11,9,7,5\"",
  "287H340-14A": "\"14,11,9,7,5\"",
  "382I243-13A": "\"13,10,8,6,4\"",
  "127G46-11A": "\"11,8,6,4,2\"",
  "150G50-15A": "\"15,12,10,8,6\"",
  "134G60-14A": "\"14,11,9,7,5\"",
  "117G69-14A": "\"14,11,9,7,5\"",
  "141G78-15A": "\"15,12,10,8,6\"",
  "129G79-13A": "\"13,10,8,6,4\"",
  "141G115-13A": "\"13,10,8,6,4\"",
  "137G58-13A": "\"13,10,8,6,4\"",
  "128G185-12A": "\"12,9,7,5,3\"",
  "266H125-12A": "\"12,9,7,5,3\"",
  "286H100-15A": "\"15,12,10,8,6\"",
  "261H120-14A": "\"14,11,9,7,5\"",
  "232H123-14A": "\"14,11,9,7,5\"",
  "276H152-15A": "\"15,12,10,8,6\"",
  "247H143-13A": "\"13,10,8,6,4\"",
  "273H225-14A": "\"14,11,9,7,5\"",
  "269H110-14A": "\"14,11,9,7,5\"",
  "255H400-13A": "\"13,10,8,6,4\"",
  "382I170-14A": "\"14,11,9,7,5\"",
  "396I195-16A": "\"16,13,11,9,7\"",
  "338I180-14A": "\"14,11,9,7,5\"",
  "413I236-17A": "\"17,14,12,10,8\"",
  "364I212-14A": "\"14,11,9,7,5\"",
  "408I345-15A": "\"15,12,10,8,6\"",
  "411I175-14A": "\"14,11,9,7,5\"",
  "320H565-14A": "\"14,11,9,7,5\"",
  "370I566-15A": "\"15,12,10,8,6\"",
  "395I55-9A": "\"9 - 2 s, adjustable\"",
  "512I285-15A": "\"15,12,10,8,6\"",
  "517I255-16A": "\"16,13,11,9,7\"",
  "434I223-14A": "\"14,11,9,7,5\"",
  "538I303-16A": "\"16,13,11,9,7\"",
  "486I287-15A": "\"15,12,10,8,6\"",
  "540I470-15A": "\"15,12,10,8,6\"",
  "548I242-15A": "\"15,12,10,8,6\"",
  "419I800-15A": "\"15,12,10,8,6\"",
  "648J285-15A": "\"15,12,10,8,6\"",
  "636I216-14A": "\"14,11,9,7,5\"",
  "649J335-15A": "\"15,12,10,8,6\"",
  "654J316-17A": "\"16 seconds, adjustable\"",
  "543I297-15A": "\"15,12,10,8,6\"",
  "658J357-17A": "\"17,14,12,10,8\"",
  "601I350-16A": "\"16,13,11,9,7\"",
  "634I540-16A": "\"16,13,11,9,7\"",
  "684J290-15A": "\"15,12,10,8,6\"",
  "567I125-10A": "\"10 ? 3, adjustable \"",
  "650J270-13A": "\"13,10,8,6,4\"",
  "644J94-P": "Plugged",
  "765J330-16A": "\"16,13,11,9,7\"",
  "774J410-16A": "\"16,13,11,9,7\"",
  "660J381-15A": "\"15,12,10,8,6\"",
  "784J425-16A": "\"16,13,11,9,7\"",
  "700J400-16A": "\"16,13,11,9,7\"",
  "819J354-16A": "\"16,13,11,9,7\"",
  "1008J420-15A": "\"15,12,10,8,6\"",
  "1115J530-15A": "\"15,12,10,8,6\"",
  "999J600-16A": "\"16,13,11,9,7\"",
  "848J520-16A": "\"16,13,11,9,7\"",
  "985J595-16A": "\"16,13,11,9,7\"",
  "896J580-17A": "\"17,14,12,10,8\"",
  "970J394-13A": "\"13,10,8,6,4\"",
  "1013J453-16A": "\"16 seconds, adjustable\"",
  "949J150-P": "Plugged",
  "502I120-15A": "5 to 15",
  "518I165-17A": "17 - 7 secs",
  "491I218-14A": "14 - 4 secs",
  "465I150-11A": "11 - 1 secs",
  "475I445-16A": "16 - 6 secs",
  "396I140-14A": "14 - 4 secs",
  "836J210-16A": "17 - 6 secs",
  "806J240-16A": "18 - 6 secs",
  "614I100-17A": "17-7 secs",
  "867J244-14A": "14 - 4 secs",
  "821J430-18A": "18 - 8 secs",
  "838J293-13A": "13 - 3 secs",
  "716J280-16A": "19 - 6 secs",
  "747J1055-17A": "20 - 6 secs",
  "683J250-15A": "16 - 6 secs",
  "699J145-19A": "\"19 - 9 s, adjustable\"",
  "1195J295-16A": "21 - 6 secs",
  "1190J355-17A": "22 - 6 secs",
  "1261J449-15A": "15 - 5 secs",
  "1281K360-13A": "13 - 3 secs",
  "1266J760-19A": "19 - 9 secs",
  "1211J140-P": "Plugged",
  "1043J380-16A": "23 - 6 secs",
  "1092J1520-17A": "24 - 6 secs",
  "1016J360-15A": "15 - 5 secs",
  "1635K445-17A": "25 - 6 secs",
  "1526K160-6": "6 secs (Fixed Delay Time)",
  "1597K400-14A": "14 - 4 secs",
  "1596K500-18A": "26 - 6 secs",
  "1874K740-18A": "18 - 8 secs",
  "1633K940-18A": "18 - 8 secs",
  "1711K520-17A": "\"17 - 7 s, adjustable\"",
  "1679K630-15A": "15 - 5 secs",
  "1412K530-16A": "27 - 6 secs",
  "1408K2045-17A": "28 - 6 secs",
  "1364K454-19A": "19 - 10 secs",
  "2060K570-17A": "29 - 6 secs",
  "1990K490-16A": "16 - 6 secs",
  "1994K635-17A": "30 - 6 secs",
  "2108K780-15A": "15 - 5  secs",
  "1750K650-16A": "31 - 6 secs",
  "2014K1200-16A": "32 - 6 secs",
  "2130K600-17A": "\"17 - 7 s, adjustable\"",
  "1997K650-21A": "\"21 seconds, adjustable\"",
  "2021K261-P": "Plugged",
  "1654K515-16A": "16 - 6 secs",
  "2437K660-17A": "33 - 6 secs",
  "2398K590-15A": "34 - 6 secs",
  "2285K260-P": "Plugged",
  "2352K750-18A": "35 - 6 secs",
  "2383K820-17A": "17 - 7 secs",
  "2372K1440-17A": "36 - 6 secs",
  "2377K711-18A": "\"18 - 8 s, adjustable\"",
  "2010K675-18A": "18 - 8 secs",
  "2765L730-P": "37 - 6 secs",
  "2546K300-P": "Plugged",
  "3147L935-P": "Plugged",
  "2772L640-P": "Plugged",
  "2788L1030-P": "38 - 6 secs",
  "2771L990-P": "Plugged",
  "2833L805-P": "Plugged",
  "2304K815-P": "Plugged",
  "2645L265-P": "Plugged",
  "1099J325-P": "Plugged",
  "1025J475-P": "Plugged",
  "1196J745-P": "Plugged",
  "932J1365-P": "Plugged",
  "1079J395-P": "Plugged",
  "1109J440-P": "Plugged",
  "1483K455-P": "Plugged",
  "1379K665-P": "Plugged",
  "1581K935-P": "Plugged",
  "1176J1720-P": "Plugged",
  "1422K535-P": "Plugged",
  "1233J475-P": "Plugged",
  "1852K580-P": "Plugged",
  "1725K855-P": "Plugged",
  "1951K1250-P": "Plugged",
  "1806K670-P": "Plugged",
  "1531K610-P": "Plugged",
  "1791K710-P": "Plugged",
  "2665L985-P": "Plugged",
  "2730L1276-P": "Plugged",
  "2551K1130-P": "Plugged",
  "2245K1075-P": "Plugged"
};

parseDelays();
buildUpdates();

