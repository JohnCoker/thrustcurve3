const errors = require('../../../lib/errors'),
      parsers = require('../../../simulate/parsers'),
      graphs = require('..');

describe("graphs", function() {
  const sample =
          '; AeroTech K550W\n' +
          '; converted from TMT test stand data 1998 (www.tripoli.org)\n' +
          '; provided by ThrustCurve.org (www.thrustcurve.org)\n' +
          'K550W 54 410 0 0.919744 1.48736 AT\n' +
          '   0.065 604.264\n' +
          '   3.356 0.000\n',
        data = parsers.parseData('RASP', sample, errors.print);
  describe("thrustCurve", function() {
    var image;
    it("call", function() {
      image = graphs.thrustCurve({
        data: data,
        width: 500,
        height: 300,
        title: 'AeroTech K550W (RASP)'
      });
      expect(image).toBeDefined();
    });
    it("format", function() {
      expect(image.format).toBe('image/svg+xml');
      expect(image.width).toBe(500);
      expect(image.height).toBe(300);
    });
    it("render", function() {
      var text = image.render();
      expect(text).toBeDefined();
      //require('fs').writeFileSync('/tmp/thrustCurce.svg', text);
    });
  });
  describe("sendThrustCurve", function() {
    var status, type, content;
    it("call", function() {
      graphs.sendThrustCurve({
        status: function(v) { status = v; return this; },
        type: function(v) { type = v; return this; },
        send: function(v) { content = v; return this; }
      }, {
        data: data,
        width: 500,
        height: 300,
        title: 'AeroTech K550W (RASP)'
      });
    });
    it("status", function() {
      if (status !== undefined)
        expect(status).toBe(200);
    });
    it("type", function() {
      expect(type).toBe('image/svg+xml');
    });
    it("content", function() {
      expect(content).toBeDefined();
    });
  });

  var motors = [
    { _id: "580ee54e0002310000000004", burnTime: 0.25, totalImpulse:  0.59, avgThrust:  2.36, commonName: "1/4A3" },
    { _id: "580ee54e000231000000000c", burnTime: 0.85, totalImpulse:  2.00, avgThrust:  2.35, commonName: "A10" },
    { _id: "580ee54e0002310000000009", burnTime: 1.01, totalImpulse:  2.22, avgThrust:  2.20, commonName: "A3" },
    { _id: "580ee54e000231000000000b", burnTime: 0.73, totalImpulse:  2.32, avgThrust:  3.18, commonName: "A8" },
    { _id: "580ee54e000231000000000e", burnTime: 1.03, totalImpulse:  4.29, avgThrust:  4.17, commonName: "B4" },
    { _id: "580ee54e0002310000000010", burnTime: 0.86, totalImpulse:  4.33, avgThrust:  5.03, commonName: "B6" },
    { _id: "580ee54e000231000000001a", burnTime: 0.81, totalImpulse:  8.80, avgThrust: 10.86, commonName: "C11" },
    { _id: "580ee54e0002310000000014", burnTime: 1.73, totalImpulse:  9.10, avgThrust:  5.26, commonName: "C5" },
    { _id: "580ee54e0002310000000015", burnTime: 1.86, totalImpulse:  8.82, avgThrust:  4.74, commonName: "C6" },
    { _id: "580ee54e0002310000000020", burnTime: 1.65, totalImpulse: 16.84, avgThrust: 10.21, commonName: "D12" },
  ];
  describe("impulseComparison", function() {
    var image;
    it("call", function() {
      image = graphs.impulseComparison({
        motors: motors,
	stat: 'burnTime',
        width: 500,
        height: 300,
        title: 'Total Impulse vs Burn Time'
      });
      expect(image).toBeDefined();
    });
    it("format", function() {
      expect(image.format).toBe('image/svg+xml');
      expect(image.width).toBe(500);
      expect(image.height).toBe(300);
    });
    it("render", function() {
      var text = image.render();
      expect(text).toBeDefined();
      require('fs').writeFileSync('/tmp/impulseBurnTime.svg', text);
    });
  });
  describe("sendImpulseComparison", function() {
    var status, type, content;
    it("call", function() {
      graphs.sendImpulseComparison({
        status: function(v) { status = v; return this; },
        type: function(v) { type = v; return this; },
        send: function(v) { content = v; return this; }
      }, {
        motors: motors,
	stat: 'burnTime',
        width: 500,
        height: 300,
        title: 'Total Impulse vs Burn Time'
      });
    });
    it("status", function() {
      if (status !== undefined)
        expect(status).toBe(200);
    });
    it("type", function() {
      expect(type).toBe('image/svg+xml');
    });
    it("content", function() {
      expect(content).toBeDefined();
    });
  });
});
