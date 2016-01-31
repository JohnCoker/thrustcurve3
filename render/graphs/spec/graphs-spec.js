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
});
