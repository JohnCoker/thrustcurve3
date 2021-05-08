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
      units = require('../lib/units'),
      metadata = require('../lib/metadata'),
      parsers = require('../simulate/parsers'),
      flightsim = require('../simulate/flightsim'),
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
 * On errors, instead of a web site page, we send an appropriate error response.
 */
function sendError(req, res, error, status) {
  let msg;
  if (typeof error === 'string')
    msg = error;
  else if (error instanceof Error)
    msg = error.stack;
  if (msg == null || msg === '')
    msg = "Unknown error occurred.";

  if (status == null)
    status = 500;

  let body;
  if (/.json$/.test(req.path)) {
    body = JSON.stringify({ error: msg }, undefined, 2);
  } else if (req.isLegacy || /.xml$/.test(req.path)) {
    let root;
    if (/^\/(?:api\/v1|servlets)\/([a-z]+).*$/.test(req.path))
      root = req.path.replace(/^([a-z1]*\/)*([a-z]*).*$/, "$2-response");
    else
      root = "response";
    let format = new data.XMLFormat();
    format.root(root);
    format.element('error', msg);
    format.send(res, true);
  } else {
    body = msg;
  }

  res.status(status)
     .send(body);
}

function success(req, res, cb) {
  return function(err, result) {
    if (err)
      sendError(req, res, err);
    else
      cb(result);
  };
}

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
      sendError(req, res, msg, 400);
    } else {
      req.isJSON = true;
      next();
    }
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
      sendError(req, res, msg, 400);
    } else {
      req.isXML = true;
      next();
    }
  });
}


/*
 * /api/v1/swagger
 * The Open API specification.
 */
const specFile = path.resolve(__dirname + '/../config/api_v1.yml');

router.get(APIPrefix + 'swagger.yml', function(req, res, _next) {
  res.type('application/yaml').sendFile(specFile);
});
router.get(APIPrefix + 'swagger.json', function(req, res, _next) {
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
  const request = api1.getRequest(req, 'metadata-request');

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

router.get(APIPrefix + 'metadata.json', function(req, res, _next) {
  doMetadata(req, res, new data.JSONFormat());
});
router.post(APIPrefix + 'metadata.json', jsonParser, function(req, res, _next) {
  doMetadata(req, res, new data.JSONFormat());
});
router.get(APIPrefix + 'metadata.xml', function(req, res, _next) {
  doMetadata(req, res, new data.XMLFormat());
});
router.post([APIPrefix + 'metadata.xml', LegacyPrefix + 'metadata'], xmlParser, function(req, res, _next) {
  doMetadata(req, res, new data.XMLFormat());
});


/*
 * /api/v1/search
 * Search for motors, either as XML or JSON.
 */
function criteriaQueries(req, cache, criteria, criteriaInfo, queries) {
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
}

function doSearch(req, res, format) {
  const request = api1.getRequest(req, 'search-request');
  const errs = new errors.Collector();

  format.root('search-response', (req.isLegacy ? '2016' : '2020') + '/SearchResponse');

  const maxResults = api1.getMaxResults(request, errs);

  let resultMatches = 0;

  metadata.get(req, function(cache) {
    let query = api1.searchQuery(request, cache, errs, true);
    let criteria = api1.searchCriteria(request);

    let criteriaInfo = [];
    let queries = [];
    criteriaQueries(req, cache, criteria, criteriaInfo, queries);

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
      async.parallel(queries, success(req, res, _results => {
        send();
      }));
    } else
      send();
  });
}

router.get(APIPrefix + 'search.json', function(req, res, _next) {
  doSearch(req, res, new data.JSONFormat());
});
router.post(APIPrefix + 'search.json', jsonParser, function(req, res, _next) {
  doSearch(req, res, new data.JSONFormat());
});
router.get(APIPrefix + 'search.xml', function(req, res, _next) {
  doSearch(req, res, new data.XMLFormat());
});
router.post([APIPrefix + 'search.xml', LegacyPrefix + 'search'], xmlParser, function(req, res, _next) {
  doSearch(req, res, new data.XMLFormat());
});


/*
 * /api/v1/download
 * Download sim files, either as XML or JSON.
 */
function doDownload(req, res, format) {
  const request = api1.getRequest(req, 'download-request');
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

  const maxResults = api1.getMaxResults(request, errs, -1);

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
        .exec(success(req, res, function(simfiles) {
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
            ], success(req, res, maps => {
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
        req.db.IntIdMap.lookup(req.db.Motor, ints, success(req, res, function(motors) {
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
          } catch (e) {
            // invalid ID; drop from query
          }
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

router.get(APIPrefix + 'download.json', function(req, res, _next) {
  doDownload(req, res, new data.JSONFormat());
});
router.post(APIPrefix + 'download.json', jsonParser, function(req, res, _next) {
  doDownload(req, res, new data.JSONFormat());
});
router.get(APIPrefix + 'download.xml', function(req, res, _next) {
  doDownload(req, res, new data.XMLFormat());
});
router.post([APIPrefix + 'download.xml', LegacyPrefix + 'download'], xmlParser, function(req, res, _next) {
  doDownload(req, res, new data.XMLFormat());
});


/*
 * /api/v1/getrockets
 * Download saved rockets for a contributor (account).
 */
function sendUnauthorized(req, res, format) {
  res.status(401);
  let errs = new errors.Collector();
  errs(errors.INVALID_LOGIN, 'Invalid username/password specified.');
  format.error(errs);
  format.send(res);
}

function doGetRockets(req, res, format) {
  const request = api1.getRequest(req, 'getrockets-request');
  const errs = new errors.Collector();

  format.root('getrockets-response', (req.isLegacy ? '2015' : '2020') + '/GetRocketsResponse');

  function query(user, publicOnly) {
    let q = { _contributor: user._id };
    if (publicOnly)
      q.public = true;
    req.db.Rocket.find(q).exec(success(req, res, function(rockets) {
      function send(rockets) {
        format.elementListFull('results', 'rocket', rockets.map(rocket => {
          let info = {
            id: rocket.externalId,
            name: rocket.name,
          };
          if (!req.isLegacy)
            info.public = rocket.public;

          function m(n, unit) {
            return units.convertUnitToMKS(n, 'length', unit);
          }
          function mm(n, unit) {
            let m = units.convertUnitToMKS(n, 'length', unit);
            if (m == null)
              return;
            return Math.round(m * 1000000) / 1000;
          }
          function kg(n, unit) {
            return units.convertUnitToMKS(n, 'mass', unit);
          }

          info['body-diameter-m'] = m(rocket.bodyDiameter, rocket.bodyDiameterUnit);
          info['mmt-diameter-mm'] = mm(rocket.mmtDiameter, rocket.mmtDiameterUnit);
          info['mmt-length-mm'] = mm(rocket.mmtLength, rocket.mmtLengthUnit);
          if (!req.isLegacy)
            info['mmt-count'] = rocket.mmtCount;
          info['weight-kg'] = kg(rocket.weight, rocket.weightUnit);
          if (!req.isLegacy && rocket.adapters != null && rocket.adapters.length > 0) {
            info.adapters = rocket.adapters.map(adapter => {
              return {
                'mmt-diameter-mm': mm(adapter.mmtDiameter, adapter.mmtDiameterUnit),
                'mmt-length-mm': mm(adapter.mmtLength, adapter.mmtLengthUnit),
                'weight-kg': kg(adapter.weight, adapter.weightUnit),
              };
            });
          }
          info.cd = rocket.cd;
          info['guide-length-m'] = m(rocket.guideLength, rocket.guideLengthUnit);
          info.website = rocket.website;
          info.comments = rocket.comments;
          info['created-on'] = rocket.createdAt;
          info['updated-on'] = rocket.updatedAt;
          return info;
        }));
        format.error(errs);
        format.send(res);
      }

      if (req.isLegacy) {
        req.db.IntIdMap.map(rockets, success(req, res, function(ints) {
          if (ints.length != rockets.length)
            return sendError(req, res, new Error('unable to map rocket results to int IDs'));
          for (let i = 0; i < rockets.length; i++)
            rockets[i].externalId = ints[i];
          send(rockets);
        }));
      } else {
        rockets.forEach(r => r.externalId = r._id.toString());
        send(rockets);
      }
    }));
  }

  let username = api1.getElement(request, "username");
  let password = api1.getElement(request, "password");
  if (req.method == 'GET' && username == null) {
    // expect user to be logged in
    if (req.user != null)
      query(req.user, false);
    else
      sendUnauthorized(req, res, format);
  } else {
    req.db.Contributor.findOne({ email: username }, success(req, res, function(user) {
      if (user == null) {
        // email not registered
        sendUnauthorized(req, res, format);
      } else if (password == null) {
        // public rockets for this useer
        query(user, true);
      } else {
        // validate password
        user.comparePassword(password, success(req, res, function(isMatch) {
          if (!isMatch)
            sendUnauthorized(req, res, format);
          else
            query(user, false);
        }));
      }
    }));
  }
}

router.get(APIPrefix + 'getrockets.json', function(req, res, _next) {
  doGetRockets(req, res, new data.JSONFormat());
});
router.post(APIPrefix + 'getrockets.json', jsonParser, function(req, res, _next) {
  doGetRockets(req, res, new data.JSONFormat());
});
router.get(APIPrefix + 'getrockets.xml', function(req, res, _next) {
  doGetRockets(req, res, new data.XMLFormat());
});
router.post([APIPrefix + 'getrockets.xml', LegacyPrefix + 'getrockets'], xmlParser, function(req, res, _next) {
  doGetRockets(req, res, new data.XMLFormat());
});


/*
 * /api/v1/saverockets
 * Save defined rockets for a contributor (account).
 */
function doSaveRockets(req, res, format) {
  const request = api1.getRequest(req, 'saverockets-request');
  const errs = new errors.Collector();

  format.root('saverockets-response', '2020/SaveRocketsResponse');

  let results = [];
  function send() {
    format.elementListFull('results', results);
    format.error(errs);
    format.send(res, errs.hasErrors());
  }

  function query(user) {
    req.db.Rocket.find({ _contributor: user._id }).exec(success(req, res, function(existing) {
      req.user = user;
      let upserts = api1.rocketModels(req, request, errs, existing, results);
      if (upserts != null && upserts.length > 0) {
        let saves = [];
        upserts.forEach(upsert => {
          saves.push(function(cb) {
            const wasNew = upsert.isNew;
            upsert.save(function(err, updated) {
              let result = {
                'client-id': upsert.clientId,
                id: upsert.id,
                name: upsert.name,
              };
              if (err) {
                errs(errors.INVALID_ROCKET, 'Error saving rocket definition: {1}', err.message);
                result.status = 'invalid';
              } else {
                result.id = updated._id.toString();
                result.status = wasNew ? 'created' : 'updated';
              }
              results.push(result);
              cb(null, result);
            });
          });
        });
        async.parallel(saves, success(req, res, _results => {
          send();
        }));
      } else {
        // nothing to save
        send();
      }
    }));
  }

  // check credentials
  let username = api1.getElement(request, "username");
  let password = api1.getElement(request, "password");
  if (req.method == 'GET' && username == null) {
    // expect user to be logged in
    if (req.user != null)
      query(req.user);
    else
      sendUnauthorized(req, res, format);
  } else {
    req.db.Contributor.findOne({ email: username }, success(req, res, function(user) {
      if (user == null || password == null) {
        sendUnauthorized(req, res, format);
      } else {
        // validate password
        user.comparePassword(password, success(req, res, function(isMatch) {
          if (!isMatch)
            sendUnauthorized(req, res, format);
          else
            query(user);
        }));
      }
    }));
  }
}

router.post(APIPrefix + 'saverockets.json', jsonParser, function(req, res, _next) {
  doSaveRockets(req, res, new data.JSONFormat());
});
router.post(APIPrefix + 'saverockets.xml', xmlParser, function(req, res, _next) {
  doSaveRockets(req, res, new data.XMLFormat());
});


/*
 * /api/v1/motorguide
 * Find motors that work for a rocket design.
 */
const MinGuideVelocity = 14.9,
      MinThrustWeight = 4.5;

function minAltitude(motor) {
  return 10.0 * (Math.log(motor.totalImpulse) / Math.log(2));
}

function doMotorGuide(req, res, format) {
  const request = api1.getRequest(req, 'motorguide-request');
  const errs = new errors.Collector();

  format.root('motorguide-response', (req.isLegacy ? '2014' : '2020') + '/MotorGuideResponse');

  let criteriaInfo = [];
  let criteriaMatches = 0;
  let results = [];
  let okCount = 0, failedCount = 0;
  function send() {
    format.elementListFull('criteria', criteriaInfo, { matches: criteriaMatches });
    format.elementListFull('results', results,
                           { 'ok-count': okCount, 'failed-count': failedCount }, true);
    format.error(errs);
    format.send(res, errs.hasErrors());
  }

  const maxResults = api1.getMaxResults(request, errs);

  const conditions = {
    temperature: 20,
    altitude: 0,
  };

  metadata.get(req, function(cache) {
    let rocket = api1.guideRocket(req, request, errs);
    let search = api1.searchQuery(request, cache, errs);
    if (rocket == null || errs.hasErrors()) {
      send();
      return;
    }

    let criteria = api1.searchCriteria(request);
    let queries = [];
    criteriaQueries(req, cache, criteria, criteriaInfo, queries);
    async.parallel(queries, success(req, res, _results => {
      req.db.Motor.count(search).exec(success(req, res, function(matchCount) {
        criteriaMatches = matchCount;
        if (matchCount < 1) {
          send();
          return;
        }
        search.diameter = { $gt: rocket.mmtDiameter - metadata.MotorDiameterTolerance,
                            $lt: rocket.mmtDiameter + metadata.MotorDiameterTolerance };
        search.length = { $lt: rocket.mmtLength + metadata.MotorDiameterTolerance };
        req.db.Motor.find(search)
                    .sort({ totalImpulse: 1 })
                    .exec(success(req, res, function(motors) {
          req.db.SimFile.find({ _motor: { $in: _.pluck(motors, '_id') } })
                        .sort({ _motor: 1, updatedAt: -1 })
                        .exec(success(req, res, function(simfiles) {
            // for each motor, get what info we can
            motors.forEach(motor => {

              // simulation inputs for this motor
              let simInputs = _.extend({}, rocket, {
                motorInitialMass: flightsim.motorInitialMass(motor),
                motorBurnoutMass: flightsim.motorBurnoutMass(motor),
              });

              // for each motor, run the first simulation we can
              let motorFiles = _.filter(simfiles, function(f) {
                return f._motor.toString() == motor._id.toString();
              });
              let simulation;
              motorFiles.forEach(motorFile => {
                // parse the data in the sim file
                let data = parsers.parseData(motorFile.format, motorFile.data, new errors.Collector());
                if (data != null) {
                  let simErrors = new errors.Collector();
                  simulation = flightsim.simulate(simInputs, data, conditions, simErrors);
                }
              });

              // determine if this motor works or not
              let ttw = (motor.avgThrust / flightsim.GravityMSL) / (simInputs.rocketMass + simInputs.motorInitialMass);
              let result = {};
              if (simulation != null) {
                // simulation; check guide velocity and min altitude
                if (simulation.guideVelocity < MinGuideVelocity)
                  result.status = 'guide-vel';
                else if (simulation.maxAltitude > 0 && result.maxAltitude < minAltitude(motor))
                  result.status = 'too-low';
              } else {
                // no simulation; check thrust/weight ratio
                if (ttw < MinThrustWeight)
                  result.status = '5-to-1';
              }
              if (result.status != null) {
                failedCount++;
              } else {
                result.status = 'ok';
                okCount++;
              }

              // set up motor info
              result['motor-id'] = motor._id.toString();
              result.manufacturer = cache.manufacturers.byId(motor._manufacturer).name;
              result['manufacturer-abbrev'] = cache.manufacturers.byId(motor._manufacturer).abbrev;
              result.designation = motor.designation;
              result['common-name'] = motor.commonName;
              result['thrust-to-weight'] = ttw;
              result['simulations-run'] = 0;

              // add the simulation info if we have it
              if (simulation != null) {
                result['simulations-run'] = 1;
                result['liftoff-mass'] = simulation.liftoffMass;
                result['burnout-mass'] = simulation.burnoutMass;
                result['liftoff-time'] = simulation.liftoffTime;
                result['burnout-time'] = simulation.burnoutTime;
                result['apogee-time'] = simulation.apogeeTime;
                result['max-acceleration'] = simulation.maxAcceleration;
                result['guide-velocity'] = simulation.guideVelocity;
                result['max-velocity'] = simulation.maxVelocity;
                result['burnout-altitude'] = simulation.burnoutAltitude;
                result['max-altitude'] = simulation.maxAltitude;
                if (simulation.apogeeTime > simulation.burnoutTime)
                  result['optimal-delay'] = simulation.apogeeTime - simulation.burnoutTime;
              }

              results.push(result);
            });

            // if we have motors that work, drop the failures
            if (okCount > 0)
              results = results.filter(r => r.status === 'ok');
            if (maxResults > 0 && results.length > maxResults)
              results.length = maxResults;

            if (results.length > 0 && req.isLegacy) {
              // map motor IDs
              req.db.IntIdMap.map(motors, success(req, res, function(ints) {
                results.forEach(result => {
                  let index = motors.indexOf(motors.find(m => m._id.toString() === result['motor-id']));
                  result['motor-id'] = ints[index];
                });
                send();
              }));
            } else {
              send();
            }
          }));
        }));
      }));
    }));
  });
}

router.get(APIPrefix + 'motorguide.json', function(req, res, _next) {
  doMotorGuide(req, res, new data.JSONFormat());
});
router.post(APIPrefix + 'motorguide.json', jsonParser, function(req, res, _next) {
  doMotorGuide(req, res, new data.JSONFormat());
});
router.get(APIPrefix + 'motorguide.xml', function(req, res, _next) {
  doMotorGuide(req, res, new data.XMLFormat());
});
router.post([APIPrefix + 'motorguide.xml', LegacyPrefix + 'motorguide'], xmlParser, function(req, res, _next) {
  doMotorGuide(req, res, new data.XMLFormat());
});


module.exports = router;
