/*
 * Copyright 2016-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      _ = require('underscore'),
      path = require('path'),
      async = require('async'),
      xmlparser = require('express-xml-bodyparser'),
      yamljs = require('yamljs'),
      errors = require('../lib/errors'),
      metadata = require('../lib/metadata'),
      data = require('../render/data'),
      api1 = require('../lib/api');

xmlparser.regexp = /.*/;

const APIPrefix = '/api/v1/';
const LegacyPrefix = '/servlets/';

/*
 * CORS support. We allow access from anywhere for the API, including with credentials
 * which requires echoing back the requested origin in the Allow-Origin response header.
 */
router.all(APIPrefix + '*', function(req, res, next) {
  let origin = '*';
  if (req.header('origin') != null)
    origin = req.header('origin');
  else if (req.header('x-forwarded-proto') != null)
    origin = req.header('x-forwarded-proto') + '://' + req.header('host');
  else if (req.protocol && req.get('host'))
    origin = req.protocol + '://' + req.get('host');
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
router.all(LegacyPrefix + '*', function(req, res, next) {
  // simpler CORS support for legacy endpoints
  res.header('Access-Control-Allow-Origin', '*');
  next();
});


/*
 * /api/v1/swagger
 * The Open API specification.
 */
const specFile = path.resolve(__dirname + '/../config/api_v1.yml');

router.get(APIPrefix + 'swagger.yml', function(req, res, next) {
  res.type('application/yaml').sendFile(specFile);
});
router.get(APIPrefix + 'swagger.json', function(req, res, next) {
  var spec = yamljs.load(specFile),
      text;
  if (process.env.NODE_ENV == 'production' || req.hasQueryProperty('canonical'))
    spec.host = 'www.thrustcurve.org';
  if (req.hasQueryProperty('pretty'))
    text = JSON.stringify(spec, undefined, 2);
  else
    text = JSON.stringify(spec);
  res.type('application/json').send(text);
});


/*
 * /api/v1/metadata
 * Possible motor search criteria, either as XML or JSON.
 */
function sendMetadata(res, format, metadata, errs) {
  format.root('metadata-response');
  format.elementList('manufacturers', _.map(metadata.manufacturers, function(m) {
    return {
      name: m.name,
      abbrev: m.abbrev
    };
  }));
  format.elementList('cert-orgs', _.map(metadata.certOrgs, function(o) {
    return {
      name: o.name,
      abbrev: o.abbrev
    };
  }));
  format.elementList('types', metadata.types);
  format.lengthList('diameters', metadata.diameters);
  format.elementList('impulse-classes', metadata.impulseClasses);
  format.error(errs);
  format.send(res);
}

function doMetadata(req, res, format) {
  var request;
  if (req.method == 'GET')
    request = req.query;
  else
    request = api1.getElement(req.body, 'metadata-request') || req.body;

  metadata.get(req, function(cache) {
    let errs = new errors.Collector();
    let query = api1.searchQuery(request, cache, errs);
    let keys = Object.keys(query);
    if (keys.length == 1 && query.availability == 'available') {
      // available motors
      sendMetadata(res, format, cache.availableMotors, errs);
    } else if (keys.length > 0) {
      // specific motor query
      metadata.getMatchingMotors(req, query, function(metadata) {
        sendMetadata(res, format, metadata, errs);
      });
    } else {
      // all motors
      sendMetadata(res, format, cache.allMotors, errs);
    }
  });
}

router.get(APIPrefix + 'metadata.json', function(req, res, next) {
  doMetadata(req, res, new data.JSONFormat());
});
router.post(APIPrefix + 'metadata.json', function(req, res, next) {
  doMetadata(req, res, new data.JSONFormat());
});
router.get([APIPrefix + 'metadata.xml', LegacyPrefix + 'metadata'], xmlparser(), function(req, res, next) {
  doMetadata(req, res, new data.XMLFormat());
});
router.post([APIPrefix + 'metadata.xml', LegacyPrefix + 'metadata'], xmlparser(), function(req, res, next) {
  doMetadata(req, res, new data.XMLFormat());
});


/*
 * /api/v1/search
 * Search for motors, either as XML or JSON.
 */

module.exports = router;
