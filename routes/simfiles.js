/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      errors = require('../lib/errors'),
      units = require('../lib/units'),
      parsers = require('../simulate/parsers'),
      analyze = require('../simulate/analyze'),
      graphs = require('../render/graphs'),
      locals = require('./locals.js');

var defaults = {
  layout: 'simfiles',
};

function getSimFile(req, res, cb) {
  var id = req.params.id || req.query.id;
  if (req.db.isId(id)) {
    req.db.SimFile.findOne({ _id: id }).populate('_motor').exec(req.success(function(simfile) {
      if (simfile == null) {
	res.notfound();
	return;
      }
      simfile.populate('_contributor', req.success(function() {
	simfile._motor.populate('_manufacturer', 'abbrev', req.success(function() { cb(simfile); }));
      }));
    }));
  } else {
    res.notfound();
  }
}

function simFileName(simfile) {
  var file, info;

  // make the most descriptive name we can
  if (!simfile._motor.designation) {
    file = simfile._id.toString();
  } else {
    if (simfile._motor._manufacturer.abbrev)
      file = simfile._motor._manufacturer.abbrev + '_';
    else
      file = '';
    file += simfile._motor.designation;
  }

  // escape any file system magic characters
  file = file.replace(/[\/:&<>()_]+/g, '_')
             .replace(/_+$/, '');

  // add appropriate file extension
  info = parsers.formatInfo(simfile.format);
  if (info != null)
    file += info.extension;

  return file;
}

/*
 * /simfiles/:id/
 * Specific file details, renders with simfiles/details.hbs template.
 */
router.get('/simfiles/:id/', function(req, res, next) {
  getSimFile(req, res, function(simfile) {
    req.db.SimFileNote.find({ _simfile: simfile._id }, undefined, { sort: { updatedAt: -1 } })
                      .populate('_contributor')
                      .exec(req.success(function(notes) {
      var errs, parsed, stats;

      // parse the file
      errs = new errors.Collector();
      parsed = parsers.parseData(simfile.format, simfile.data, errs);
      if (parsed != null)
	stats = analyze.stats(parsed, errs);

      // render the file details
      res.render('simfiles/details', locals(defaults, {
	title: req.helpers.motorDesignation(simfile._motor) + ' Data (' + simfile.format + ')',
	simfile: simfile,
	motor: simfile._motor,
	notes: notes,
	parsed: parsed,
	info: parsed == null ? {} : parsed.info,
	stats: stats,
	hasErrors: errs.hasErrors(),
	errors: errs.errors,
	editLink: req.helpers.simfileLink(simfile) + 'edit.html',
	deleteLink: req.helpers.simfileLink(simfile) + 'delete.html',
	graphLink: req.helpers.simfileLink(simfile) + 'graph.svg',
	downloadLink: req.helpers.simfileLink(simfile) + 'download/' + simFileName(simfile),
      }));
    }));
  });
});
router.get('/simfilesearch.jsp', function(req, res, next) {
  var id = req.query.id;
  if (id && /^[1-9][0-9]*$/.test(id)) {
    // old-style MySQL row ID; go to file details
    req.db.SimFile.findOne({ migratedId: parseInt(id) }, req.success(function(result) {
      if (result)
        res.redirect(301, req.helpers.simfileLink(result));
      else
        res.notfound();
    }));
  } else {
    res.notfound();
  }
});

/*
 * /simfiles/:id/graph.svg
 * Produce a graph of the simfile data points and summary info.
 */
router.get('/simfiles/:id/graph.svg', function(req, res, next) {
  getSimFile(req, res, function(simfile) {
    var width, height, unit, errs, parsed;

    // get width and height to layout
    if (req.query.width && req.query.height) {
      width = parseInt(req.query.width);
      height = parseInt(req.query.height);
    }
    if (!width || !height) {
      width = 650;
      height = 350;
    }

    // get force units to use
    if (req.query.unit) {
      if (/^lb/i.test(req.query.unit))
        unit = 'lbf';
      else
        unit = 'N';
    } else {
      unit = units.getUnitPref('force').label;
    }

    // get simulator file data
    errs = new errors.Collector();
    parsed = parsers.parseData(simfile.format, simfile.data, errs);

    // render the graph
    graphs.sendThrustCurve(res, {
      data: parsed,
      width: width,
      height: height,
      title: req.helpers.motorFullName(simfile._motor) + ' (' + simfile.format + ')',
      unit: unit
    });
  });
});
router.get(/\/graphs\/simfile.*\.png/, function(req, res, next) {
  var spec, parts, id, query;

  // extract old graph specs
  spec = req.path.replace(/^.graphs.simfile/, '').replace(/\.[a-z]*$/, '');
  if ((parts = /^(\d+)_(\d+)x(\d+)([a-z]+)$/.exec(spec))) {
    id = parseInt(parts[1]);
    query = '?width=' + parts[2] + '&height=' + parts[3] + '&unit=' + parts[4];
  } else if ((parts = /^(\d+)$/.exec(spec))) {
    id = parseInt(parts[1]);
    query = '';
  }
  if (id == null || isNaN(id) || id <= 0) {
    res.status(404).send();
    return;
  }

  // old-style MySQL row ID; go to graph
  req.db.SimFile.findOne({ migratedId: id }, req.success(function(result) {
    if (result)
      res.redirect(301, '/simfiles/' + result._id + '/graph.svg' + query);
    else
      res.status(404).send();
  }));
});

/*
 * /simfiles/:id/download/:file
 * Download the actual simulator file content as a file.
 */
router.get('/simfiles/:id/download/:file', function(req, res, next) {
  getSimFile(req, res, function(simfile) {
    var info, contentType;

    info = parsers.formatInfo(simfile.format);
    if (info != null)
      contentType = info.mimeType;
    if (!contentType)
      contentType = 'text/plain';

    res.type(contentType)
       .header('Content-Disposition', 'attachment; filename=' + simFileName(simfile))
       .send(simfile.data);
  });
});

module.exports = router;
