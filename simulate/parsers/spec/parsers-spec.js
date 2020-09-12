"use strict";

var errors = require("../../../lib/errors"),
    parsers = require("../parsers.js"),
    number = require("../number.js"),
    xmlparser = require("xml-parser");

describe("parsers", function() {
  describe("AllFormats", function() {
    it("member", function() {
      expect(parsers.AllFormats).toBeDefined();
      expect(Array.isArray(parsers.AllFormats)).toBe(true);
      expect(parsers.AllFormats.length).toBeGreaterThan(1);
    });
  });

  describe("formatInfo", function() {
    it("function", function() {
      expect(typeof parsers.formatInfo).toBe('function');
    });
    it("undefined", function() {
      expect(parsers.formatInfo()).toBeUndefined();
    });
    it("unknown", function() {
      expect(parsers.formatInfo('Unknown')).toBeUndefined('');
    });
    it("RASP", function() {
      var info = parsers.formatInfo('Rasp');
      expect(info).toBeDefined();
      expect(info.format).toBe('RASP');
      expect(info.extension).toBe('.eng');
    });
    it("RockSim", function() {
      var info = parsers.formatInfo('rocksim');
      expect(info).toBeDefined();
      expect(info.format).toBe('RockSim');
      expect(info.extension).toBe('.rse');
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

  describe("parseRASP", function() {
    it("function", function() {
      expect(typeof parsers.parseRASP).toBe('function');
    });

    var parsed;
    it("call", function() {
      var data =
          '; AeroTech K550W\n' +
          '; converted from TMT test stand data 1998 (www.tripoli.org)\n' +
          '; provided by ThrustCurve.org (www.thrustcurve.org)\n' +
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
          '   <comments>\n' +
          '; AeroTech K550W\n' +
          '; converted from TMT test stand data 1998 (www.tripoli.org)\n' +
          '; provided by ThrustCurve.org (www.thrustcurve.org)\n' +
          '   </comments>\n' +
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

  describe("combineRASP", function() {
    it("function", function() {
      expect(typeof parsers.combineRASP).toBe('function');
    });

    var combined;
    it("call", function() {
      var data = [
        ('; AeroTech K550W\n' +
         '; converted from TMT test stand data 1998 (www.tripoli.org)\n' +
         '; provided by ThrustCurve.org (www.thrustcurve.org)\n' +
         'K550W 54 410 0 0.919744 1.48736 AT\n' +
         '   0.065 604.264\n' +
         '   3.356 0.000\n'),
        ('G54 29 124 6-10-14 0.046 0.1365 AT\n' +
         '0.018 10.953\n' +
         '1.51 0        \n')
      ];
      expect(function() {
        combined = parsers.combineRASP(data, errors.print);
      }).not.toThrow();
      expect(combined).toBe('; AeroTech K550W\n' +
                            '; converted from TMT test stand data 1998 (www.tripoli.org)\n' +
                            '; provided by ThrustCurve.org (www.thrustcurve.org)\n' +
                            'K550W 54 410 0 0.919744 1.48736 AT\n' +
                            '   0.065 604.264\n' +
                            '   3.356 0.000\n' +
                            ';\n' +
                            'G54 29 124 6-10-14 0.046 0.1365 AT\n' +
                            '0.018 10.953\n' +
                            '1.51 0\n');
    });
  });

  describe("combineRockSim", function() {
    it("function", function() {
      expect(typeof parsers.combineRockSim).toBe('function');
    });

    var combined;
    it("call", function() {
      var data = [
        ('<engine-database>\n' +
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
         '</engine-database>\n'),
        ('<engine-database>\n' +
         ' <engine-list>\n' +
         '<engine FDiv="10" FFix="1" FStep="-1." Isp="179.67" Itot="81.05" Type="reloadable" auto-calc-cg="1" auto-calc-mass="1" avgThrust="53.676" burn-time="1.51" cgDiv="10" cgFix="1" cgStep="-1." code="G54" delays="6,10,14" dia="29." exitDia="0." initWt="136.5" len="124." mDiv="10" mFix="1" mStep="-1." massFrac="33.7" mfg="Aerotech" peakThrust="81.64" propWt="46." tDiv="10" tFix="1" tStep="-1." throatDia="0.">\n' +
         '<data>\n' +
         '<eng-data cg="62." f="10.953" m="45.9441" t="0.018"/>\n' +
         '<eng-data cg="62." f="0." m="0." t="1.51"/>\n' +
         '</data>\n' +
         '</engine>\n' +
         ' </engine-list>\n' +
         '</engine-database>\n')
      ];
      expect(function() {
        combined = parsers.combineRockSim(data, errors.print);
      }).not.toThrow();
      expect(combined).toBeDefined();
      expect(combined).not.toBe('');
    });
    it("header/footer", function() {
      expect(combined.match(/<engine-database[^>]*>/g).length).toBe(1);
      expect(combined.match(/<engine-list[^>]*>/g).length).toBe(1);
      expect(combined.match(/<\/engine-database[^>]*>/g).length).toBe(1);
      expect(combined.match(/<\/engine-list[^>]*>/g).length).toBe(1);
    });
    it("engines", function() {
      let engines = combined.match(/<engine [^>]*>/g) || [];
      expect(engines.length).toBe(2);
      expect(engines[0].replace(/^.* code="([^"]*)".*$/, "$1")).toBe('K550W');
      expect(engines[1].replace(/^.* code="([^"]*)".*$/, "$1")).toBe('G54');
    });
    it("structure", function() {
      let xml = xmlparser(combined);
      expect(xml).toBeDefined();
      expect(xml.root).toBeDefined();
      expect(xml.root.name).toBe('engine-database');
      expect(xml.root.children.length).toBe(1);
      expect(xml.root.children[0].name).toBe('engine-list');
      let list = xml.root.children[0];
      expect(list.children.length).toBe(2);
      for (let i = 0; i < list.children.length; i++) {
        expect(list.children[i].name).toBe('engine');
      }
    });
  });
});

describe("number", function() {
  it("isInt", function() {
    expect(number.isInt("")).toBe(false);
    expect(number.isInt("0")).toBe(true);
    expect(number.isInt("1000")).toBe(true);
    expect(number.isInt("-1")).toBe(false);
    expect(number.isInt("01")).toBe(false);
    expect(number.isInt("01.")).toBe(false);
    expect(number.isInt("1.")).toBe(false);
    expect(number.isInt("1.01")).toBe(false);
  });
  it("isFloat", function() {
    expect(number.isFloat("")).toBe(false);
    expect(number.isFloat("0")).toBe(true);
    expect(number.isFloat("1000")).toBe(true);
    expect(number.isFloat("-1")).toBe(false);
    expect(number.isFloat("01")).toBe(false);
    expect(number.isFloat("01.")).toBe(false);
    expect(number.isFloat("1.")).toBe(true);
    expect(number.isFloat("1.01")).toBe(true);
    expect(number.isFloat(".0")).toBe(true);
    expect(number.isFloat(".01")).toBe(true);
    expect(number.isFloat(".")).toBe(false);
  });
  it("parseInt", function() {
    expect(number.parseInt("")).toBeNaN();
    expect(number.parseInt("0")).toBe(0);
    expect(number.parseInt("1000")).toBe(1000);
    expect(number.parseInt("-1")).toBeNaN();
    expect(number.parseInt("01")).toBeNaN();
    expect(number.parseInt("01.")).toBeNaN();
    expect(number.parseInt("1.")).toBeNaN();
    expect(number.parseInt("1.01")).toBeNaN();
  });
  it("parseFloat", function() {
    expect(number.parseFloat("")).toBeNaN();
    expect(number.parseFloat("0")).toBe(0);
    expect(number.parseFloat("1000")).toBe(1000);
    expect(number.parseFloat("-1")).toBeNaN();
    expect(number.parseFloat("01")).toBeNaN();
    expect(number.parseFloat("01.")).toBeNaN();
    expect(number.parseFloat("1.")).toBe(1.0);
    expect(number.parseFloat("1.01")).toBe(1.01);
    expect(number.parseFloat(".0")).toBe(0);
    expect(number.parseFloat(".01")).toBe(0.01);
    expect(number.parseFloat(".")).toBeNaN();
  });
});
