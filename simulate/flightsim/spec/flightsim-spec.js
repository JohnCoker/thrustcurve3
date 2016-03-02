var errors = require("../../../lib/errors"),
    analyze = require("../../analyze"),
    parsers = require("../../parsers"),
    flightsim = require("..");

describe("flightsim", function() {
  describe("params", function() {
    it("STP", function() {
      var params = flightsim.STP;
      expect(params).toBeDefined();
      expect(params.G).toBeCloseTo(9.807, 3);
      expect(params.rho).toBeCloseTo(1.225, 3);
    });
  });
  describe("motorInitialMass", function() {
    it("both", function() {
      var m = {
        totalWeight: 0.1,
        propellantWeight: 0.04
      };
      expect(flightsim.motorInitialMass(m)).toBe(0.1);
    });
    it("total only", function() {
      var m = {
        totalWeight: 0.1
      };
      expect(flightsim.motorInitialMass(m)).toBe(0.1);
    });
    it("propellant only", function() {
      var m = {
        propellantWeight: 0.04
      };
      expect(flightsim.motorInitialMass(m)).toBeCloseTo(0.08, 4);
    });
    it("neither", function() {
      var m = {};
      expect(flightsim.motorInitialMass(m)).toBe(0.0);
    });
  });
  describe("motorBurnoutMass", function() {
    it("both", function() {
      var m = {
        totalWeight: 0.1,
        propellantWeight: 0.04
      };
      expect(flightsim.motorBurnoutMass(m)).toBeCloseTo(0.06, 4);
    });
    it("total only", function() {
      var m = {
        totalWeight: 0.1
      };
      expect(flightsim.motorBurnoutMass(m)).toBeCloseTo(0.05, 4);
    });
    it("propellant only", function() {
      var m = {
        propellantWeight: 0.04
      };
      expect(flightsim.motorBurnoutMass(m)).toBeCloseTo(0.04, 4);
    });
    it("neither", function() {
      var m = {};
      expect(flightsim.motorBurnoutMass(m)).toBe(0.0);
    });
  });

  describe("Generic Rocket on M1939", function() {
    var rocket, motor, data, result;
    it("rocket", function() {
      rocket = {
        bodyDiameter: 6.2,
        bodyDiameterUnit: 'in',
        weight: 27.0,
        weightUnit: 'lb',
        cd: 0.5,
        guideLength: 12.0,
        guideLengthUnit: 'ft'
      };
    });
    it("motor", function() {
      motor = {
        designation: 'M1939W',
        commonName: 'M1939',
        diameter: 0.098,
        length: 0.732,
        totalWeight: 8.988,
        propellantWeight: 5.719,
      };
    });
    it("simfile", function() {
      var simfile = {
        format: 'RockSim',
        data: '<engine-database>\n' +
              '<engine-list>\n' +
              '<engine FDiv="10" FFix="1" FStep="-1." Isp="198.19" Itot="10339.8" Type="reloadable" auto-calc-cg="1" auto-calc-mass="1" avgThrust="1477.12" burn-time="7." cgDiv="10" cgFix="1" cgStep="-1." code="M1939W" delays="1000" dia="98." exitDia="0." initWt="8844.5" len="751." mDiv="10" mFix="1" mStep="-1." massFrac="60.15" mfg="Aerotech" peakThrust="2084.16" propWt="5320." tDiv="10" tFix="1" tStep="-1." throatDia="0.">\n' +
              '<data>\n' +
              '<eng-data cg="375.5" f="1.33" m="5320." t="0."/>\n' +
              '<eng-data cg="375.5" f="1806.56" m="5273.49" t="0.1"/>\n' +
              '<eng-data cg="375.5" f="1881.42" m="4799.11" t="0.6"/>\n' +
              '<eng-data cg="375.5" f="1982.79" m="4103.24" t="1.3"/>\n' +
              '<eng-data cg="375.5" f="2062.09" m="3478.89" t="1.9"/>\n' +
              '<eng-data cg="375.5" f="2079.71" m="3265.79" t="2.1"/>\n' +
              '<eng-data cg="375.5" f="2084.16" m="2730.2" t="2.6"/>\n' +
              '<eng-data cg="375.5" f="1982.79" m="1997.82" t="3.3"/>\n' +
              '<eng-data cg="375.5" f="1696.38" m="1240.62" t="4.1"/>\n' +
              '<eng-data cg="375.5" f="1145.58" m="436.393" t="5.2"/>\n' +
              '<eng-data cg="375.5" f="991.37" m="216.494" t="5.6"/>\n' +
              '<eng-data cg="375.5" f="176.23" m="36.2693" t="6.2"/>\n' +
              '<eng-data cg="375.5" f="0." m="0." t="7."/>\n' +
              '</data>\n' +
              '</engine>\n' +
              '</engine-list>\n' +
              '</engine-database>\n'
      };
      data = parsers.parseData(simfile.format, simfile.data, errors.print);
      expect(data).toBeDefined();
      var stats = analyze.stats(data, errors.print);
      expect(stats).toBeDefined();
      expect(stats.pointCount).toBe(13);
      expect(stats.maxThrust).toBeCloseTo(2084.2, 1);
      expect(stats.maxTime).toBeCloseTo(7.0, 1);
      expect(stats.avgThrust).toBeCloseTo(1585.6, 1);
      expect(stats.totalImpulse).toBeCloseTo(10339.8, 1);
      expect(stats.burnTime).toBeCloseTo(6.5, 1);
    });
    it("simulateRocket", function() {
      expect(function() {
        result = flightsim.simulateRocket(rocket, motor, data, errors.print);
      }).not.toThrow();
      expect(result).toBeDefined();
    });
    it("inputs", function() {
      expect(result.inputs).toBeDefined();
      expect(result.inputs.bodyDiameter).toBeCloseTo(0.157, 3);
      expect(result.inputs.cd).toBe(0.5);
      expect(result.inputs.guideLength).toBeCloseTo(3.66, 2);
      expect(result.inputs.motorInitialMass).toBeCloseTo(motor.totalWeight, 2);
      expect(result.inputs.motorBurnoutMass).toBeCloseTo(motor.totalWeight - motor.propellantWeight, 2);
      expect(result.inputs.loadedInitialMass).toBeCloseTo(12.247 + motor.totalWeight, 2);
      expect(result.inputs.motorTotalImpulse).toBeCloseTo(10339.8, 1);
    });
    it("result", function() {
      expect(result.liftoffTime).toBeCloseTo(0.0, 1);
      expect(result.burnoutTime).toBeCloseTo(7.0, 1);
      expect(result.apogeeTime).toBeCloseTo(27.0, 1);
      expect(result.guideVelocity).toBeCloseTo(23.3, 1);
      expect(result.maxAcceleration).toBeCloseTo(76.8, 1);
      expect(result.maxVelocity).toBeCloseTo(310.2, 1);
      expect(result.burnoutAltitude).toBeCloseTo(1473.0, 1);
      expect(result.maxAltitude).toBeCloseTo(3798.5, 1);
      expect(result.integratedImpulse).toBeCloseTo(result.inputs.motorTotalImpulse, 1);
    });
  });
});
