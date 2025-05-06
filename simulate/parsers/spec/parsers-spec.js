"use strict";

const errors = require("../../../lib/errors"),
      xmlparser = require("xml-parser"),
      parsers = require("../");

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

  const J250_RASP =
    '; J250W DMS\n' +
    'J250W 54 218.2 14 0.363 0.708 AT\n' +
    '   0.005 149.863\n' +
    '   0.016 124.444\n' +
    '   0.048 224.0\n' +
    '   0.051 290.723\n' +
    '   0.077 309.787\n' +
    '   0.221 324.085\n' +
    '   0.269 316.141\n' +
    '   0.497 335.735\n' +
    '   0.997 324.085\n' +
    '   1.497 288.605\n' +
    '   1.713 266.893\n' +
    '   2.003 210.231\n' +
    '   2.162 176.87\n' +
    '   2.487 119.678\n' +
    '   2.516 125.503\n' +
    '   2.718 91.612\n' +
    '   2.766 45.541\n' +
    '   2.814 18.005\n' +
    '   2.867 7.943\n' +
    '   2.902 0.0\n' +
    ';\n';

  describe("parseRASP", function() {
    it("function", function() {
      expect(typeof parsers.parseRASP).toBe('function');
    });

    var parsed;
    it("call", function() {
      var data =
          '' +
          ';' +
          '' +
          ';' +
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
      expect(parsed.info.comment).toBe('AeroTech K550W\n' +
                                       'converted from TMT test stand data 1998 (www.tripoli.org)\n' +
                                       'provided by ThrustCurve.org (www.thrustcurve.org)\n');
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

  const J450_ROCKSIM =
          '<engine-database>\n' +
          ' <engine-list>\n' +
          '<engine FDiv="10" FFix="1" FStep="-1." Isp="204.62" Itot="1069.71" Type="reloadable" auto-calc-cg="1" auto-calc-mass="1" avgThrust="459.105" burn-time="2.33" cgDiv="10" cgFix="1" cgStep="-1." code="J450ST" delays="1000" dia="54." exitDia="0." initWt="1196.4" len="326." mDiv="10" mFix="1" mStep="-1." massFrac="44.56" mfg="Animal Motor Works" peakThrust="563.18" propWt="533.1" tDiv="10" tFix="1" tStep="-1." throatDia="0.">\n' +
          '<comments><![CDATA[Animal Motor Works 54-1050\n' +
          'AMW J450ST RASP.ENG file made from NAR published data\n' +
          'File produced SEPT 4, 2002\n' +
          'This file my be used or given away. All I ask is that this header\n' +
          'is maintained to give credit to NAR S&T. Thank you, Jack Kane\n' +
          'The total impulse, peak thrust, average thrust and burn time are\n' +
          'the same as the averaged static test data on the NAR web site in\n' +
          'the certification file. The curve drawn with these data points is as\n' +
          'close to the certification curve as can be with such a limited\n' +
          'number of points (32) allowed with wRASP up to v1.6.\n' +
          ']]></comments>\n' +
          '<data>\n' +
          '<eng-data cg="163." f="0." m="533.1" t="0."/>\n' +
          '<eng-data cg="163." f="251.586" m="532.536" t="0.009"/>\n' +
          '<eng-data cg="163." f="376.074" m="531.441" t="0.016"/>\n' +
          '<eng-data cg="163." f="413.45" m="528.687" t="0.03"/>\n' +
          '<eng-data cg="163." f="430.832" m="524.269" t="0.051"/>\n' +
          '<eng-data cg="163." f="423.296" m="515.117" t="0.094"/>\n' +
          '<eng-data cg="163." f="413.149" m="500.944" t="0.162"/>\n' +
          '<eng-data cg="163." f="395.566" m="480.793" t="0.262"/>\n' +
          '<eng-data cg="163." f="420.182" m="452.335" t="0.402"/>\n' +
          '<eng-data cg="163." f="444.898" m="432.288" t="0.495"/>\n' +
          '<eng-data cg="163." f="504.078" m="358.984" t="0.805"/>\n' +
          '<eng-data cg="163." f="536.028" m="296.005" t="1.048"/>\n' +
          '<eng-data cg="163." f="550.597" m="248.622" t="1.223"/>\n' +
          '<eng-data cg="163." f="563.18" m="227.529" t="1.299"/>\n' +
          '<eng-data cg="163." f="555.319" m="217.775" t="1.334"/>\n' +
          '<eng-data cg="163." f="560.042" m="179.977" t="1.47"/>\n' +
          '<eng-data cg="163." f="559.841" m="147.049" t="1.588"/>\n' +
          '<eng-data cg="163." f="546.98" m="98.5088" t="1.764"/>\n' +
          '<eng-data cg="163." f="516.838" m="56.8911" t="1.921"/>\n' +
          '<eng-data cg="163." f="496.743" m="38.7066" t="1.993"/>\n' +
          '<eng-data cg="163." f="499.154" m="30.7656" t="2.025"/>\n' +
          '<eng-data cg="163." f="479.16" m="25.4025" t="2.047"/>\n' +
          '<eng-data cg="163." f="414.354" m="16.7194" t="2.086"/>\n' +
          '<eng-data cg="163." f="344.525" m="11.2356" t="2.115"/>\n' +
          '<eng-data cg="163." f="252.29" m="7.36905" t="2.141"/>\n' +
          '<eng-data cg="163." f="140.161" m="3.84859" t="2.177"/>\n' +
          '<eng-data cg="163." f="82.78" m="1.84871" t="2.213"/>\n' +
          '<eng-data cg="163." f="50.347" m="0.98623" t="2.239"/>\n' +
          '<eng-data cg="163." f="27.861" m="0.362621" t="2.271"/>\n' +
          '<eng-data cg="163." f="12.86" m="0.108951" t="2.296"/>\n' +
          '<eng-data cg="163." f="0." m="0." t="2.33"/>\n' +
          '</data>\n' +
          '</engine>\n' +
          ' </engine-list>\n' +
          '</engine-database>\n';

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
          'AeroTech K550W\n' +
          'converted from TMT test stand data 1998 (www.tripoli.org)\n' +
          'provided by ThrustCurve.org (www.thrustcurve.org)\n' +
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
      expect(parsed.info.comment).toBe('AeroTech K550W\n' +
                                       'converted from TMT test stand data 1998 (www.tripoli.org)\n' +
                                       'provided by ThrustCurve.org (www.thrustcurve.org)\n');
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

    it("CDATA", function() {
      let parsed;
      expect(function() {
        parsed = parsers.parseData('RockSim', J450_ROCKSIM, errors.print);
      }).not.toThrow();
      expect(parsed).toBeDefined();
      expect(parsed.info.name).toBe('J450ST');
      expect(parsed.info.comment).toBe('Animal Motor Works 54-1050\n' +
                                       'AMW J450ST RASP.ENG file made from NAR published data\n' +
                                       'File produced SEPT 4, 2002\n' +
                                       'This file my be used or given away. All I ask is that this header\n' +
                                       'is maintained to give credit to NAR S&T. Thank you, Jack Kane\n' +
                                       'The total impulse, peak thrust, average thrust and burn time are\n' +
                                       'the same as the averaged static test data on the NAR web site in\n' +
                                       'the certification file. The curve drawn with these data points is as\n' +
                                       'close to the certification curve as can be with such a limited\n' +
                                       'number of points (32) allowed with wRASP up to v1.6.\n');
      expect(parsed.points.length).toBe(31);
    });
  });

  describe("printData", function() {
    it("function", function() {
      expect(typeof parsers.printData).toBe('function');
    });

    it("RASP", function() {
      const parsed = parsers.parseData('RASP', J250_RASP, errors.print);
      expect(parsed).toBeDefined();
      const file = parsers.printData('RASP', parsed, errors.print);
      expect(file).toBe('; J250W DMS\n' +
                        'J250W 54 218 14 0.363 0.708 AT\n' +
                        '   0.005  149.863\n' +
                        '   0.016  124.444\n' +
                        '   0.048  224.000\n' +
                        '   0.051  290.723\n' +
                        '   0.077  309.787\n' +
                        '   0.221  324.085\n' +
                        '   0.269  316.141\n' +
                        '   0.497  335.735\n' +
                        '   0.997  324.085\n' +
                        '   1.497  288.605\n' +
                        '   1.713  266.893\n' +
                        '   2.003  210.231\n' +
                        '   2.162  176.870\n' +
                        '   2.487  119.678\n' +
                        '   2.516  125.503\n' +
                        '   2.718   91.612\n' +
                        '   2.766   45.541\n' +
                        '   2.814   18.005\n' +
                        '   2.867    7.943\n' +
                        '   2.902    0\n');
    });

    it("RockSim", function() {
      const parsed = parsers.parseData('RockSim', J450_ROCKSIM, errors.print);
      expect(parsed).toBeDefined();
      const file = parsers.printData('RockSim', parsed, errors.print);
      expect(file).toBe('<?xml version="1.0"?>\n' +
                        '<engine-database>\n' +
                        '<engine-list>\n' +
                        '<engine code="J450ST" mfg="Animal Motor Works" delays="1000" dia="54" len="326" Type="reloadable" initWt="1196.4" propWt="533.1" Itot="1069.71" avgThrust="459.105" peakThrust="563.18" burn-time="2.33" massFrac="44.56" Isp="204.62">\n' +
                        '<comments>Animal Motor Works 54-1050\n' +
                        'AMW J450ST RASP.ENG file made from NAR published data\n' +
                        'File produced SEPT 4, 2002\n' +
                        'This file my be used or given away. All I ask is that this header\n' +
                        'is maintained to give credit to NAR S&amp;T. Thank you, Jack Kane\n' +
                        'The total impulse, peak thrust, average thrust and burn time are\n' +
                        'the same as the averaged static test data on the NAR web site in\n' +
                        'the certification file. The curve drawn with these data points is as\n' +
                        'close to the certification curve as can be with such a limited\n' +
                        'number of points (32) allowed with wRASP up to v1.6.\n' +
                        '</comments>\n' +
                        '<data>\n' +
                        '<eng-data t="0" f="0"/>\n' +
                        '<eng-data t="0.009" f="251.586"/>\n' +
                        '<eng-data t="0.016" f="376.074"/>\n' +
                        '<eng-data t="0.03" f="413.45"/>\n' +
                        '<eng-data t="0.051" f="430.832"/>\n' +
                        '<eng-data t="0.094" f="423.296"/>\n' +
                        '<eng-data t="0.162" f="413.149"/>\n' +
                        '<eng-data t="0.262" f="395.566"/>\n' +
                        '<eng-data t="0.402" f="420.182"/>\n' +
                        '<eng-data t="0.495" f="444.898"/>\n' +
                        '<eng-data t="0.805" f="504.078"/>\n' +
                        '<eng-data t="1.048" f="536.028"/>\n' +
                        '<eng-data t="1.223" f="550.597"/>\n' +
                        '<eng-data t="1.299" f="563.18"/>\n' +
                        '<eng-data t="1.334" f="555.319"/>\n' +
                        '<eng-data t="1.47" f="560.042"/>\n' +
                        '<eng-data t="1.588" f="559.841"/>\n' +
                        '<eng-data t="1.764" f="546.98"/>\n' +
                        '<eng-data t="1.921" f="516.838"/>\n' +
                        '<eng-data t="1.993" f="496.743"/>\n' +
                        '<eng-data t="2.025" f="499.154"/>\n' +
                        '<eng-data t="2.047" f="479.16"/>\n' +
                        '<eng-data t="2.086" f="414.354"/>\n' +
                        '<eng-data t="2.115" f="344.525"/>\n' +
                        '<eng-data t="2.141" f="252.29"/>\n' +
                        '<eng-data t="2.177" f="140.161"/>\n' +
                        '<eng-data t="2.213" f="82.78"/>\n' +
                        '<eng-data t="2.239" f="50.347"/>\n' +
                        '<eng-data t="2.271" f="27.861"/>\n' +
                        '<eng-data t="2.296" f="12.86"/>\n' +
                        '<eng-data t="2.33" f="0"/>\n' +
                        '</data>\n' +
                        '</engine>\n' +
                        '</engine-list>\n' +
                        '</engine-database>\n');
    });

    it("invalid", function() {
      let file;
      expect(function() {
        file = parsers.printData('invalid', 'lsdkjflsdjflasjflasdjfkladsjfdalkfa', function(msg) {});
      }).not.toThrow();
      expect(file).toBeUndefined();
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

  describe("computeInfo", function() {
    it("function", function() {
      expect(typeof parsers.computeInfo).toBe('function');
    });
    it("J450", function() {
      const parsed = parsers.parseRockSim(J450_ROCKSIM, errors.print);
      const info = parsers.computeInfo(parsed.points, errors.print);
      expect(info).toBeDefined();
      expect(info.name).toBe('J459');
      expect(info.totalImpulse).toBeCloseTo(parsed.info.totalImpulse, 1);
      expect(info.avgThrust).toBeCloseTo(parsed.info.avgThrust, 1);
      expect(info.maxThrust).toBeCloseTo(parsed.info.maxThrust, 1);
      expect(info.burnTime).toBeCloseTo(parsed.info.burnTime, 2);
    });
  });

  describe("mergeData", function() {
    it("function", function() {
      expect(typeof parsers.mergeData).toBe('function');
    });
    it("single motor", function() {
      const parsed = parsers.parseRockSim(J450_ROCKSIM, errors.print);
      const merged = parsers.mergeData([parsed], errors.print);
      expect(merged).toBeDefined();
      expect(merged.info).toBeDefined();
      expect(merged.info.name).toBe('J459');
      expect(merged.info.totalImpulse).toBeCloseTo(parsed.info.totalImpulse, -1);
      expect(merged.info.avgThrust).toBeCloseTo(parsed.info.avgThrust, 0);
      expect(merged.info.maxThrust).toBeCloseTo(parsed.info.maxThrust, 0);
      expect(merged.info.burnTime).toBeCloseTo(parsed.info.burnTime, 2);
      expect(merged.info.propellantWeight).toBe(parsed.info.propellantWeight);
      expect(merged.info.totalWeight).toBe(parsed.info.totalWeight);
      expect(merged.info.diameter).toBe(parsed.info.diameter);
      expect(merged.info.length).toBe(parsed.info.length);
      expect(merged.points).toBeDefined();
      expect(merged.points.length).toBeLessThan(50);
    });
    it("cluster", function() {
      const parsed = parsers.parseRASP(J250_RASP, errors.print);
      const expectedInfo = parsers.computeInfo(parsed.points, errors.print);
      const N = 4;
      parsed.count = N;
      const merged = parsers.mergeData([parsed], errors.print);
      expect(merged).toBeDefined();
      expect(merged.info).toBeDefined();
      expect(merged.info.name).toBe('L976');
      expect(merged.info.totalImpulse).toBeCloseTo(expectedInfo.totalImpulse * N, -1);
      expect(merged.info.avgThrust).toBeCloseTo(expectedInfo.avgThrust * N, -1);
      expect(merged.info.maxThrust).toBeCloseTo(expectedInfo.maxThrust * N, 0);
      expect(merged.info.burnTime).toBeCloseTo(expectedInfo.burnTime, 1);
      expect(merged.info.propellantWeight).toBe(parsed.info.propellantWeight * N);
      expect(merged.info.totalWeight).toBe(parsed.info.totalWeight * N);
      expect(merged.info.diameter).toBe(parsed.info.diameter);
      expect(merged.info.length).toBe(parsed.info.length);
      expect(merged.points).toBeDefined();
      expect(merged.points.length).toBeLessThan(50);
    });
    it("stage", function() {
      const booster = parsers.parseRockSim(J450_ROCKSIM, errors.print);
      const expectedBooster = parsers.computeInfo(booster.points, errors.print);
      const sustainer = parsers.parseRASP(J250_RASP, errors.print);
      const expectedSustainer = parsers.computeInfo(sustainer.points, errors.print);
      const DELAY = 5;
      sustainer.offset = DELAY;
      const expectedImpulse = expectedBooster.totalImpulse + expectedSustainer.totalImpulse;
      const expectedBurnTime = DELAY + expectedSustainer.burnTime;

      const merged = parsers.mergeData([booster, sustainer], errors.print);
      expect(merged.info.name).toBe('K224');
      expect(merged.info.totalImpulse).toBeCloseTo(expectedImpulse, -2);
      expect(merged.info.avgThrust).toBeCloseTo(expectedImpulse / expectedBurnTime, -1);
      expect(merged.info.maxThrust).toBeCloseTo(Math.max(expectedBooster.maxThrust, expectedSustainer.maxThrust), -1);
      expect(merged.info.burnTime).toBeCloseTo(expectedBurnTime, 1);
      expect(merged.info.propellantWeight).toBe(booster.info.propellantWeight + sustainer.info.propellantWeight);
      expect(merged.info.totalWeight).toBe(booster.info.totalWeight + sustainer.info.totalWeight);
      expect(merged.info.diameter).toBe(Math.max(booster.info.diameter, sustainer.info.diameter));
      expect(merged.info.length).toBe(Math.max(booster.info.length, sustainer.info.length));
      expect(merged.points).toBeDefined();
      expect(merged.points.length).toBeLessThan(60);
    });
  });
});
