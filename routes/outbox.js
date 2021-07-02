/*
 * Copyright 2016-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      JSZip = require('jszip'),
      schema = require('../database/schema'),
      metadata = require('../lib/metadata'),
      errors = require('../lib/errors'),
      parsers = require('../simulate/parsers'),
      locals = require('./locals.js');

var defaults = {
  layout: 'simfiles',
  title: 'Simulator File Outbox',
};

const outboxLink = '/outbox/';
const downloadBasename = 'thrustcurve';
const downloadLink = '/outbox/download/';
const setLink = '/outbox/set/';

/*
 * /outbox/
 * List all files in the outbox.
 */
function doList(req, res) {
  function empty() {
    metadata.getManufacturers(req, function(manufacturers) {
      let sets = [];
      manufacturers.forEach(mfr => {
        if (mfr.active) {
          sets.push({
            manufacturer: mfr,
            name: mfr.name,
            abbrev: mfr.abbrev,
            raspLink: setLink + mfr.abbrev + '.eng',
            raspFile: mfr.abbrev + '.eng',
            rockSimLink: setLink + mfr.abbrev + '.rse',
            rockSimFile: mfr.abbrev + '.rse',
          });
        }
      });
      res.render('outbox/empty', locals(req, defaults, {
        sets,
      }));
    });
  }
  if (req.session.outbox && req.session.outbox.length > 0) {
    req.db.SimFile.find({ _id: { $in: req.session.outbox } })
                  .populate('_motor _contributor')
                  .exec(req.success(function(simfiles) {
      if (simfiles.length != req.session.outbox.length) {
        req.session.outbox = simfiles.map(s => s._id.toString());
        req.session.touch();
      }
      if (simfiles.length < 1) {
        empty();
      } else {
        let raspCount = 0, rocksimCount = 0, otherCount = 0;
        simfiles.forEach(simfile => {
          if (simfile.format === 'RASP')
            raspCount++;
          else if (simfile.format === 'RockSim')
            rocksimCount++;
          else
            otherCount++;
        });

        let raspLink, rocksimLink;
        if (raspCount > 0)
          raspLink = downloadLink + downloadBasename + '.eng';
        if (rocksimCount > 0)
          rocksimLink = downloadLink + downloadBasename + '.rse';
          
        res.render('outbox/list', locals(req, defaults, {
          simfiles,
          totalCount: simfiles.length,
          multiFormat: raspCount > 0 && rocksimCount > 0,
          raspCount,
          rocksimCount,
          zipLink: downloadLink + downloadBasename + '.zip',
          raspLink,
          rocksimLink,
          clearLink: '/outbox/clear/',
        }));
      }
    }));
  } else {
    empty();
  }
}

router.get([outboxLink, '/outbox.html'], function(req, res, next) {
  doList(req, res);
});
router.get('/outbox.jsp', function(req, res, next) {
  res.redirect(301, outboxLink);
});

/*
 * /outbox/add/:id/
 * Add a file to the outbox.
 */
router.get('/outbox/add/:id/', function(req, res, next) {
  if (req.session.outbox == null)
    req.session.outbox = [];
  if (req.params.id != null && /^[0-9a-f]{24}$/i.test(req.params.id)) {
    let i = req.session.outbox.indexOf(req.params.id);
    if (i < 0) {
      req.session.outbox.push(req.params.id);
      req.session.touch();
    }
  }
  res.redirect(303, outboxLink);
});

/*
 * /outbox/remove/:id/
 * Remove a file from the outbox.
 */
router.get('/outbox/remove/:id/', function(req, res, next) {
  if (req.session.outbox && req.session.outbox.length > 0) {
    let i = req.session.outbox.indexOf(req.params.id);
    if (i >= 0) {
      req.session.outbox.splice(i, 1);
      req.session.touch();
    }
  }
  res.redirect(303, outboxLink);
});

/*
 * /outbox/clear
 * Remove all files from the outbox.
 */
router.get('/outbox/clear', function(req, res, next) {
  if (req.session.outbox && req.session.outbox.length > 0) {
    req.session.outbox = [];
    req.session.touch();
  }
  res.redirect(303, outboxLink);
});

/*
 * /outbox/download/
 * Download all files compatible with file format.
 */
function noFiles(req, res) {
  res.status(404);
  res.render('notfound', locals(req, defaults, {
    title: 'No Files to Download',
    url: req.url,
    status: 404,
    message: 'No files in outbox to download.'
  }));
  return;
}

function parserCombiner(contentType, format, combine) {
  function send(req, res, next, simfiles) {
    let data = [];
    simfiles.forEach(simfile => {
      if (simfile.format === format)
        data.push(simfile.data);
    });
    let errs = new errors.Collector();
    let combined = combine(data, errs);
    if (combined == null || combined === '')
      noFiles(req, res);
    else
      res.send(combined);
  }

  return {
    contentType: contentType,
    format: format,
    send,
  };
}

function zipCombiner() {
  function send(req, res, next, simfiles) {
    metadata.getManufacturers(req, function(manufacturers) {
      let zip = new JSZip();
      simfiles.forEach(simfile => {
        let mfr = manufacturers.byId(simfile._motor._manufacturer);
        let file = mfr.abbrev + '_' + simfile._motor.designation;
        file = file.replace(/[\/:&<>()_]+/g, '_')
                   .replace(/_+$/, '');
        let info = parsers.formatInfo(simfile.format);
        if (info != null)
          file += info.extension;
        zip.file(file, simfile.data);
      });
      zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      }).then(b => res.send(b))
        .catch(e => next(e));
    });
  }
  return {
    contentType: 'application/zip',
    send,
  };
}

function getCombiner(file) {
  if (file != null && file !== '') {
    if (/\.eng$/i.test(file))
      return parserCombiner('text/plain', 'RASP', parsers.combineRASP);
    if (/\.rse$/i.test(file))
      return parserCombiner('text/xml', 'RockSim', parsers.combineRockSim);
    if (/\.zip$/i.test(file))
      return zipCombiner();
  }
}

router.get(downloadLink + ':file', function(req, res, next) {
  const file = req.params.file;
  let combiner = getCombiner(file);
  if (combiner == null) {
    res.status(404);
    res.render('notfound', locals(req, defaults, {
      title: 'Unsupported Download File Format',
      url: req.url,
      status: 404,
      message: 'The requested outbox download file type is not supported.'
    }));
    return;
  }

  if (req.session.outbox && req.session.outbox.length > 0) {
    req.db.SimFile.find({ _id: { $in: req.session.outbox } })
                  .populate('_motor')
                  .exec(req.success(function(simfiles) {

      if (simfiles.length < 1) {
        noFiles(req, res);
      } else {
        res.type(combiner.contentType)
           .header('Content-Disposition', 'attachment; filename=' + file);
        combiner.send(req, res, next, simfiles);
      }
    }));
  } else {
    noFiles(req, res);
  }
});

router.get(setLink + ':file', function(req, res, next) {
  const file = req.params.file;
  let combiner = getCombiner(file);
  if (combiner == null || combiner.format == null) {
    res.status(404);
    res.render('notfound', locals(req, defaults, {
      title: 'Unsupported Download File Format',
      url: req.url,
      status: 404,
      message: 'The requested manufacturer set file type is not supported.'
    }));
    return;
  }
  metadata.get(req, function(metadata) {
    let mfr = metadata.manufacturers.byName(req.params.file.replace(/\.\w+$/, ''));
    if (mfr == null) {
      noFiles(req, res);
      return;
    }

    req.db.Motor.find({ _manufacturer: mfr._id, availability: { $in: schema.MotorAvailableEnum } })
                .exec(req.success(function(motors) {
      let ids = motors.map(m => m._id);
      req.db.SimFile.find({ _motor: { $in: ids }, format: combiner.format })
                    .populate('_motor')
                    .sort([['updatedAt', -1]])
                    .exec(req.success(function(simfiles) {
        let seenMotors = [];
        let uniqueFiles = [];
        simfiles.forEach(simfile => {
          if (seenMotors.indexOf(simfile._motor._id.toString()) >= 0)
            return;
          seenMotors.push(simfile._motor._id.toString());
          uniqueFiles.push(simfile);
        });
        if (uniqueFiles.length < 1) {
          noFiles(req, res);
        } else {
          res.type(combiner.contentType)
             .header('Content-Disposition', 'attachment; filename=' + file);
          combiner.send(req, res, next, uniqueFiles);
        }
      }));
    }));
  });
});

/*
 * /outbox/filesets/
 * List of data file sets by manufacturer.
 */
router.get('/outbox/filesets/', function(req, res, next) {
  metadata.getManufacturers(req, function(manufacturers) {
    let sets = [];
    manufacturers.forEach(mfr => {
      if (mfr.active) {
        sets.push({
          manufacturer: mfr,
          name: mfr.name,
          abbrev: mfr.abbrev,
          raspLink: setLink + mfr.abbrev + '.eng',
          raspFile: mfr.abbrev + '.eng',
          rockSimLink: setLink + mfr.abbrev + '.rse',
          rockSimFile: mfr.abbrev + '.rse',
        });
      }
    });
    res.render('outbox/filesets', locals(req, defaults, {
      title: 'Manufacturer File Sets',
      sets,
    }));
  });
});

module.exports = router;
