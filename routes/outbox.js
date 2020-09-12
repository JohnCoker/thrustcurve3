/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      JSZip = require('jszip'),
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

/*
 * /outbox/
 * List all files in the outbox.
 */
function doList(req, res) {
  if (req.session.outbox && req.session.outbox.length > 0) {
    req.db.SimFile.find({ _id: { $in: req.session.outbox } })
                  .populate('_motor _contributor')
                  .exec(req.success(function(simfiles) {
      if (simfiles.length != req.session.outbox.length) {
        req.session.outbox = simfiles.map(s => s._id.toString());
        req.session.touch();
      }
      if (simfiles.length < 1) {
        res.render('outbox/empty', locals(defaults, {
        }));
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
          raspLink = '/outbox/download/' + downloadBasename + '.eng';
        if (rocksimCount > 0)
          rocksimLink = '/outbox/download/' + downloadBasename + '.rse';
          
        res.render('outbox/list', locals(defaults, {
          simfiles,
          totalCount: simfiles.length,
          multiFormat: raspCount > 0 && rocksimCount > 0,
          raspCount,
          rocksimCount,
          zipLink: '/outbox/download/' + downloadBasename + '.zip',
          raspLink,
          rocksimLink,
          clearLink: '/outbox/clear/',
        }));
      }
    }));
  } else {
    res.render('outbox/empty', locals(defaults, {
    }));
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
  res.render('notfound', locals(defaults, {
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

router.get('/outbox/download/:file', function(req, res, next) {
  let file = req.params.file;
  let combiner;
  if (file != null && file !== '') {
    if (/\.eng$/i.test(file))
      combiner = parserCombiner('text/plain', 'RASP', parsers.combineRASP);
    else if (/\.rse$/i.test(file))
      combiner = parserCombiner('text/xml', 'RockSim', parsers.combineRockSim);
    else if (/\.zip$/i.test(file))
      combiner = zipCombiner();
  }
  if (combiner == null) {
    res.status(404);
    res.render('notfound', locals(defaults, {
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

module.exports = router;
