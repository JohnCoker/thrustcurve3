/*
 * Copyright 2016-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      metadata = require('../lib/metadata'),
      units = require("../lib/units"),
      locals = require('./locals.js'),
      authorized = require('./authorized.js'),
      csv = require('../render/csv'),
      helpers = require('../lib/helpers');

const defaults = {
  layout: 'admin',
};

const certOrgList = '/admin/certorgs/';

/*
 * /admin/certorgs/
 * List the certification organizations, renders with admin/certorglist.hbs template
 */
router.get(certOrgList, authorized('metadata'), function(req, res, next) {
  req.db.CertOrg.find(req.success(function(certorgs) {
    res.render('admin/certorglist', locals(req, defaults, {
      title: 'Certification Organizations',
      certorgs: certorgs,
      newLink: '/admin/certorgs/new'
    }));
  }));
});


/*
 * /admin/certorgs/:id
 * Edit a certification organizations, renders with admin/certorgedit.hbs template
 */
router.get('/admin/certorgs/:id', authorized('metadata'), function(req, res, next) {
  var id;
  if (req.db.isId(req.params.id))
    id = req.params.id;
  else {
    res.render('admin/certorgedit', locals(req, defaults, {
      title: 'New Certification Org',
      isNew: true,
      submitLink: '/admin/certorgs/new'
    }));
    return;
  }

  req.db.CertOrg.findOne({ _id: id }, req.success(function(certorg) {
    if (!certorg) {
      res.redirect(certOrgList, 302);
      return;
    }
    req.db.Motor.count({ _certOrg: id }, req.success(function(motors) {
      res.render('admin/certorgedit', locals(req, defaults, {
        title: 'Edit Certification Org',
        certorg: certorg,
        motors: motors,
        isCreated: req.query.result == 'created',
        isSaved: req.query.result == 'saved',
        isUnchanged: req.query.result == 'unchanged',
        submitLink: '/admin/certorgs/' + id
      }));
    }));
  }));
});

router.post('/admin/certorgs/:id', authorized('metadata'), function(req, res, next) {
  var id;
  if (req.db.isId(req.body.id))
    id = req.body.id;
  else if (req.db.isId(req.params.id))
    id = req.param.id;
  req.db.CertOrg.findOne({ _id: id }, req.success(function(certorg) {
    var isNew = false, isChanged = false,
        aliases;

    if (certorg == null) {
      if (id != null && id != 'new') {
        res.redirect(303, certOrgList);
        return;
      }
      certorg = {
        aliases: [],
        active: true
      };
      isNew = true;
    }

    ['name', 'abbrev', 'website'].forEach(function(p) {
      if (req.hasBodyProperty(p) && req.body[p] != certorg[p]) {
        certorg[p] = req.body[p];
        isChanged = true;
      }
    });

    if (req.body.aliases) {
      aliases = req.body.aliases.split(/ *,[ ,]*/);
      if (aliases.join() != certorg.aliases.join()) {
        certorg.aliases = aliases;
        isChanged = true;
      }
    }

    if (req.body.active) {
      if (!certorg.active) {
        certorg.active = true;
        isChanged = true;
      }
    } else {
      if (certorg.active) {
        certorg.active = false;
        isChanged = true;
      }
    }

    if (isNew) {
      req.db.CertOrg.create(new req.db.CertOrg(certorg), req.success(function(updated) {
        res.redirect(303, '/admin/certorgs/' + updated._id + '?result=created');
      }));
    } else if (isChanged) {
      certorg.save(req.success(function() {
        res.redirect(303, '/admin/certorgs/' + certorg._id + '?result=saved');
      }));
    } else {
      res.redirect(303, '/admin/certorgs/' + certorg._id + '?result=unchanged');
    }

    if (isNew || isChanged)
      metadata.flush();
  }));
});

/*
 * /admin/propellants/
 * List the propellant types by manufactuer, renders with admin/propellants.hbs template.
 */
const propellantsLink = '/admin/propellants/';

function loadPropellants(req, cb) {
  metadata.getManufacturers(req, function(manufacturers) {
    // load propellant info from DB
    let unique = {};
    req.db.PropellantInfo.find({}, req.success(function(info) {
      info.forEach(info => {
        const mfr = manufacturers.byId(info._manufacturer).abbrev;
        const key = mfr + ' ' + info.name;
        unique[key] = {
          key: key.replace(/\s+/g, '-'),
          mfr,
          name: info.name,
          total: 0,
          available: 0,
          flameColor: info.flameColor,
          smokeColor: info.smokeColor,
          sparky: info.sparky || false,
          _id: info._id,
        };
      });

      // augment with all unique propellants
      req.db.Motor.find({ propellantInfo: { $ne: null } }).exec(req.success(function(motors) {
        motors.forEach(motor => {
          if (motor.propellantInfo == null || motor.propellantInfo == '')
            return;
          const mfr = manufacturers.byId(motor._manufacturer).abbrev;
          const key = mfr + ' ' + motor.propellantInfo;
          let entry = unique[key];
          if (entry == null) {
            entry = unique[key] = {
              key: key.replace(/\s+/g, '-'),
              mfr,
              name: motor.propellantInfo,
              total: 0,
              available: 0,
              sparky: false,
            };
          }
          entry.total++;
          if (motor.isAvailable)
            entry.available++;
        });
        let names = Object.keys(unique);
        names.forEach(n => {
          let entry = unique[n];
          entry.few = entry.total <= 1;
        });
        names.sort((a, b) => a.localeCompare(b));
        cb(names.map(n => unique[n]));
      }));
    }));
  });
}

router.get(propellantsLink, function(req, res, next) {
  loadPropellants(req, function(list) {
    res.render('admin/propellants', locals(req, defaults, {
        title: 'Propellant Types',
        propellants: list,
    }));
  });
});

router.get(propellantsLink + "propellants.csv", function(req, res, next) {
  loadPropellants(req, function(list) {
    let file = new csv.File();
    file.colLabel('Manufacturer');
    file.colLabel('Propellant');
    file.colLabel('Total');
    file.colLabel('Available');
    file.colLabel('Flame Color');
    file.colLabel('Smoke Color');
    file.colLabel('Sparky');
    file.row();

    list.forEach(info => {
      file.col(info.mfr);
      file.col(info.name);
      file.col(info.total);
      file.col(info.available);
      file.col(info.flameColor);
      file.col(info.smokeColor);
      file.col(info.sparky ? "TRUE" : "");
      file.row();
    });

    let text = file.produce();
    res.type(file.mimeType)
       .attachment('propellants.csv')
       .end(text);
  });
});

router.post(propellantsLink, authorized('metadata'), function(req, res, next) {
  function trim(s) {
    if (s != null) {
      s = s.trim();
      if (s !== '')
        return s;
    }
  }

  let mfrName = trim(req.body.manufacturer),
      name = trim(req.body.name),
      flameColor = trim(req.body.flameColor),
      smokeColor = trim(req.body.smokeColor),
      sparky = req.body.sparky || false;

  if (mfrName == null || name == null) {
    res.status(400).send('Missing manufacturer/propellant name');
    return;
  }

  metadata.getManufacturers(req, function(manufacturers) {
    let mfr = manufacturers.byName(mfrName);
    if (mfr == null) {
      res.status(400).send('Invalid manufacturer');
      return;
    }

    function done() {
      res.redirect(propellantsLink, 303);
    }

    if (flameColor == null && smokeColor == null && !sparky) {
      // delete the entry if any
      req.db.PropellantInfo.deleteMany({
        _manufacturer: mfr._id,
        name,
      }, req.success(done));
    } else {
      // upsert the entry with values
      console.log({
        _manufacturer: mfr._id,
        name,
        flameColor,
        smokeColor,
        sparky,
      });
      req.db.PropellantInfo.findOneAndUpdate({
        _manufacturer: mfr._id,
        name,
      }, {
        flameColor,
        smokeColor,
        sparky,
      }, {
        upsert: true,
      }, req.success(done));
    }
  });
});

/*
 * /admin/propellants/guess.csv
 * Download a spreadsheet of the guessed colors from the propellant names.
 */
const FLAME = ['red', 'orange', 'yellow', 'blue', 'green', 'pink'];
const SMOKE = ['white', 'black'];

function guessColor(name, colors) {
  if (name == null || name === '' || name == 'black powder')
    return;
  let words = name.toLowerCase().split(/[^\w]+/);

  // find a word that is a color name
  let color = words.reduce((found, word) => {
    if (found != null)
      return found;
    return colors.find(c => word == c);
  }, null);
  if (color == null) {
    // find a word that starts with a color name
    color = words.reduce((found, word) => {
      if (found != null)
        return found;
      return colors.find(c => word.startsWith(c));
    }, null);
  }
  return color;
}

router.get(propellantsLink + "guess.csv", function(req, res, next) {
  metadata.getManufacturers(req, function(manufacturers) {
    req.db.Motor.find({ propellantInfo: { $ne: null } }).exec(req.success(function(motors) {
      let unique = {};
      motors.forEach(motor => {
        if (motor.propellantInfo == null || motor.propellantInfo == '')
          return;
        const mfr = manufacturers.byId(motor._manufacturer).abbrev;
        const key = mfr + ' ' + motor.propellantInfo;
        let entry = unique[key];
        if (entry == null) {
          entry = unique[key] = {
            key: key.replace(/\s+/g, '-'),
            mfr,
            name: motor.propellantInfo,
            total: 0,
            available: 0,
            flameColor: guessColor(motor.propellantInfo, FLAME),
            smokeColor: guessColor(motor.propellantInfo, SMOKE),
            sparky: false,
          };
        }
        entry.total++;
        if (motor.isAvailable)
          entry.available++;
        if (motor.sparky)
          entry.sparky = true;
      });

      let file = new csv.File();
      file.colLabel('Manufacturer');
      file.colLabel('Propellant');
      file.colLabel('Flame Color');
      file.colLabel('Smoke Color');
      file.colLabel('Sparky');
      file.row();

      let names = Object.keys(unique);
      names.sort((a, b) => a.localeCompare(b));
      names.forEach(n => {
        let info = unique[n];
        file.col(info.mfr);
        file.col(info.name);
        file.col(info.flameColor);
        file.col(info.smokeColor);
        file.col(info.sparky ? "TRUE" : "");
        file.row();
      });

      let text = file.produce();
      res.type(file.mimeType)
         .attachment('guess.csv')
         .end(text);
    }));
  });
});

/*
 * /admin/cases/
 * List the case types by manufactuer, renders with admin/cases.hbs template.
 */
router.get('/admin/cases/', function(req, res, next) {
  metadata.getManufacturers(req, function(manufacturers) {
    req.db.Motor.find({ caseInfo: { $ne: null }, type: { $ne: 'SU' } }).exec(req.success(function(motors) {
      let unique = {};
      motors.forEach(motor => {
        if (motor.caseInfo == null || motor.caseInfo == '')
          return;
        const mfr = manufacturers.byId(motor._manufacturer).abbrev;
        const key = mfr + ' ' + motor.caseInfo;
        let entry = unique[key];
        if (entry == null) {
          entry = unique[key] = {
            mfr,
            name: motor.caseInfo,
            total: 0,
            available: 0,
            diameters: [],
          };
        }
        entry.total++;
        if (motor.isAvailable)
          entry.available++;
        let d = units.formatMMTFromMKS(motor.diameter);
        if (entry.diameters.indexOf(d) < 0)
          entry.diameters.push(d);
      });
      let names = Object.keys(unique);
      names.forEach(n => {
        let entry = unique[n];
        entry.few = entry.total <= 1;
      });
      names.sort(helpers.nameCompare);
      res.render('admin/cases', locals(req, defaults, {
        title: 'Motor Cases',
        cases: names.map(n => {
          let o = unique[n];
          o.diameters.sort();
          o.diameter = o.diameters.sort().join();
          return o;
        }),
      }));
    }));
  });
});


module.exports = router;
