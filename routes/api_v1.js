/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      _ = require('underscore'),
      path = require('path'),
      xmlparser = require('express-xml-bodyparser'),
      yamljs = require('yamljs'),
      schema = require('../database/schema'),
      metadata = require('../lib/metadata'),
      data = require('../render/data');

xmlparser.regexp = /.*/;

function getElement(parent, name) {
  var name2;

  if (parent && typeof parent == 'object') {
    if (parent.hasOwnProperty(name))
      return trimValue(parent[name]);

    if (/-[a-z]/.test(name)) {
      name2 = data.JSONFormat.camelCase(name);
      if (parent.hasOwnProperty(name2))
        return trimValue(parent[name2]);
    }
  }
}

function trimValue(v) {
  if (v == null)
    return;

  if (typeof v == 'string') {
    v = v.trim();
    if (v == '*' || v == 'all')
      return;
  }
  if (Array.isArray(v) && v.length == 1)
    return trimValue(v[0]);

  return v;
}

function searchQuery(request, cache) {
  var query = {},
      v, m;

  // manufacturer
  v = getElement(request, 'manufacturer');
  if (v != null) {
    m = cache.manufacturers.byName(v);
    query._manufacturer = m ? m._id : null;
  }

  // designation
  v = getElement(request, 'designation');
  if (v != null) {
    v = toDesignation(v);
    query.$or = [
      { designation: v },
      { altDesignation: v },
    ];
  }

  // common name
  v = getElement(request, 'common-name');
  if (v != null) {
    v = toCommonName(v);
    query.$or = [
      { commonName: v },
      { altName: v },
    ];
  }

  // impulse class
  v = getElement(request, 'impulse-class');
  if (v != null) {
    v = toImpulseClass();
    query.impulseClass = v;
  }

  // diameter, mm
  v = getElement(request, 'diameter');
  if (v != null) {
    m = parseFloat(v);
    if (m > 0) {
      m /= 1000;
      query.diameter = {
        $gt: m - metadata.MotorDiameterTolerance,
        $lt: m + metadata.MotorDiameterTolerance
      };
    } else
      query.diameter = 0;
  }

  // motor type
  v = getElement(request, 'type');
  if (v != null)
    query.type = v;

  // cert. org.
  v = getElement(request, 'cert-org');
  if (v != null) {
    m = cache.certOrgs.byName(v);
    query._certOrg = m ? m._id : null;
  }

  // availability
  v = getElement(request, 'availability');
  if (v != null) {
    if (v == 'available')
      query.availability = { $in: schema.MotorAvailableEnum };
    else
      query.availability = v;
  }

  return query;
}

/*
 * Basic CORS support.
 */
router.all('/api/v1/*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST');
  next();
});


/*
 * /api/v1/swagger
 * The Open API specification.
 */
const specFile = path.resolve(__dirname + '/../config/api_v1.yml');

router.get('/api/v1/swagger.yml', function(req, res, next) {
  res.type('application/yaml').sendFile(specFile);
});
router.get('/api/v1/swagger.json', function(req, res, next) {
  var spec = yamljs.load(specFile),
      text;
  if (req.query.hasOwnProperty('pretty'))
    text = JSON.stringify(spec, undefined, 2);
  else
    text = JSON.stringify(spec);
  res.type('application/json').send(text);
});


/*
 * /api/v1/metadata
 * Possible motor search criteria, either as XML or JSON.
 */
function sendMetadata(res, format, metadata) {
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
  format.send(res);
}

function doMetadata(req, res, format) {
  var request;
  if (req.method == 'GET')
    request = req.query;
  else
    request = getElement(req.body, 'metadata-request') || {};

  metadata.get(req, function(cache) {
    var query, keys;
  
    query = searchQuery(request, cache);
    keys = Object.keys(query);
    if (keys.length == 1 && query.availability == 'available') {
      // available motors
      sendMetadata(res, format, cache.availableMotors);
    } else if (keys.length > 0) {
      // specific motor query
      metadata.getMatchingMotors(req, query, function(metadata) {
        sendMetadata(res, format, metadata);
      });
    } else {
      // all motors
      sendMetadata(res, format, cache.allMotors);
    }
  });
}

router.get('/api/v1/metadata.json', function(req, res, next) {
  doMetadata(req, res, new data.JSONFormat());
});
router.post('/api/v1/metadata.json', function(req, res, next) {
  doMetadata(req, res, new data.JSONFormat());
});
router.get(['/api/v1/metadata.xml', '/servlets/metadata'], xmlparser(), function(req, res, next) {
  doMetadata(req, res, new data.XMLFormat());
});
router.post(['/api/v1/metadata.xml', '/servlets/metadata'], xmlparser(), function(req, res, next) {
  doMetadata(req, res, new data.XMLFormat());
});


module.exports = router;
