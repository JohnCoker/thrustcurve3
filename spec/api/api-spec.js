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

function get(path) {
  return new Promise((resolve, reject) => {
    let req = http.request({
      host: 'localhost',
      port: 3000,
      path,
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
          compare: function(actual, expectFile) {
            if (expectFile == null) {
              expectFile = currentSpec.fullName.replace(/^API v1 */i, '');
              expectFile = expectFile.replace(/ +JSON$/i, '.json')
                                     .replace(/ +XML$/i, '.xml')
                                     .replace(/ +legacy$/i, '-legacy.xml')
                                     .replace(/ +/g, '-');
            }
            if (actual == null || actual.trim() === '') {
              return {
                pass: false,
                message: 'Expected ' + actual + ' to have content',
              };
            }
            if (expectFile == null || expectFile === '') {
              return {
                pass: false,
                message: 'Missing expected file name',
              };
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
    const LEGACY_SCHEMA = "2016/search-response.xsd";
    const API_SCHEMA = "2020/search-response.xsd";
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

  afterAll(function() {
    if (updateExpected)
      throw new Error("expectations updated; reset updateExpected to false");
  });
});
