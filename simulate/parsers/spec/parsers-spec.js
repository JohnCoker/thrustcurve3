var errors = require("../../../lib/errors"),
    parsers = require("../parsers.js");

describe("parsers", function() {
  describe("parseData", function() {
    it("function", function() {
      expect(typeof parsers.parseData).toBe('function');
    });

    it("RASP", function() {
      var data =
          '; AT K550W\n' +
          'K550W 54 410 0 0.919744 1.48736 AT\n' +
          '   0.065 604.264\n' +
          '   3.356 0.000\n',
          parsed;
      expect(function() {
        parsed = parsers.parseData('RASP', data, errors.print);
      }).not.toThrow();
      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe('object');
      expect(parsed.format).toBe('RASP');
    });

    it("RockSim", function() {
      var data =
          '<engine-database>\n' +
          ' <engine-list>\n' +
          '  <engine code="K550W" mfg="Aerotech" delays="6,10,14,18" dia="54." len="410." Type="reloadable" ' +
          'massFrac="58.11" Isp="184.68" peakThrust="853.13" initWt="1515.1" propWt="880.4" Itot="1594.46" ' +
          'avgThrust="455.561" burn-time="3.5">\n' +
          '   <data>\n' +
          '    <eng-data f="628.15" t="0." m="880.4"/>\n' +
          '    <eng-data f="0." t="3.5" m="0."/>\n' +
          '   </data>\n' +
          '  </engine>\n' +
          ' </engine-list>\n' +
          '</engine-database>\n',
          parsed;
      expect(function() {
        parsed = parsers.parseData('RockSim', data, errors.print);
      }).not.toThrow();
      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe('object');
      expect(parsed.format).toBe('RockSim');
    });

    it("invalid", function() {
      var parsed;
      expect(function() {
        parsed = parsers.parseData('invalid', 'lsdkjflsdjflasjflasdjfkladsjfdalkfa', function(msg) {});
      }).not.toThrow();
      expect(parsed).toBeUndefined();
    });
  });

  describe("guessFormat", function() {
    it("function", function() {
      expect(typeof parsers.guessFormat).toBe('function');
    });
    it("undefined", function() {
      expect(parsers.guessFormat()).toBeUndefined();
    });
    it("empty", function() {
      expect(parsers.guessFormat('')).toBeUndefined();
    });
    it("garbage", function() {
      expect(parsers.guessFormat('#*(#@)$*@)$*)*$)(*@@!)#*!@#)@')).toBeUndefined();
    });
    it("RASP", function() {
      var data =
          '; AT K550W\n' +
          'K550W 54 410 0 0.919744 1.48736 AT\n' +
          '   0.065 604.264\n' +
          '   3.356 0.000\n';
      expect(parsers.guessFormat(data)).toBe('RASP');
    });
    it("RockSim", function() {
      var data =
          '<engine-database>\n' +
          ' <engine-list>\n' +
          '  <engine code="K550W">\n' +
          '   <data>\n' +
          '    <eng-data f="628.15" t="0."/>\n' +
          '    <eng-data f="0." t="3.5"/>\n' +
          '   </data>\n' +
          '  </engine>\n' +
          ' </engine-list>\n' +
          '</engine-database>\n';
      expect(parsers.guessFormat(data)).toBe('RockSim');
    });
  });

  describe("parseRASP", function() {
    it("function", function() {
      expect(typeof parsers.parseRASP).toBe('function');
    });

    var parsed;
    it("call", function() {
      var data =
          '; AT K550W\n' +
          'K550W 54 410 0 0.919744 1.48736 AT\n' +
          '   0.065 604.264\n' +
          '   3.356 0.000\n';
      expect(function() {
        parsed = parsers.parseData('RASP', data, errors.print);
      }).not.toThrow();
      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe('object');
      expect(parsed.format).toBe('RASP');
    });
    it("info", function() {
      expect(parsed.info.name).toBe('K550W');
      expect(parsed.info.manufacturer).toBe('AT');
      expect(parsed.info.diameter).toBe(0.054);
      expect(parsed.info.length).toBe(0.410);
      expect(parsed.info.delays).toBe('0');
      expect(parsed.info.totalWeight).toBeCloseTo(1.487, 3);
      expect(parsed.info.propellantWeight).toBeCloseTo(0.920, 3);
    });
    it("points", function() {
      expect(parsed.points).toBeDefined();
      expect(parsed.points.length).toBe(2);
      expect(parsed.points[0].time).toBe(0.065);
      expect(parsed.points[0].thrust).toBe(604.264);
      expect(parsed.points[1].time).toBe(3.356);
      expect(parsed.points[1].thrust).toBe(0);
    });
  });

  describe("parseRockSim", function() {
    it("function", function() {
      expect(typeof parsers.parseRockSim).toBe('function');
    });

    var parsed;
    it("call", function() {
      var data =
          '<engine-database>\n' +
          ' <engine-list>\n' +
          '  <engine code="K550W" mfg="Aerotech" delays="6,10,14,18" dia="54." len="410." Type="reloadable" ' +
          'massFrac="58.11" Isp="184.68" peakThrust="853.13" initWt="1515.1" propWt="880.4" Itot="1594.46" ' +
          'avgThrust="455.561" burn-time="3.5">\n' +
          '   <data>\n' +
          '    <eng-data f="628.15" t="0." m="880.4"/>\n' +
          '    <eng-data f="0." t="3.5" m="0."/>\n' +
          '   </data>\n' +
          '  </engine>\n' +
          ' </engine-list>\n' +
          '</engine-database>\n';
      expect(function() {
        parsed = parsers.parseData('RockSim', data, errors.print);
      }).not.toThrow();
      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe('object');
      expect(parsed.format).toBe('RockSim');
    });
    it("info", function() {
      expect(parsed.info.name).toBe('K550W');
      expect(parsed.info.manufacturer).toBe('Aerotech');
      expect(parsed.info.delays).toBe('6,10,14,18');
      expect(parsed.info.diameter).toBe(0.054);
      expect(parsed.info.length).toBe(0.410);
      expect(parsed.info.type).toBe('reload');
      expect(parsed.info.massFraction).toBe(58.11);
      expect(parsed.info.isp).toBe(184.68);
      expect(parsed.info.totalWeight).toBeCloseTo(1.515, 3);
      expect(parsed.info.propellantWeight).toBeCloseTo(0.880, 3);
      expect(parsed.info.maxThrust).toBe(853.13);
      expect(parsed.info.avgThrust).toBe(455.561);
      expect(parsed.info.totalImpulse).toBe(1594.46);
      expect(parsed.info.burnTime).toBe(3.5);
    });
    it("points", function() {
      expect(parsed.points).toBeDefined();
      expect(parsed.points.length).toBe(2);
      expect(parsed.points[0].time).toBe(0);
      expect(parsed.points[0].thrust).toBe(628.15);
      expect(parsed.points[0].propellantWeight).toBeCloseTo(0.880, 3);
      expect(parsed.points[1].time).toBe(3.5);
      expect(parsed.points[1].thrust).toBe(0);
      expect(parsed.points[1].propellantWeight).toBe(0);
    });
  });
});
