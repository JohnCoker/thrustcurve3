/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var express = require('express'),
    router = express.Router(),
    errors = require('../lib/errors'),
    parsers = require('../simulate/parsers'),
    analyze = require('../simulate/analyze'),
    locals = require('./locals.js');

var defaults = {
  layout: 'simfiles',
};

var searchLink = '/motors/search.html';

/*
 * /simfiles/:id/
 * Specific file details, renders with simfiles/details.hbs template.
 */
router.get('/simfiles/:id/', function(req, res, next) {
  if (req.db.isId(req.params.id)) {
    req.db.SimFile.findOne({ _id: req.params.id }).populate('_contributor _motor').exec(req.success(function(simfile) {
      if (simfile == null) {
	res.redirect(303, searchLink);
	return;
      }
      simfile._motor.populate('_manufacturer', 'abbrev', req.success(function() {
	req.db.SimFileNote.find({ _simfile: simfile._id }, undefined, { sort: { updatedAt: -1 } }).populate('_contributor').exec(req.success(function(notes) {
	  var errs, parsed, stats;

	  // parse the file
	  errs = new errors.Collector();
	  parsed = parsers.parseData(simfile.format, simfile.data, errs);
	  if (parsed != null)
	    stats = analyze.stats(parsed, errs);

	  // render the file details
	  res.render('simfiles/details', locals(defaults, {
	    title: simfile._motor.designation + ' Data (' + simfile.format + ')',
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
	  }));
	}));
      }));
    }));
  }
});
router.get('/simfilesearch.jsp', function(req, res, next) {
  var id = req.query.id;
  if (id && /^[1-9][0-9]*$/.test(id)) {
    // old-style MySQL row ID; go to file details
    req.db.SimFile.findOne({ migratedId: parseInt(id) }, req.success(function(result) {
      if (result)
        res.redirect(301, req.helpers.simfileLink(result));
      else
        res.redirect(303, searchLink);
    }));
  } else {
    res.redirect(301, searchLink);
  }
});

module.exports = router;
