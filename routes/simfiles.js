/*
 * Copyright 2016-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      errors = require('../lib/errors'),
      units = require('../lib/units'),
      schema = require('../database/schema'),
      metadata = require('../lib/metadata'),
      parsers = require('../simulate/parsers'),
      analyze = require('../simulate/analyze'),
      graphs = require('../render/graphs'),
      authenticated = require('./authenticated.js'),
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

function simFileName(simfile, ext) {
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
  if (ext)
    file += ext;
  else {
    info = parsers.formatInfo(simfile.format);
    if (info != null)
      file += info.extension;
  }

  return file;
}

function simFileQuery(req) {
  if (req.db.isId(req.body.id))
    return { _id: req.body.id };

  if (req.db.isId(req.params.id))
    return { _id: req.params.id };

  if (req.db.isId(req.query.id))
    return { _id: req.query.id };
}

function noMotor(req, res) {
  res.status(404);
  res.render('notfound', locals(defaults, {
    title: 'Motor Not Found',
    url: req.url,
    status: 404,
    message: 'The requested motor does not exist.'
  }));
}

function noSimFile(req, res) {
  res.status(404);
  res.render('notfound', locals(defaults, {
    title: 'Data File Not Found',
    url: req.url,
    status: 404,
    message: 'The requested data file does not exist.'
  }));
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
        pointsLink: req.helpers.simfileLink(simfile) + 'points/' + simFileName(simfile, '.csv'),
        outboxLink: '/outbox/add/' + simfile._id + '/',
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


/*
 * /simfiles/:id/points/:file
 * Download a CSV file containing the data points from the simulator file content.
 */
router.get('/simfiles/:id/points/:file', function(req, res, next) {
  getSimFile(req, res, function(simfile) {
    let motor = simfile._motor;
    let csv = `"motor:","${motor._manufacturer.abbrev} ${motor.designation}"\n` +
              `"contributor:","${simfile._contributor.name}"\n` +
              `"details:","https://www.thrustcurve.org/simfiles/${simfile._id}}/"\n`;

    let errs = new errors.Collector();
    let parsed = parsers.parseData(simfile.format, simfile.data, errs);
    if (parsed != null && parsed.points != null) {
      csv += '\n"Time (s)","Thrust (N)"\n';
      parsed.points.forEach(point => csv += `${point.time},${point.thrust}\n`);
    }

    res.type('text/csv')
       .header('Content-Disposition', 'attachment; filename=' + simFileName(simfile, '.csv'))
       .send(csv);
  });
});


/*
 * /simfiles/:id/create.html
 * Create a data file for the specified motor; renders with simfiles/edit.hbs template.
 */
router.get('/simfiles/:id/create.html', authenticated, function(req, res, next) {
  req.db.Motor.findOne({ _id: req.params.id }).populate('_manufacturer').exec(req.success(function(motor) {
    if (motor == null) {
      noMotor(req, res);
      return;
    }
    res.render('simfiles/edit', locals(defaults, {
      title: 'Contribute Data File',
      isNew: true,
      motor: motor,
      simfile: {
        _contributor: req.user,
        _motor: motor
      },
      formats: schema.SimFileFormatEnum,
      dataSources: schema.SimFileDataSourceEnum,
      licenses: schema.SimFileLicenseEnum,
      submitLink: '/simfiles/new/edit.html'
    }));
  }));
});

/*
 * /simfiles/:id/edit.html
 * Create or edit a data file; renders with simfiles/edit.hbs template.
 */
router.get('/simfiles/:id/edit.html', authenticated, function(req, res, next) {
  var q = simFileQuery(req);
  if (q == null) {
    noSimFile(req, res);
    return;
  }
  req.db.SimFile.findOne(q).populate('_motor _contributor').exec(req.success(function(simfile) {
    if (simfile == null) {
      noSimFile(req, res);
      return;
    }
    simfile._motor.populate('_manufacturer', req.success(function() {
      // parse the file to find errors and warnings
      let errs = new errors.Collector();
      parsers.parseData(simfile.format, simfile.data, errs);

      res.render('simfiles/edit', locals(defaults, {
        title: 'Edit Data File',
        motor: simfile._motor,
        simfile: simfile,
        hasErrors: errs.hasErrors(),
        errors: errs.errors,
        isCreated: req.query.result == 'created',
        isSaved: req.query.result == 'saved',
        isUnchanged: req.query.result == 'unchanged',
        submitLink: '/simfiles/' + simfile._id + '/edit.html'
      }));
    }));
  }));
});

function canUpdateFile(req, simfile) {
  if (req.user == null)
    return false;
  if (req.user._id.toString() == simfile._contributor._id.toString())
    return true;
  if (req.user.permissions.editSimFiles)
    return true;
  return false;
}

function noUpdatePerm(req, res) {
  res.status(403);
  res.render('error', locals(defaults, {
    title: 'Unauthorized Access',
    url: req.url,
    status: 403,
    message: 'The logged in user does not have permission to change the data file.'
  }));
}

function updateFile(req, res, simfile) {
  let isNew = simfile._id == null, isChanged = false;

  // attributes
  [ 'format',
    'dataSource',
    'license',
  ].forEach(function(p) {
    let s;
    if (req.hasBodyProperty(p)) {
      s = req.body[p].trim();
      if (s !== '') {
        if (simfile[p] == null || req.body[p] != simfile[p].toString()) {
          simfile[p] = req.body[p];
          isChanged = true;
        }
      }
    }
  });

  // data
  if (req.hasBodyProperty('data')) {
    let data = req.body.data.trim();
    if (data !== simfile.data) {
      simfile.data = data;
      isChanged = true;
    }

    let errs = new errors.Collector();
    let parsed = parsers.parseData(simfile.format, data, errs);
    if (parsed == null || errs.hasErrors()) {
      res.render('simfiles/edit', locals(defaults, {
        title: 'Edit Data File',
        motor: simfile._motor,
        simfile: simfile,
        hasErrors: errs.hasErrors(),
        errors: errs.errors,
        submitLink: '/simfiles/' + (isNew ? "new" : simfile._id) + '/edit.html'
      }));
      return;
    }
  }

  if (isNew) {
    req.db.SimFile.create(new req.db.SimFile(simfile), req.success(function(updated) {
      let url = req.helpers.simfileLink(updated._id) + "edit.html";
      res.redirect(303, url + '?result=created');
    }));
  } else {
    let url = req.helpers.simfileLink(simfile._id) + "edit.html";
    if (isChanged) {
      simfile.save(req.success(function(updated) {
        res.redirect(303, url + '?result=saved');
      }));
    } else {
      res.redirect(303, url + '?result=unchanged');
    }
  }
}

router.post('/simfiles/:id/edit.html', authenticated, function(req, res, next) {
  var q = simFileQuery(req);
  if (q == null) {
    // create new file for specified motor
    req.db.Motor.findOne({ _id: req.body.motorId }).populate('_manufacturer').exec(req.success(function(motor) {
      if (motor == null) {
        noMotor(req, res);
      } else {
        updateFile(req, res, {
          _contributor: req.user,
          _motor: motor
        });
      }
    }));
  } else {
    // edit this file
    req.db.SimFile.findOne(q).populate('_motor _contributor').exec(req.success(function(simfile) {
      if (simfile == null) {
        noSimFile(req, res);
      } else if (!canUpdateFile(req, simfile)) {
        noUpdatePerm(req, res);
      } else {
        updateFile(req, res, simfile);
      }
    }));
  }
});

/*
 * /simfiles/:id/delete.html
 * Delete a data file.
 */
router.get('/simfiles/:id/delete.html', authenticated, function(req, res, next) {
  var q = simFileQuery(req);
  if (q == null) {
    noSimFile(req, res);
    return;
  }
  req.db.SimFile.findOne(q).populate('_motor _contributor').exec(req.success(function(simfile) {
    if (simfile == null) {
      noSimFile(req, res);
    } else if (!canUpdateFile(req, simfile)) {
      noUpdatePerm(req, res);
    } else {
      simfile._motor.populate('_manufacturer', req.success(function(motor) {
        simfile.remove(req.success(function() {
          // return to motor page
          res.redirect(302, '/motors/' + motor._manufacturer.abbrev + '/' + motor.designation);
        }));
      }));
    }
  }));
});

/*
 * /simfiles/dataerrors.html
 * Parse all data files checking for errors.
 */
router.get('/simfiles/:id/dataerrors.html', function(req, res, next) {
  metadata.getManufacturers(req, function(manufacturers) {
    let errfiles = [];
    let failCount = 0, totalCount = 0;
    let q;
    if (req.body.id !== '*' && req.body.id !== '-')
      q = simFileQuery(req);
    let cursor = req.db.SimFile.find(q).populate('_motor').cursor();
    cursor.on('data', simfile => {
      let errs = new errors.Collector();
      let parsed = parsers.parseData(simfile.format, simfile.data, errs);
      if (parsed == null) {
        simfile.failed = true;
        failCount++;
      }
      if (parsed == null || errs.errorCount() > 0) {
        let mfr = manufacturers.byId(simfile._motor._manufacturer);
        simfile.mfr_abbrev = mfr == null ? '?' : mfr.abbrev;
        simfile.errorCount = errs.errorCount();
        simfile.errors = errs;
        errfiles.push(simfile);
      }
      totalCount++;
    });
    cursor.on('close', () => {
      errfiles.sort((a, b) => {
        if (a.failed && !b.failed)
          return -1;
        if (!a.failed && b.failed)
          return 1;

        if (a.errorCount > b.errorCount)
          return -1;
        if (a.errorCount < b.errorCount)
          return 1;

        let comp = a.mfr_abbrev.localeCompare(b.mfr_abbrev);
        if (comp !== 0)
          return comp;
        a._motor.designation.localeCompare(b._motor.designation);
      });
      res.render('simfiles/dataerrors', locals(defaults, {
        title: 'Data File Errors',
        simfiles: errfiles,
        errorCount: errfiles.length,
        failCount,
        totalCount,
      }));
      return;
    });
    cursor.on('error', e => next(e));
  });
});

module.exports = router;
