/*
 * Copyright 2016-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      bodyParser = require('body-parser'),
      router = express.Router(),
      _ = require('underscore'),
      path = require('path'),
      async = require('async'),
      yamljs = require('yamljs'),
      errors = require('../lib/errors'),
      metadata = require('../lib/metadata'),
      data = require('../render/data'),
      api1 = require('../lib/api');

require('body-parser-xml')(bodyParser);

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
  req.isLegacy = true;
  next();
});

/*
 * API body support. We don't require a Content-Type to be specified, so if we assume
 * the body type implied by the path.
 */
const jsonBodyParser = bodyParser.json({ type: () => true });

function jsonParser(req, res, next) {
  jsonBodyParser(req, res, err => {
    if (err) {
      let msg;
      if (err.message)
        msg = err.message.replace(/^\w*Error: */, '').trim();
      if (msg == null || msg === '')
        msg = 'JSON parsing failed';
      res.status(400);
      res.send(JSON.stringify({ error: msg }, undefined, 2));
      return;
    }
    next();
  });
}

const xmlBodyParser = bodyParser.xml({ type: () => true });

function xmlParser(req, res, next) {
  xmlBodyParser(req, res, err => {
    if (err) {
      let msg;
      if (err.message)
        msg = err.message.replace(/^\w*Error: */, '').trim();
      if (msg == null || msg === '')
        msg = 'XML parsing failed';
      let root;
      if (/^\/(?:api\/v1|servlets)\/([a-z]+).*$/.test(req.path))
        root = req.path.replace(/^([a-z1]*\/)*([a-z]*).*$/, "$2-response");
      else
        root = "response";
      res.status(400);
      let format = new data.XMLFormat();
      format.root(root);
      format.element('error', msg);
      format.send(res);
      return;
    }
    next();
  });
}

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
router.post(APIPrefix + 'metadata.json', jsonParser, function(req, res, next) {
  doMetadata(req, res, new data.JSONFormat());
});
router.get([APIPrefix + 'metadata.xml', LegacyPrefix + 'metadata'], function(req, res, next) {
  doMetadata(req, res, new data.XMLFormat());
});
router.post([APIPrefix + 'metadata.xml', LegacyPrefix + 'metadata'], xmlParser, function(req, res, next) {
  doMetadata(req, res, new data.XMLFormat());
});


/*
 * /api/v1/search
 * Search for motors, either as XML or JSON.
 */
function doSearch(req, res, format) {
  var request;
  if (req.method == 'GET')
    request = req.query;
  else
    request = api1.getElement(req.body, 'search-request') || req.body;

  let maxResults = api1.getElement(request, "max-results");
  if (isNaN(maxResults))
    maxResults = 20;
  else if (maxResults <= 0)
    maxResults = -1;
  let resultMatches = 0;

  metadata.get(req, function(cache) {
    let errs = new errors.Collector();
    let query = api1.searchQuery(request, cache, errs);
    let criteria = api1.searchCriteria(request);

    format.root('search-response');
    let criteriaInfo = [];
    let queries = [];
    Object.keys(criteria).map(crit => {
      let info = {
        name: crit,
        value: criteria[crit],
      };

      let critErrs = new errors.Collector();
      let one = {};
      one[crit] = criteria[crit];
      let query = api1.searchQuery(one, cache, critErrs);
      if (critErrs.errorCount() > 0) {
        info.error = critErrs.lastError().message;
        info.matches = 0;
      } else {
        queries.push(function(cb) {
          req.db.Motor.count(query, function(err, count) {
            if (err)
              return cb(err);
            info.matches = count;
            cb(null, count);
          });
        });
      }
      criteriaInfo.push(info);
    });

    let results = [];
    if (errs.errorCount() == 0) {
      queries.push(function(cb) {
        req.db.Motor.find(query)
          .sort({ totalImpulse: 1 })
          .exec(function(err, motors) {
            if (err)
              return cb(err);

            // have raw motor results
            results = motors;
            resultMatches = results.length;
            if (maxResults > 0 && results.length > maxResults)
              results.splice(maxResults, results.length - maxResults);

            // count the number of simfiles
            let sfq = { _motor : { $in: motors.map(m => m._id) } };
            req.db.SimFile.find(sfq, '_id _motor').exec(function(err, simfiles) {
              if (err)
                return cb(err);

              motors.forEach(m => {
                m.simFileCount = 0;
                simfiles.forEach(sf => {
                  if (sf._motor.toString() == m._id.toString())
                    m.simFileCount++;
                });
              });

              // default external IDs
              if (req.isLegacy) {
                req.db.IntIdMap.map(motors, function(err, ints) {
                  if (err)
                    return cb(err);
                  if (ints.length != motors.length)
                    return cb(new Error('unable to map motor results to int IDs'));

                  for (let i = 0; i < motors.length; i++)
                    motors[i].externalId = ints[i];

                  return cb(null, motors);
                });
              } else {
                motors.forEach(m => {
                  m.externalId = m._id.toString();
                });
                return cb(null, motors);
              }
            });
          });
      });
    }

    function send() {
      format.elementListFull('criteria', criteriaInfo, { matches: resultMatches });
      format.elementListFull('results', results.map(motor => {
        let mfr = cache.manufacturers.byId(motor._manufacturer, true);
        let org = cache.certOrgs.byId(motor._certOrg, true);
        return {
          "motor-id": motor.externalId,
          'manufacturer': mfr.name,
          'manufacturer-abbrev': mfr.abbrev,
          designation: motor.designation,
          'common-name': motor.commonName,
          'impulse-class': motor.impulseClass,
          diameter: motor.diameter * 1000,
          length: motor.length * 1000,
          type: motor.type,
          'cert-org': org.name,
          'avg-thrust-n': motor.avgThrust,
          'max-thrust-n': motor.maxThrust,
          'tot-impulse-ns': motor.totalImpulse,
          'burn-time-s': motor.burnTime,
          'data-files': motor.simFileCount,
          'info-url': motor.dataSheet,
          'total-weight-g': motor.totalWeight * 1000,
          'prop-weight-g': motor.propellantWeight * 1000,
          delays: motor.delays,
          'case-info': motor.caseInfo,
          'prop-info': motor.propellantInfo,
          sparky: motor.sparky,
          'updated-on': motor.updatedAt,
        };
      }));
      format.send(res);
    }

    if (queries.length > 0) {
      async.parallel(queries, req.success(results => {
        send();
      }));
    } else
      send();
  });
}

router.get(APIPrefix + 'search.json', function(req, res, next) {
  doSearch(req, res, new data.JSONFormat());
});
router.post(APIPrefix + 'search.json', jsonParser, function(req, res, next) {
  doSearch(req, res, new data.JSONFormat());
});
router.get([APIPrefix + 'search.xml', LegacyPrefix + 'search'], function(req, res, next) {
  doSearch(req, res, new data.XMLFormat());
});
router.post([APIPrefix + 'search.xml', LegacyPrefix + 'search'], xmlParser, function(req, res, next) {
  doSearch(req, res, new data.XMLFormat());
});

module.exports = router;
