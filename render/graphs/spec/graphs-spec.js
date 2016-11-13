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

  var impulseMotors = [
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
        motors: impulseMotors,
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
        motors: impulseMotors,
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

  var thrustCurveMotors = [
    { _id: "580ee54e000231000000000c", burnTime: 0.85, commonName: "A10",
      data: [
	{ time: 0.026, thrust: 0.478 },
	{ time: 0.055, thrust: 1.919 },
	{ time: 0.093, thrust: 4.513 },
	{ time: 0.124, thrust: 8.165 },
	{ time: 0.146, thrust: 10.956 },
	{ time: 0.166, thrust: 12.64 },
	{ time: 0.179, thrust: 11.046 },
	{ time: 0.194, thrust: 7.966 },
	{ time: 0.203, thrust: 6.042 },
	{ time: 0.209, thrust: 3.154 },
	{ time: 0.225, thrust: 1.421 },
	{ time: 0.26, thrust: 1.225 },
	{ time: 0.333, thrust: 1.41 },
	{ time: 0.456, thrust: 1.206 },
	{ time: 0.575, thrust: 1.195 },
	{ time: 0.663, thrust: 1.282 },
	{ time: 0.76, thrust: 1.273 },
	{ time: 0.811, thrust: 1.268 },
	{ time: 0.828, thrust: 0.689 },
	{ time: 0.85, thrust: 0 },
      ]
    },
    { _id: "580ee54e000231000000000e", burnTime: 1.03, commonName: "B4",
      data: [
	{ time: 0.058, thrust: 2.361 },
	{ time: 0.102, thrust: 2.921 },
	{ time: 0.122, thrust: 3.797 },
	{ time: 0.15, thrust: 5.866 },
	{ time: 0.18, thrust: 8.373 },
	{ time: 0.199, thrust: 9.882 },
	{ time: 0.208, thrust: 10.88 },
	{ time: 0.216, thrust: 11.367 },
	{ time: 0.238, thrust: 11.245 },
	{ time: 0.245, thrust: 10.832 },
	{ time: 0.262, thrust: 8.982 },
	{ time: 0.293, thrust: 6.134 },
	{ time: 0.322, thrust: 5.306 },
	{ time: 0.357, thrust: 4.917 },
	{ time: 0.388, thrust: 4.795 },
	{ time: 0.416, thrust: 4.746 },
	{ time: 0.46, thrust: 4.625 },
	{ time: 0.502, thrust: 4.576 },
	{ time: 0.544, thrust: 4.357 },
	{ time: 0.575, thrust: 4.503 },
	{ time: 0.605, thrust: 4.527 },
	{ time: 0.674, thrust: 4.552 },
	{ time: 0.731, thrust: 4.454 },
	{ time: 0.88, thrust: 4.454 },
	{ time: 0.915, thrust: 4.503 },
	{ time: 0.96, thrust: 4.406 },
	{ time: 1.0, thrust: 4.065 },
	{ time: 1.047, thrust: 2.556 },
	{ time: 1.049, thrust: 0.0 },
      ]
    },
    { _id: "580ee54e0002310000000020", burnTime: 1.65, commonName: "D12" },
  ];
  describe("thrustCurveComparison", function() {
    var image;
    it("call", function() {
      image = graphs.thrustCurveComparison({
        motors: thrustCurveMotors,
        width: 500,
        height: 300,
        title: 'Thrust Curve Overlay'
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
      require('fs').writeFileSync('/tmp/thrustCurveCompare.svg', text);
    });
  });
  describe("sendThrustCurveComparison", function() {
    var status, type, content;
    it("call", function() {
      graphs.sendThrustCurveComparison({
        status: function(v) { status = v; return this; },
        type: function(v) { type = v; return this; },
        send: function(v) { content = v; return this; }
      }, {
        motors: thrustCurveMotors,
        width: 500,
        height: 300,
        title: 'Thrust Curve Overlay'
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
