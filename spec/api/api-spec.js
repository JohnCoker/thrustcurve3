"use strict";

const fs = require('fs'),
      path = require('path'),
      http = require('http'),
      process = require('child_process');

/*
 * Set to true to update response expectations.
 * This must be false for normal testing.
 */
const updateExpected = false;

function get(path, headers) {
  return new Promise((resolve, reject) => {
    let req = http.request({
      host: 'localhost',
      port: 3000,
      path,
      headers,
    }, rsp => {
      let body = '';
      rsp.on('data', chunk => body += chunk);
      rsp.on('end', () => resolve(body));
      rsp.on('error', e => reject(e));
    });
    req.end();
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    let req = http.request({
      host: 'localhost',
      port: 3000,
      method: 'POST',
      path,
    }, rsp => {
      let body = '';
      rsp.on('data', chunk => body += chunk);
      rsp.on('end', () => resolve(body));
      rsp.on('error', e => reject(e));
    });
    if (body != null)
      req.write(body);
    req.end();
  });
}

describe("API v1", function() {
  // expected responses are comitted for comparison
  const specPath = __dirname.endsWith("/spec/api") ? __dirname : __dirname + '/spec/api';
  const expectedDir = path.resolve(specPath + "/expected");

  beforeAll(function() {
    fs.accessSync(expectedDir);

    var currentSpec;
    jasmine.getEnv().addReporter({
      specStarted: function(spec) {
        currentSpec = spec;
      },
      specDone: function(spec) {
        currentSpec = null;
      },
    });

    jasmine.addMatchers({
      toBeExpected: function(util, customEqualityTesters) {
        return {
          compare: function(actual, regex, replace) {
            let expectFile = currentSpec.fullName.replace(/^API v1 */i, '')
                                        .replace(/ +JSON$/i, '.json')
                                        .replace(/ +XML$/i, '.xml')
                                        .replace(/ +legacy$/i, '-legacy.xml')
                                        .replace(/ +/g, '-');
            if (actual == null || actual.trim() === '') {
              return {
                pass: false,
                message: 'Expected ' + actual + ' to have content',
              };
            }
            if (regex != null) {
              if (replace == null)
                replace = '';
              actual = actual.replace(regex, replace);
            }
            if (updateExpected) {
              fs.writeFileSync(expectedDir + "/" + expectFile, actual);
            } else {
              let expected;
              try {
                expected = fs.readFileSync(expectedDir + "/" + expectFile, { encoding: 'utf8' });
              } catch (e) {
                expected = null;
              }
              if (expected == null || expected === '') {
                return {
                  pass: false,
                  message: 'Missing expected file ' + expectFile,
                };
              }
              if (actual !== expected) {
                const actualLines = actual.split(/\r?\n/);
                const expectedLines = expected.split(/\r?\n/);
                let max = Math.max(actualLines.length, expectedLines.length);
                let diff = [ actual, expected ];
                for (let i = 0; i < max; i++) {
                  let actualLine = actualLines.length > i ? actualLines[i] : '';
                  let expectedLine = expectedLines.length > i ? expectedLines[i] : '';
                  if (actualLine != expectedLine) {
                    diff = [ '', '' ];
                    if (i > 0) {
                      if (actualLines.length > i)
                        diff[0] += '... ';
                      if (expectedLines.length > i)
                        diff[1] += '... ';
                    }
                    diff[0] += actualLine;
                    diff[1] += expectedLine;
                    diff[0] += i + 1 < actualLines.length ? ' ...' : ' EOF';
                    diff[1] += i + 1 < expectedLines.length ? ' ...' : ' EOF';
                    break;
                  }
                }
                return {
                  pass: false,
                  message: 'Expected ' + diff[0] + ' to be ' + diff[1],
                };
              }
            }
            return {
              pass: true,
            };
          }
        };
        
      },

      toBeValidJSON: function(util, customEqualityTesters) {
        return {
          compare: function(actual) {
            if (actual == null || actual.trim() === '') {
              return {
                pass: false,
                message: 'Expected ' + actual + ' to be valid JSON',
              };
            }
            let parsed;
            try {
              parsed = JSON.parse(actual);
            } catch (e) {
              return {
                pass: false,
                message: 'Expected ' + actual + ' to be valid JSON',
              };
            }
            if (parsed == null || typeof parsed !== 'object') {
              return {
                pass: false,
                message: 'Expected ' + actual + ' to parse to an object',
              };
            }
            return {
              pass: true,
            };
          }
        };
      },

      toBeValidXML: function(util, customEqualityTesters) {
        return {
          compare: function(actual, schema) {
            if (actual == null || actual === '') {
              return {
                pass: false,
                message: 'Expected ' + actual + ' to be valid XML.',
              };
            }
            const file = "/tmp/api-response-" + (Math.random() * 1000000).toFixed() + ".xml";
            fs.writeFileSync(file, actual);
            const xsd = path.resolve(specPath + "/../../public/" + schema);
            const cmd = `xmllint --noout --schema '${xsd}' '${file}'`;
            try {
              process.execSync(`${cmd} > /dev/null 2>&1`);
              fs.unlinkSync(file);
            } catch (e) {
              console.error(e.message);
              return {
                pass: false,
                message: 'Expected ' + schema + ' to validate.',
              };
            }
            return {
              pass: true,
            };
          }
        };
      },

      toMatchN: function(util, customEqualityTesters) {
        return {
          compare: function(actual, match, n) {
            if (typeof n !== 'number' || !isFinite(n) || n < 0) {
              return {
                pass: false,
                message: 'Expected a count of matches',
              };
            }
            let count;
            if (actual == null) {
              count = 0;
            } else {
              let global = match.global ? match : new RegExp(match, match.flags + 'g');
              let a = actual.match(global);
              count = a == null ? 0 : a.length;
            }
            if (count !== n) {
              return {
                pass: false,
                message: 'Expected ' + match + ' to match ' + n + ' times, but it matched ' + count + '.',
              };
            }
            return {
              pass: true,
            };
          }
        };
      },
    });
  });

  describe("metadata", function() {
    const SCHEMA = "2008/metadata-response.xsd";
    describe("GET", function() {
      it("all JSON", function(done) {
        get('/api/v1/metadata.json').then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatch(/Kosdon/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("all XML", function(done) {
        get('/api/v1/metadata.xml').then(response => {
          expect(response).toBeValidXML(SCHEMA);
          expect(response).toMatch(/Kosdon/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("avail JSON", function(done) {
        get('/api/v1/metadata.json?availability=available').then(response => {
          expect(response).toBeValidJSON();
          expect(response).not.toMatch(/Kosdon/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("avail XML", function(done) {
        get('/api/v1/metadata.xml?availability=available').then(response => {
          expect(response).toBeValidXML(SCHEMA);
          expect(response).not.toMatch(/Kosdon/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
    describe("POST", function() {
      it("all legacy", function(done) {
        post('/servlets/metadata').then(response => {
          expect(response).toBeValidXML(SCHEMA);
          expect(response).toMatch(/Kosdon/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("all JSON", function(done) {
        post('/api/v1/metadata.json').then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatch(/Kosdon/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("all XML", function(done) {
        post('/api/v1/metadata.xml').then(response => {
          expect(response).toBeValidXML(SCHEMA);
          expect(response).toMatch(/Kosdon/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("avail legacy", function(done) {
        let body = `<metadata-request>
                     <availability>available</availability>
                    </metadata-request>`;
        post('/servlets/metadata', body).then(response => {
          expect(response).toBeValidXML(SCHEMA);
          expect(response).not.toMatch(/Kosdon/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("avail JSON", function(done) {
        let body = '{ "availability": "available" }';
        post('/api/v1/metadata.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).not.toMatch(/Kosdon/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("avail XML", function(done) {
        let body = `<metadata-request>
                     <availability>available</availability>
                    </metadata-request>`;
        post('/api/v1/metadata.xml', body).then(response => {
          expect(response).toBeValidXML(SCHEMA);
          expect(response).not.toMatch(/Kosdon/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
  });

  describe("search", function() {
    const API_SCHEMA = "2020/search-response.xsd";
    const LEGACY_SCHEMA = "2016/search-response.xsd";
    describe("GET", function() {
      it("manufacturer JSON", function(done) {
        get('/api/v1/search.json?manufacturer=Estes').then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatch(/Estes/);
          expect(response).not.toMatch(/AeroTech/);
          expect(response).toMatchN(/"motorId":/, 20);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("manufacturer XML", function(done) {
        get('/api/v1/search.xml?manufacturer=Estes').then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatch(/Estes/);
          expect(response).not.toMatch(/AeroTech/);
          expect(response).toMatchN(/<result>/, 20);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("manufacturer XML", function(done) {
        get('/api/v1/search.xml?manufacturer=Estes').then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatch(/Estes/);
          expect(response).not.toMatch(/AeroTech/);
          expect(response).toMatchN(/<result>/, 20);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("invalid JSON", function(done) {
        get('/api/v1/search.json?imaginary=4').then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatch(/"error": *"Invalid search criterion \\"imaginary\\"./);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("invalid XML", function(done) {
        get('/api/v1/search.xml?imaginary=4').then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatch(/<error>Invalid search criterion "imaginary".<\/error>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
    describe("POST", function() {
      it("manufacturer legacy", function(done) {
        let body = `<search-request>
                     <manufacturer>Estes</manufacturer>
                    </search-request>`;
        post('/servlets/search', body).then(response => {
          expect(response).toBeValidXML(LEGACY_SCHEMA);
          expect(response).toMatch(/Estes/);
          expect(response).not.toMatch(/AeroTech/);
          expect(response).toMatch(/<matches>22<\/matches>/);
          expect(response).toMatchN(/<result>/, 20);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("manufacturer JSON", function(done) {
        let body = '{ "manufacturer": "Estes" }';
        post('/api/v1/search.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatch(/Estes/);
          expect(response).not.toMatch(/AeroTech/);
          expect(response).toMatch(/"matches": *22/);
          expect(response).toMatchN(/"motorId":/, 20);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("manufacturer XML", function(done) {
        let body = `<search-request>
                     <manufacturer>Estes</manufacturer>
                    </search-request>`;
        post('/api/v1/search.xml', body).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatch(/Estes/);
          expect(response).not.toMatch(/AeroTech/);
          expect(response).toMatch(/<matches>22<\/matches>/);
          expect(response).toMatchN(/<result>/, 20);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
  });

  describe("download", function() {
    const API_SCHEMA = "2020/download-response.xsd";
    const LEGACY_SCHEMA = "2014/download-response.xsd";
    describe("GET", function() {
      it("motorId JSON", function(done) {
        get('/api/v1/download.json?motorId=56a409280002310000000146').then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatch(/"motorId": *"56a409280002310000000146"/);
          expect(response).toMatch(/"simfileId": *"56a409280002e900000003c5"/);
          expect(response).toMatch(/"data": *"PGVuZ2luZS1kYXRhYmF/);
          expect(response).not.toMatch(/"samples":/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("motor-id XML", function(done) {
        get('/api/v1/download.xml?motor-id=56a409280002310000000146').then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatch(/<motor-id>56a409280002310000000146<\/motor-id>/);
          expect(response).toMatch(/<simfile-id>56a409280002e900000003c5<\/simfile-id>/);
          expect(response).toMatch(/<data>PGVuZ2luZS1kYXRhYmF/);
          expect(response).not.toMatch(/<samples>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
    describe("POST", function() {
      let legacyIds;
      beforeAll(function(done) {
        // make sure ID is mapped for legacy API
        let body = `<search-request>
                     <manufacturer>AeroTech</manufacturer>
                     <impulseClass>K</impulseClass>
                     <diameter>54</diameter>
                    </search-request>`;
        post('/servlets/search', body).then(response => {
          legacyIds = response.match(/<motor-id>\d+<\/motor-id>/g)
                              .map(e => e.replace(/<motor-id>(\d+)<\/motor-id>/, "$1"));
          legacyIds.sort((a, b) => parseInt(a) - parseInt(b));
          expect(legacyIds).toEqual(['301','306','326','344','346','358','359','486','494',
                                     '495','529','590','898','899','905','967','969','1034']);
          done();
        });
      });
      it("motorId JSON", function(done) {
        let body = '{ "motorId": "56a409280002310000000146" }';
        post('/api/v1/download.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatchN(/"motorId": *"56a409280002310000000146"/, 2);
          expect(response).toMatch(/"simfileId": *"56a409280002e900000003c5"/);
          expect(response).toMatch(/"data": *"PGVuZ2luZS1kYXRhYmF/);
          expect(response).not.toMatch(/"samples":/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("motor-id XML", function(done) {
        let body = `<download-request>
                     <motor-id>56a409280002310000000146</motor-id>
                    </download-request>`;
        post('/api/v1/download.xml', body).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatchN(/<motor-id>56a409280002310000000146<\/motor-id>/, 2);
          expect(response).toMatch(/<simfile-id>56a409280002e900000003c5<\/simfile-id>/);
          expect(response).toMatch(/<data>PGVuZ2luZS1kYXRhYmF/);
          expect(response).not.toMatch(/<samples>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("motor-id legacy", function(done) {
        let body = `<download-request>
                     <motor-id>326</motor-id>
                    </download-request>`;
        post('/servlets/download', body).then(response => {
          expect(response).toBeValidXML(LEGACY_SCHEMA);
          expect(response).toMatchN(/<motor-id>326<\/motor-id>/, 2);
          expect(response).toMatch(/<simfile-id>113<\/simfile-id>/);
          expect(response).toMatch(/<data>PGVuZ2luZS1kYXRhYmF/);
          expect(response).not.toMatch(/<samples>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });

      it("motorIds JSON", function(done) {
        let body = '{ "motorIds": [ "56a409280002310000000146", "56a40928000231000000012d" ] }';
        post('/api/v1/download.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatchN(/"motorId": *"56a40928000231000000012d"/, 2);
          expect(response).toMatchN(/"motorId": *"56a409280002310000000146"/, 2);
          expect(response).toMatchN(/"simfileId":/, 4);
          expect(response).toMatchN(/"data":/, 4);
          expect(response).not.toMatch(/"samples":/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("motor-ids XML", function(done) {
        let body = `<download-request>
                     <motor-ids>
                      <id>56a40928000231000000012d</id>
                      <id>56a409280002310000000146</id>
                     </motor-ids>
                    </download-request>`;
        post('/api/v1/download.xml', body).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatchN(/<motor-id>56a40928000231000000012d<\/motor-id>/, 2);
          expect(response).toMatchN(/<motor-id>56a409280002310000000146<\/motor-id>/, 2);
          expect(response).toMatchN(/<simfile-id>/, 4);
          expect(response).toMatchN(/<data>/, 4);
          expect(response).not.toMatch(/<samples>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("motor-ids legacy", function(done) {
        let body = `<download-request>
                     <motor-ids>
                      <id>301</id>
                      <id>326</id>
                     </motor-ids>
                    </download-request>`;
        post('/servlets/download', body).then(response => {
          expect(response).toBeValidXML(LEGACY_SCHEMA);
          expect(response).toMatchN(/<motor-id>301<\/motor-id>/, 2);
          expect(response).toMatchN(/<motor-id>326<\/motor-id>/, 2);
          expect(response).toMatchN(/<simfile-id>/, 4);
          expect(response).toMatchN(/<data>/, 4);
          expect(response).not.toMatch(/<samples>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
  });

  describe("getrockets", function() {
    const API_SCHEMA = "2020/getrockets-response.xsd";
    const LEGACY_SCHEMA = "2015/getrockets-response.xsd";
    describe("GET", function() {
      let headers = {
        'Authorization': 'Basic ZmxpZXIuZnJlZEBnbWFpbC5jb206c2VjcmV0',
      };
      xit("mine JSON", function(done) {
        get('/api/v1/getrockets.json', headers).then(response => {
          expect(response).toBeValidJSON();
          expect(response).not.toMatchN(/"rocket":/, 3);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      xit("mine XML", function(done) {
        get('/api/v1/getrockets.xml', headers).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatchN(/<rocket>/, 3);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("others JSON", function(done) {
        get('/api/v1/getrockets.json?username=flier.fred@gmail.com').then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatchN(/"id":/, 2);
          expect(response).toMatch(/"name": *"Alpha III"/);
          expect(response).toMatch(/"name": *"Versatile"/);
          expect(response).not.toMatch(/Secret Project/);
          expect(response).toMatchN(/"adapters": *\[/, 1);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("others XML", function(done) {
        get('/api/v1/getrockets.xml?username=flier.fred@gmail.com').then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatchN(/<rocket>/, 2);
          expect(response).toMatch(/<name>Alpha III<\/name>/);
          expect(response).toMatch(/<name>Versatile<\/name>/);
          expect(response).toMatchN(/<adapter>/, 1);
          expect(response).not.toMatch(/Secret Project/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
    describe("POST", function() {
      it("mine JSON", function(done) {
        let body = `{
                      "username": "flier.fred@gmail.com",
                      "password": "secret"
                    }`;
        post('/api/v1/getrockets.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatchN(/"id":/, 3);
          expect(response).toMatch(/"name": *"Alpha III"/);
          expect(response).toMatch(/"name": *"Secret Project"/);
          expect(response).toMatch(/"name": *"Versatile"/);
          expect(response).toMatchN(/"adapters": *\[/, 1);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("mine XML", function(done) {
        let body = `<getrockets-request>
                     <username>flier.fred@gmail.com</username>
                     <password>secret</password>
                    </getrockets-request>`;
        post('/api/v1/getrockets.xml', body).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatchN(/<rocket>/, 3);
          expect(response).toMatch(/<name>Alpha III<\/name>/);
          expect(response).toMatch(/<name>Secret Project<\/name>/);
          expect(response).toMatch(/<name>Versatile<\/name>/);
          expect(response).toMatchN(/<adapter>/, 1);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("mine legacy", function(done) {
        let body = `<getrockets-request>
                     <username>flier.fred@gmail.com</username>
                     <password>secret</password>
                    </getrockets-request>`;
        post('/servlets/getrockets', body).then(response => {
          expect(response).toBeValidXML(LEGACY_SCHEMA);
          expect(response).toMatchN(/<rocket>/, 3);
          expect(response).toMatch(/<name>Alpha III<\/name>/);
          expect(response).toMatch(/<name>Secret Project<\/name>/);
          expect(response).toMatch(/<name>Versatile<\/name>/);
          expect(response).not.toMatch(/<adapter>/);
          expect(response).toBeExpected(/<id>100000\d<\/id>/g, '<id>100000x<\/id>');
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("others JSON", function(done) {
        let body = `{
                      "username": "flier.fred@gmail.com"
                    }`;
        post('/api/v1/getrockets.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatchN(/"id":/, 2);
          expect(response).toMatch(/"name": *"Alpha III"/);
          expect(response).toMatch(/"name": *"Versatile"/);
          expect(response).not.toMatch(/"name": *"Secret Project"/);
          expect(response).toMatchN(/"adapters": *\[/, 1);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("others XML", function(done) {
        let body = `<getrockets-request>
                     <username>flier.fred@gmail.com</username>
                    </getrockets-request>`;
        post('/api/v1/getrockets.xml', body).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatchN(/<rocket>/, 2);
          expect(response).toMatch(/<name>Alpha III<\/name>/);
          expect(response).toMatch(/<name>Versatile<\/name>/);
          expect(response).not.toMatch(/<name>Secret Project<\/name>/);
          expect(response).toMatchN(/<adapter>/, 1);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("others legacy", function(done) {
        let body = `<getrockets-request>
                     <username>flier.fred@gmail.com</username>
                    </getrockets-request>`;
        post('/servlets/getrockets', body).then(response => {
          expect(response).toBeValidXML(LEGACY_SCHEMA);
          expect(response).toMatchN(/<rocket>/, 2);
          expect(response).toMatch(/<name>Alpha III<\/name>/);
          expect(response).toMatch(/<name>Versatile<\/name>/);
          expect(response).not.toMatch(/<name>Secret Project<\/name>/);
          expect(response).not.toMatch(/<adapter>/);
          expect(response).toBeExpected(/<id>100000\d<\/id>/g, '<id>100000x<\/id>');
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
  });

  describe("saverockets", function() {
    function cleanup(done) {
      let proc = process.exec('mongo', (err, stdout) => {
        done(err);
      });
      proc.stdin.write(`use test
                        db.rockets.remove({ name: { $regex: /^mobile/i } })`);
      proc.stdin.end();
    }
    beforeEach(cleanup);
    afterAll(cleanup);

    const API_SCHEMA = "2020/saverockets-response.xsd";
    describe("missing values", function() {
      it("JSON", function(done) {
        const body = `{
                        "username": "flier.fred@gmail.com",
                        "password": "secret",
                        "rockets": [{
                          "clientId": "29384756-abcdef"
                         }]
                      }`;
        post('/api/v1/saverockets.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatchN(/"clientId": *"29384756-abcdef"/, 1);
          expect(response).toMatchN(/"status": "invalid"/, 1);
          expect(response).toMatch(/"error": *"Missing rocket name value./);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("XML", function(done) {
        const body = `<saverockets-request>
                        <username>flier.fred@gmail.com</username>
                        <password>secret</password>
                        <rockets>
                          <rocket>
                            <client-id>29384756-abcdef</client-id>
                          </rocket>
                        </rockets>
                      </saverockets-request>`;
        post('/api/v1/saverockets.xml', body).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatchN(/<client-id>29384756-abcdef<\/client-id>/, 1);
          expect(response).toMatchN(/<status>invalid<\/status>/, 1);
          expect(response).toMatch(/<error>Missing rocket name value./);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
    describe("unchanged-complete", function() {
      it("JSON", function(done) {
        const body = `{
                        "username": "flier.fred@gmail.com",
                        "password": "secret",
                        "rockets": [{
                          "clientId": "abcde-12345",
                          "id": "5f70ff46e645437e11edd06b",
                          "name": "Alpha III",
                          "public": true,
                          "bodyDiameterM": 0.024892,
                          "mmtDiameterMm": 18,
                          "mmtLengthMm": 76.2,
                          "mmtCount": 1,
                          "weightKg": 0.0340194,
                          "cd": 0.4,
                          "guideLengthM": 0.9144,
                          "website": "https://estesrockets.com/product/001256-alpha-iii/",
                          "comments": "This is my first rocket; I'm very proud!"
                        }]
                      }`;
        post('/api/v1/saverockets.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatchN(/"clientId": *"abcde-12345"/, 1);
          expect(response).toMatchN(/"status": *"unchanged"/, 1);
          expect(response).not.toMatch(/"error":/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("XML", function(done) {
        const body = `<saverockets-request>
                        <username>flier.fred@gmail.com</username>
                        <password>secret</password>
                        <rockets>
                          <rocket>
                            <client-id>abcde-12345</client-id>
                            <id>5f70ff46e645437e11edd06b</id>
                            <name>Alpha III</name>
                            <public>true</public>
                            <body-diameter-m>0.024892</body-diameter-m>
                            <mmt-diameter-mm>18</mmt-diameter-mm>
                            <mmt-length-mm>76.2</mmt-length-mm>
                            <mmt-count>1</mmt-count>
                            <weight-kg>0.0340194</weight-kg>
                            <cd>0.4</cd>
                            <guide-length-m>0.9144</guide-length-m>
                            <website>https://estesrockets.com/product/001256-alpha-iii/</website>
                            <comments>This is my first rocket; I'm very proud!</comments>
                          </rocket>
                        </rockets>
                      </saverockets-request>`;
        post('/api/v1/saverockets.xml', body).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatchN(/<client-id>abcde-12345<\/client-id>/, 1);
          expect(response).toMatchN(/<status>unchanged<\/status>/, 1);
          expect(response).not.toMatch(/<error>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
    describe("unchanged-empty", function() {
      it("JSON", function(done) {
        const body = `{
                        "username": "flier.fred@gmail.com",
                        "password": "secret",
                        "rockets": [{
                          "clientId": "abcde-12345",
                          "id": "5f70ff46e645437e11edd06b"
                        }]
                      }`;
        post('/api/v1/saverockets.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatchN(/"clientId": *"abcde-12345"/, 1);
          expect(response).toMatchN(/"status": *"unchanged"/, 1);
          expect(response).not.toMatch(/"error":/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("XML", function(done) {
        const body = `<saverockets-request>
                        <username>flier.fred@gmail.com</username>
                        <password>secret</password>
                        <rockets>
                          <client-id>abcde-12345</client-id>
                          <id>5f70ff46e645437e11edd06b</id>
                        </rockets>
                      </saverockets-request>`;
        post('/api/v1/saverockets.xml', body).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatchN(/<client-id>abcde-12345<\/client-id>/, 1);
          expect(response).toMatchN(/<status>unchanged<\/status>/, 1);
          expect(response).not.toMatch(/<error>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
    describe("create-two", function() {
      it("JSON", function(done) {
        const body = `{
                        "username": "flier.fred@gmail.com",
                        "password": "secret",
                        "rockets": [{
                          "clientId": "1",
                          "name": "Mobile One",
                          "public": true,
                          "bodyDiameterM": 0.024892,
                          "mmtDiameterMm": 18,
                          "mmtLengthMm": 76.2,
                          "mmtCount": 1,
                          "weightKg": 0.0340194,
                          "cd": 0.4,
                          "guideLengthM": 0.9144,
                          "website": "https://flierfred.com/",
                          "comments": "built at the launch!"
                        }, {
                          "clientId": "2",
                          "name": "Mobile Two",
                          "bodyDiameterM": 0.033782,
                          "mmtDiameterMm": 24,
                          "mmtLengthMm": 152.4,
                          "weightKg": 0.0850485,
                          "adapters": [{
                            "mmtDiameterMm": 18,
                            "mmtLengthMm": 76.2,
                            "weightKg": 0.01417475
                          }],
                          "cd": 0.45,
                          "guideLengthM": 0.9144
                        }]
                      }`;
        post('/api/v1/saverockets.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatchN(/"clientId":/, 2);
          expect(response).toMatchN(/"clientId": *"1"/, 1);
          expect(response).toMatchN(/"clientId": *"2"/, 1);
          expect(response).toMatchN(/"id":/, 2);
          expect(response).toMatchN(/"name":/, 2);
          expect(response).toMatchN(/"status": *"created"/, 2);
          expect(response).not.toMatch(/"error":/);
          expect(response).toBeExpected(/"id": *"[^"]*"/g, '"id": "..."');
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("XML", function(done) {
        const body = `<saverockets-request>
                        <username>flier.fred@gmail.com</username>
                        <password>secret</password>
                        <rockets>
                          <rocket>
                            <client-id>1</client-id>
                            <name>Mobile One</name>
                            <public>true</public>
                            <body-diameter-m>0.024892</body-diameter-m>
                            <mmt-diameter-mm>18</mmt-diameter-mm>
                            <mmt-length-mm>76.2</mmt-length-mm>
                            <mmt-count>1</mmt-count>
                            <weight-kg>0.0340194</weight-kg>
                            <cd>0.4</cd>
                            <guide-length-m>0.9144</guide-length-m>
                            <website>https://flierfred.com/</website>
                            <comments>built at the launch!</comments>
                          </rocket>
                          <rocket>
                            <client-id>2</client-id>
                            <name>Mobile Two</name>
                            <body-diameter-m>0.033782</body-diameter-m>
                            <mmt-diameter-mm>24</mmt-diameter-mm>
                            <mmt-length-mm>152.4</mmt-length-mm>
                            <weight-kg>0.0850485</weight-kg>
                            <adapters>
                              <adapter>
                                <mmt-diameter-mm>18</mmt-diameter-mm>
                                <mmt-length-mm>76.2</mmt-length-mm>
                                <weight-kg>0.01417475</weight-kg>
                              </adapter>
                            </adapters>
                            <cd>0.45</cd>
                            <guide-length-m>0.9144</guide-length-m>
                          </rocket>
                        </rockets>
                      </saverockets-request>`;
        post('/api/v1/saverockets.xml', body).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatchN(/<client-id>/, 2);
          expect(response).toMatchN(/<client-id>1<\/client-id>/, 1);
          expect(response).toMatchN(/<client-id>2<\/client-id>/, 1);
          expect(response).toMatchN(/<id>/, 2);
          expect(response).toMatchN(/<name>/, 2);
          expect(response).toMatchN(/<status>created<\/status>/, 2);
          expect(response).not.toMatch(/<error>/);
          expect(response).toBeExpected(/<id>[^<]*/g, '<id>...');
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
    describe("update-one", function() {
      it("JSON", function(done) {
        const create = `{
                          "username": "flier.fred@gmail.com",
                          "password": "secret",
                          "rockets": [{
                            "clientId": "3",
                            "name": "Mobile Three",
                            "bodyDiameterM": 0.024892,
                            "mmtDiameterMm": 18,
                            "mmtLengthMm": 76.2,
                            "mmtCount": 1,
                            "weightKg": 0.0340194,
                            "cd": 0.4,
                            "guideLengthM": 0.9144
                          }]
                        }`;
        post('/api/v1/saverockets.json', create).then(created => {
          expect(created).toBeValidJSON();
          expect(created).toMatchN(/"clientId":/, 1);
          expect(created).toMatchN(/"id":/, 1);
          expect(created).toMatch(/"name": *"Mobile Three"/);
          expect(created).toMatchN(/"status": *"created"/, 1);
          expect(created).not.toMatch(/"error":/);
          const id = JSON.parse(created).results[0].id;
          expect(id).toMatch(/^[0-9a-f]{24}$/i);

          const update = `{
                            "username": "flier.fred@gmail.com",
                            "password": "secret",
                            "rockets": [{
                              "clientId": "3",
                              "id": "${id}",
                              "name": "Mobile Three (2)",
                              "bodyDiameterM": 0.075,
                              "mmtDiameterMm": 29,
                              "mmtLengthMm": 208,
                              "mmtCount": 3,
                              "weightKg": 0.065,
                              "cd": 0.5,
                              "guideLengthM": 2
                            }]
                          }`;
          post('/api/v1/saverockets.json', update).then(updated => {
            expect(updated).toBeValidJSON();
            expect(updated).toMatchN(/"clientId":/, 1);
            expect(updated).toMatch(/"clientId": *"3"/);
            expect(updated).toMatchN(/"id":/, 1);
            expect(updated).toMatch(/"name": *"Mobile Three \(2\)"/);
            expect(updated).toMatchN(/"status": *"updated"/, 1);
            expect(updated).not.toMatch(/"error":/);

            let list = `{
                          "username": "flier.fred@gmail.com",
                          "password": "secret"
                        }`;
            post('/api/v1/getrockets.json', list).then(listed => {
              expect(listed).toBeValidJSON();
              expect(listed).toMatchN(/"id":/, 4);
              expect(listed).toMatch(/"name": *"Mobile Three \(2\)"/);
              expect(listed).toMatch(/"bodyDiameterM": *0.075/);
              expect(listed).toMatch(/"mmtDiameterMm": *29/);
              expect(listed).toMatch(/"mmtLengthMm": *208/);
              expect(listed).toMatch(/"mmtCount": *3/);
              expect(listed).toMatch(/"weightKg": *0.065/);
              expect(listed).toMatch(/"cd": *0.5/);
              expect(listed).toMatch(/"guideLengthM": *2/);
              expect(listed).toBeExpected(/"(id|createdOn|updatedOn)": *"[^"]*"/g, '"$1": "..."');
              done();
            }).catch(e => {
              fail(e);
              done();
            });
          }).catch(e => {
            fail(e);
            done();
          });
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("XML", function(done) {
        const create = `<saverockets-request>
                          <username>flier.fred@gmail.com</username>
                          <password>secret</password>
                          <rockets>
                            <rocket>
                              <client-id>3</client-id>
                              <name>Mobile Three</name>
                              <body-diameter-m>0.024892</body-diameter-m>
                              <mmt-diameter-mm>18</mmt-diameter-mm>
                              <mmt-length-mm>76.2</mmt-length-mm>
                              <mmt-count>1</mmt-count>
                              <weight-kg>0.0340194</weight-kg>
                              <cd>0.4</cd>
                              <guide-length-m>0.914</guide-length-m>
                            </rocket>
                          </rockets>
                        </saverockets-request>`;
        post('/api/v1/saverockets.xml', create).then(created => {
          expect(created).toBeValidXML(API_SCHEMA);
          expect(created).toMatchN(/<client-id>/, 1);
          expect(created).toMatchN(/<id>/, 1);
          expect(created).toMatch(/<name>Mobile Three<\/name>/);
          expect(created).toMatchN(/<status>created<\/status>/, 1);
          expect(created).not.toMatch(/<error>/);
          const id = created.replace(/\s+/g, ' ').replace(/^.*<id>([^<]+)<\/id>.*$/, '$1');
          expect(id).toMatch(/^[0-9a-f]{24}$/i);

          const update = `<saverockets-request>
                            <username>flier.fred@gmail.com</username>
                            <password>secret</password>
                            <rockets>
                              <rocket>
                                <client-id>3</client-id>
                                <id>${id}</id>
                                <name>Mobile Three (2)</name>
                                <body-diameter-m>0.075</body-diameter-m>
                                <mmt-diameter-mm>29</mmt-diameter-mm>
                                <mmt-length-mm>208</mmt-length-mm>
                                <mmt-count>3</mmt-count>
                                <weight-kg>0.065</weight-kg>
                                <cd>0.5</cd>
                                <guide-length-m>2</guide-length-m>
                              </rocket>
                            </rockets>
                          </saverockets-request>`;
          post('/api/v1/saverockets.xml', update).then(updated => {
            expect(created).toBeValidXML(API_SCHEMA);
            expect(updated).toMatchN(/<client-id>/, 1);
            expect(updated).toMatch(/<client-id>3<\/client-id>/);
            expect(updated).toMatchN(/<id>/, 1);
            expect(updated).toMatch(/<name>Mobile Three \(2\)<\/name>/);
            expect(updated).toMatchN(/<status>updated<\/status>/, 1);
            expect(updated).not.toMatch(/<error>/);

            let list = `<getrockets-request>
                          <username>flier.fred@gmail.com</username>
                          <password>secret</password>
                        </getrockets-request>`;
            post('/api/v1/getrockets.xml', list).then(listed => {
              expect(listed).toMatchN(/<rocket>/, 4);
              expect(listed).toMatch(/<name>Mobile Three \(2\)<\/name>/);
              expect(listed).toMatch(/<body-diameter-m>0.075<\/body-diameter-m>/);
              expect(listed).toMatch(/<mmt-diameter-mm>29<\/mmt-diameter-mm>/);
              expect(listed).toMatch(/<mmt-length-mm>208<\/mmt-length-mm>/);
              expect(listed).toMatch(/<mmt-count>3<\/mmt-count>/);
              expect(listed).toMatch(/<weight-kg>0.065<\/weight-kg>/);
              expect(listed).toMatch(/<cd>0.5<\/cd>/);
              expect(listed).toMatch(/<guide-length-m>2<\/guide-length-m>/);
              expect(listed).toBeExpected(/<(id|created-on|updated-on)>[^<]*/g, '<$1>...');
              done();
            }).catch(e => {
              fail(e);
              done();
            });
          }).catch(e => {
            fail(e);
            done();
          });
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
  });
  describe("motorguide", function() {
    const API_SCHEMA = "2020/motorguide-response.xsd";
    const LEGACY_SCHEMA = "2014/motorguide-response.xsd";
    describe("missing values", function() {
      it("JSON", function(done) {
        const body = `{
                        "rocket": {
                          "name": "Empty"
                        }
                      }`;
        post('/api/v1/motorguide.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatch(/"error": *"Invalid rocket bodyDiameterM value./);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("XML", function(done) {
        const body = `<motorguide-request>
                        <rocket>
                          <name>Empty</name>
                        </rocket>
                      </motorguide-request>`;
        post('/api/v1/motorguide.xml', body).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatch(/<error>Invalid rocket body-diameter-m value./);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("legacy", function(done) {
        const body = `<motorguide-request>
                        <rocket>
                          <name>Empty</name>
                        </rocket>
                      </motorguide-request>`;
        post('/servlets/motorguide', body).then(response => {
          expect(response).toBeValidXML(LEGACY_SCHEMA);
          expect(response).toMatch(/<error>Invalid rocket body-diameter-m value./);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
    describe("unmatched-criteria", function() {
      it("JSON", function(done) {
        const body = `{
                        "rocket": {
                          "name": "Sample",
                          "bodyDiameterM": 0.024892,
                          "mmtDiameterMm": 18,
                          "mmtLengthMm": 76.2,
                          "weightKg": 0.0340194,
                          "cd": 0.4,
                          "guideLengthM": 0.9144
                        },
                        "manufacturer": "Kosdon",
                        "impulseClass": "A"
                      }`;
        post('/api/v1/motorguide.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatchN(/"matches": *[1-9][0-9]*/, 2);
          expect(response).toMatch(/"matches": *0,/);
          expect(response).toMatch(/"okCount": *0,/);
          expect(response).toMatch(/"failedCount": *0/);
          expect(response).not.toMatch(/"error":/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("XML", function(done) {
        const body = `<motorguide-request>
                        <rocket>
                          <name>Sample</name>
                          <body-diameter-m>0.024892</body-diameter-m>
                          <mmt-diameter-mm>18</mmt-diameter-mm>
                          <mmt-length-mm>76.2</mmt-length-mm>
                          <weight-kg>0.0340194</weight-kg>
                          <cd>0.4</cd>
                          <guide-length-m>0.914</guide-length-m>
                        </rocket>
                        <manufacturer>Kosdon</manufacturer>
                        <impulseClass>A</impulseClass>
                      </motorguide-request>`;
        post('/api/v1/motorguide.xml', body).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatchN(/<criterion>/, 2);
          expect(response).toMatch(/<matches>42<\/matches>/);
          expect(response).toMatch(/<matches>6<\/matches>/);
          expect(response).toMatch(/<matches>0<\/matches>/);
          expect(response).toMatch(/<results ok-count="0" failed-count="0"\/>/);
          expect(response).not.toMatch(/<error>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("legacy", function(done) {
        const body = `<motorguide-request>
                        <rocket>
                          <name>Sample</name>
                          <body-diameter-m>0.024892</body-diameter-m>
                          <mmt-diameter-mm>18</mmt-diameter-mm>
                          <mmt-length-mm>76.2</mmt-length-mm>
                          <weight-kg>0.0340194</weight-kg>
                          <cd>0.4</cd>
                          <guide-length-m>0.914</guide-length-m>
                        </rocket>
                        <manufacturer>Kosdon</manufacturer>
                        <impulseClass>A</impulseClass>
                      </motorguide-request>`;
        post('/servlets/motorguide', body).then(response => {
          expect(response).toBeValidXML(LEGACY_SCHEMA);
          expect(response).toMatchN(/<criterion>/, 2);
          expect(response).toMatch(/<matches>42<\/matches>/);
          expect(response).toMatch(/<matches>6<\/matches>/);
          expect(response).toMatch(/<matches>0<\/matches>/);
          expect(response).toMatch(/<results ok-count="0" failed-count="0"\/>/);
          expect(response).not.toMatch(/<error>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
    describe("unmatched-mmt", function() {
      it("JSON", function(done) {
        const body = `{
                        "rocket": {
                          "name": "Sample",
                          "bodyDiameterM": 0.024892,
                          "mmtDiameterMm": 29,
                          "mmtLengthMm": 76.2,
                          "weightKg": 0.0340194,
                          "cd": 0.4,
                          "guideLengthM": 0.9144
                        },
                        "impulseClass": "D"
                      }`;
        post('/api/v1/motorguide.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatch(/"matches": *10,/);
          expect(response).toMatchN(/"motorId"/, 0);
          expect(response).toMatch(/"okCount": *0,/);
          expect(response).toMatch(/"failedCount": *0/);
          expect(response).not.toMatch(/"error":/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("XML", function(done) {
        const body = `<motorguide-request>
                        <rocket>
                          <name>Sample</name>
                          <body-diameter-m>0.024892</body-diameter-m>
                          <mmt-diameter-mm>29</mmt-diameter-mm>
                          <mmt-length-mm>76.2</mmt-length-mm>
                          <weight-kg>0.0340194</weight-kg>
                          <cd>0.4</cd>
                          <guide-length-m>0.914</guide-length-m>
                        </rocket>
                        <impulseClass>D</impulseClass>
                      </motorguide-request>`;
        post('/api/v1/motorguide.xml', body).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatchN(/<criterion>/, 1);
          expect(response).toMatchN(/<result>/, 0);
          expect(response).toMatch(/<matches>10<\/matches>/);
          expect(response).toMatch(/<results ok-count="0" failed-count="0"\/>/);
          expect(response).not.toMatch(/<error>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("legacy", function(done) {
        const body = `<motorguide-request>
                        <rocket>
                          <name>Sample</name>
                          <body-diameter-m>0.024892</body-diameter-m>
                          <mmt-diameter-mm>29</mmt-diameter-mm>
                          <mmt-length-mm>76.2</mmt-length-mm>
                          <weight-kg>0.0340194</weight-kg>
                          <cd>0.4</cd>
                          <guide-length-m>0.914</guide-length-m>
                        </rocket>
                        <impulseClass>D</impulseClass>
                      </motorguide-request>`;
        post('/servlets/motorguide', body).then(response => {
          expect(response).toBeValidXML(LEGACY_SCHEMA);
          expect(response).toMatchN(/<criterion>/, 1);
          expect(response).toMatchN(/<result>/, 0);
          expect(response).toMatch(/<matches>10<\/matches>/);
          expect(response).toMatch(/<results ok-count="0" failed-count="0"\/>/);
          expect(response).not.toMatch(/<error>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
    describe("no-criteria", function() {
      it("JSON", function(done) {
        const body = `{
                        "rocket": {
                          "name": "Sample",
                          "bodyDiameterM": 0.024892,
                          "mmtDiameterMm": 18,
                          "mmtLengthMm": 76.2,
                          "weightKg": 0.085,
                          "cd": 0.4,
                          "guideLengthM": 0.9144
                        }
                      }`;
        post('/api/v1/motorguide.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatchN(/"matches":/, 1);
          expect(response).toMatch(/"matches": *280,/);
          expect(response).toMatchN(/"motorId"/, 5);
          expect(response).toMatch(/"okCount": 5,/);
          expect(response).toMatch(/"failedCount": 7/);
          expect(response).toMatchN(/"status": *"ok"/, 5);
          expect(response).not.toMatch(/"error":/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("XML", function(done) {
        const body = `<motorguide-request>
                        <rocket>
                          <name>Sample</name>
                          <body-diameter-m>0.024892</body-diameter-m>
                          <mmt-diameter-mm>18</mmt-diameter-mm>
                          <mmt-length-mm>76.2</mmt-length-mm>
                          <weight-kg>0.085</weight-kg>
                          <cd>0.4</cd>
                          <guide-length-m>0.914</guide-length-m>
                        </rocket>
                      </motorguide-request>`;
        post('/api/v1/motorguide.xml', body).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatchN(/<criterion>/, 0);
          expect(response).toMatch(/<matches>280<\/matches>/);
          expect(response).toMatchN(/<result>/, 5);
          expect(response).toMatchN(/<status>ok<\/status>/, 5);
          expect(response).toMatch(/<results ok-count="5" failed-count="7">/);
          expect(response).not.toMatch(/<error>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("legacy", function(done) {
        const body = `<motorguide-request>
                        <rocket>
                          <name>Sample</name>
                          <body-diameter-m>0.024892</body-diameter-m>
                          <mmt-diameter-mm>18</mmt-diameter-mm>
                          <mmt-length-mm>76.2</mmt-length-mm>
                          <weight-kg>0.085</weight-kg>
                          <cd>0.4</cd>
                          <guide-length-m>0.914</guide-length-m>
                        </rocket>
                      </motorguide-request>`;
        post('/servlets/motorguide', body).then(response => {
          expect(response).toBeValidXML(LEGACY_SCHEMA);
          expect(response).toMatchN(/<criterion>/, 0);
          expect(response).toMatch(/<matches>280<\/matches>/);
          expect(response).toMatchN(/<result>/, 5);
          expect(response).toMatchN(/<status>ok<\/status>/, 5);
          expect(response).toMatch(/<results ok-count="5" failed-count="7">/);
          expect(response).not.toMatch(/<error>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
    describe("all-failed", function() {
      it("JSON", function(done) {
        const body = `{
                        "rocket": {
                          "name": "Sample",
                          "bodyDiameterM": 0.024892,
                          "mmtDiameterMm": 18,
                          "mmtLengthMm": 76.2,
                          "weightKg": 0.283,
                          "cd": 0.4,
                          "guideLengthM": 0.9144
                        }
                      }`;
        post('/api/v1/motorguide.json', body).then(response => {
          expect(response).toBeValidJSON();
          expect(response).toMatchN(/"matches":/, 1);
          expect(response).toMatch(/"matches": *280,/);
          expect(response).toMatchN(/"motorId"/, 12);
          expect(response).toMatch(/"okCount": 0,/);
          expect(response).toMatch(/"failedCount": 12/);
          expect(response).toMatchN(/"status": *"guide-vel"/, 12);
          expect(response).not.toMatch(/"error":/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("XML", function(done) {
        const body = `<motorguide-request>
                        <rocket>
                          <name>Sample</name>
                          <body-diameter-m>0.024892</body-diameter-m>
                          <mmt-diameter-mm>18</mmt-diameter-mm>
                          <mmt-length-mm>76.2</mmt-length-mm>
                          <weight-kg>0.283</weight-kg>
                          <cd>0.4</cd>
                          <guide-length-m>0.914</guide-length-m>
                        </rocket>
                      </motorguide-request>`;
        post('/api/v1/motorguide.xml', body).then(response => {
          expect(response).toBeValidXML(API_SCHEMA);
          expect(response).toMatchN(/<criterion>/, 0);
          expect(response).toMatchN(/<result>/, 12);
          expect(response).toMatch(/<matches>280<\/matches>/);
          expect(response).toMatch(/<results ok-count="0" failed-count="12">/);
          expect(response).toMatchN(/<status>guide-vel<\/status>/, 12);
          expect(response).not.toMatch(/<error>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
      it("legacy", function(done) {
        const body = `<motorguide-request>
                        <rocket>
                          <name>Sample</name>
                          <body-diameter-m>0.024892</body-diameter-m>
                          <mmt-diameter-mm>18</mmt-diameter-mm>
                          <mmt-length-mm>76.2</mmt-length-mm>
                          <weight-kg>0.283</weight-kg>
                          <cd>0.4</cd>
                          <guide-length-m>0.914</guide-length-m>
                        </rocket>
                      </motorguide-request>`;
        post('/servlets/motorguide', body).then(response => {
          expect(response).toBeValidXML(LEGACY_SCHEMA);
          expect(response).toMatchN(/<criterion>/, 0);
          expect(response).toMatchN(/<result>/, 12);
          expect(response).toMatch(/<matches>280<\/matches>/);
          expect(response).toMatch(/<results ok-count="0" failed-count="12">/);
          expect(response).toMatchN(/<status>guide-vel<\/status>/, 12);
          expect(response).not.toMatch(/<error>/);
          expect(response).toBeExpected();
          done();
        }).catch(e => {
          fail(e);
          done();
        });
      });
    });
  });

  afterAll(function() {
    if (updateExpected)
      throw new Error("expectations updated; reset updateExpected to false");
  });
});
