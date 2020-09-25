/*
 * Copyright 2016-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      bodyParser = require('body-parser'),
      router = express.Router(),
      mongoose = require('mongoose'),
      _ = require('underscore'),
      path = require('path'),
      async = require('async'),
      yamljs = require('yamljs'),
      errors = require('../lib/errors'),
      metadata = require('../lib/metadata'),
      parsers = require('../simulate/parsers'),
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
      res.status(400)
         .send(JSON.stringify({ error: msg }, undefined, 2));
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
      let format = new data.XMLFormat();
      format.root(root);
      format.element('error', msg);
      format.send(res, true);
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
  let spec = yamljs.load(specFile),
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
  format.root('metadata-response', '2008/MetadataResponse');
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
  format.send(res, errs.hasErrors());
}

function doMetadata(req, res, format) {
  let request;
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
router.get(APIPrefix + 'metadata.xml', function(req, res, next) {
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
  let request;
  if (req.method == 'GET')
    request = req.query;
  else
    request = api1.getElement(req.body, 'search-request') || req.body;

  const errs = new errors.Collector();

  let maxResults = api1.getElement(request, "max-results", api1.intValue, errs);
  if (maxResults == null)
    maxResults = 20;
  else if (maxResults <= 0)
    maxResults = -1;

  let resultMatches = 0;

  metadata.get(req, function(cache) {
    let query = api1.searchQuery(request, cache, errs);
    let criteria = api1.searchCriteria(request);

    format.root('search-response', (req.isLegacy ? '2016' : '2020') + '/SearchResponse');
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
    if (errs.errorCount() === 0) {
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

              // map motor IDs
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
      format.error(errs);
      format.send(res, errs.hasErrors());
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
router.get(APIPrefix + 'search.xml', function(req, res, next) {
  doSearch(req, res, new data.XMLFormat());
});
router.post([APIPrefix + 'search.xml', LegacyPrefix + 'search'], xmlParser, function(req, res, next) {
  doSearch(req, res, new data.XMLFormat());
});


/*
 * /api/v1/download
 * Download sim files, either as XML or JSON.
 */
function doDownload(req, res, format) {
  let request;
  if (req.method == 'GET')
    request = req.query;
  else
    request = api1.getElement(req.body, 'download-request') || req.body;

  const errs = new errors.Collector();

  let wantData = true;
  let wantSamples = false;
  let data = api1.getElement(request, "data");
  if (data != null && data !== 'file') {
    if (data === 'samples') {
      wantData = false;
      wantSamples = true;
    } else if (data === 'both') {
      wantData = true;
      wantSamples = true;
    } else {
      errs.error(errors.INVALID_QUERY, 'Invalid data value "{1}".', data);
    }
  }

  let maxResults = api1.getElement(request, "max-results");
  if (isNaN(maxResults) || maxResults <= 0)
    maxResults = -1;

  metadata.get(req, function(cache) {
    let query = api1.downloadQuery(request, cache, errs);

    format.root('download-response', (req.isLegacy ? '2014' : '2020') + '/DownloadResponse');

    function send(results) {
      format.elementListFull('results', results.map(simfile => {
        let result = {
          "motor-id": simfile.externalMotorId,
          "simfile-id": simfile.externalId,
          format: simfile.format,
          source: simfile.dataSource,
          license: simfile.license || '',
        };
        if (wantData)
          result.data = Buffer.from(simfile.data).toString('base64');
        if (wantSamples) {
          let parsed = parsers.parseData(simfile.format, simfile.data, errors.ignore);
          if (parsed != null) {
            result.samples = parsed.points.map(pt => {
              return {
                time: pt.time,
                thrust: pt.thrust,
              };
            });
          }
        }
        result["info-url"] = req.helpers.simfileLink(simfile);
        result["data-url"] = req.helpers.simfileDownloadLink(simfile);
        return result;
      }));
      format.error(errs);
      format.send(res, errs.hasErrors());
    }

    if (errs.errorCount() > 0) {
      send([]);
      return;
    }

    function run() {
      req.db.SimFile.find(query)
        .sort({ updatedAt: -1 })
        .populate('_motor')
        .exec(req.success(function(simfiles) {
          // have raw simfile results
          if (simfiles.length < 1)
            return send(simfiles);
          if (maxResults > 0 && simfiles.length > maxResults)
            simfiles.splice(maxResults, simfiles.length - maxResults);

          // map output motor and simfile IDs
          if (req.isLegacy) {
            async.parallel([
              function(cb) {
                let motors = simfiles.map(s => s._motor);
                req.db.IntIdMap.map(motors, cb);
              },
              function(cb) {
                req.db.IntIdMap.map(simfiles, cb);
              },
            ], req.success(maps => {
              simfiles.forEach((s, i) => {
                s.externalId = maps[1][i];
                s.externalMotorId = maps[0][i];
              });
              send(simfiles);
            }));
          } else {
            simfiles.forEach(s => {
              s.externalId = s._id.toString();
              s.externalMotorId = s._motor._id.toString();
            });
            send(simfiles);
          }
        }));
    }

    // map input motor IDs
    if (req.isLegacy) {
      let ints = [];
      if (query._motor.$in) {
        query._motor.$in.forEach(id => {
          id = api1.intValue(id);
          if (id > 0)
            ints.push(id);
        });
      }
      if (ints.length > 0) {
        req.db.IntIdMap.lookup(req.db.Motor, ints, req.success(function(motors) {
          if (motors.length > 0) {
            query._motor = { $in: motors.map(m => m._id) };
            run();
          } else
            send([]);
        }));
      } else
        send([]);
    } else {
      let ids = [];
      if (query._motor.$in) {
        query._motor.$in.forEach(id => {
          try {
            ids.push(mongoose.Types.ObjectId(id));
          } catch (e) {}
        });
      }
      if (ids.length > 0) {
        query._motor = { $in: ids };
        run();
      } else {
        send([]);
      }
    }
  });
}

router.get(APIPrefix + 'download.json', function(req, res, next) {
  doDownload(req, res, new data.JSONFormat());
});
router.post(APIPrefix + 'download.json', jsonParser, function(req, res, next) {
  doDownload(req, res, new data.JSONFormat());
});
router.get(APIPrefix + 'download.xml', function(req, res, next) {
  doDownload(req, res, new data.XMLFormat());
});
router.post([APIPrefix + 'download.xml', LegacyPrefix + 'download'], xmlParser, function(req, res, next) {
  doDownload(req, res, new data.XMLFormat());
});


module.exports = router;
