var analyze = require("..");

describe("analyze", function() {

  describe("normalize", function() {
    it("reorder", function() {
      var output, lastTime, i;
      expect(function() {
	output = analyze.normalize([
	  { time: 0.1, thrust: 75 },
	  { time: 0.2, thrust: 80 },
	  { time: 0.3, thrust: 100 },
	  { time: 0.5, thrust: 90 },
	  { time: 0.4, thrust: 95 },
	  { time: 0.6, thrust: 85 },
	  { time: 0.9, thrust: 20 },
	  { time: 0.8, thrust: 60 },
	  { time: 1.0, thrust: 0 },
	]);
      }).not.toThrow();
      expect(output.length).toBe(9);
      lastTime = 0;
      for (i = 0; i < output.length; i++) {
	expect(output[i].time).toBeGreaterThan(lastTime + 0.09);
	lastTime = output[i].time;
      }
    });
    it("zero", function() {
      var output;
      expect(function() {
	output = analyze.normalize([
	  { time: 0.0, thrust: 0 },
	  { time: 0.1, thrust: 75 },
	  { time: 0.2, thrust: 80 },
	  { time: 0.3, thrust: 100 },
	  { time: 0.4, thrust: 95 },
	  { time: 0.5, thrust: 90 },
	  { time: 0.6, thrust: 85 },
	  { time: 0.8, thrust: 60 },
	  { time: 0.9, thrust: 20 },
	  { time: 1.0, thrust: 0 },
	]);
      }).not.toThrow();
      expect(output.length).toBe(9);
      expect(output[0].thrust).toBeGreaterThan(0);
    });
    it("merge", function() {
      var output, lastTime, i;
      expect(function() {
	output = analyze.normalize([
	  { time: 0.1, thrust: 75 },
	  { time: 0.2, thrust: 79 },
	  { time: 0.2, thrust: 81 },
	  { time: 0.3, thrust: 100 },
	  { time: 0.4, thrust: 96 },
	  { time: 0.4, thrust: 95 },
	  { time: 0.4, thrust: 94 },
	  { time: 0.5, thrust: 90 },
	  { time: 0.6, thrust: 85 },
	  { time: 0.8, thrust: 60 },
	  { time: 0.9, thrust: 20 },
	  { time: 1.0, thrust: 0 },
	]);
      }).not.toThrow();
      expect(output.length).toBe(9);
      lastTime = 0;
      for (i = 0; i < output.length; i++) {
	expect(output[i].time).toBeGreaterThan(lastTime + 0.09);
	lastTime = output[i].time;
      }
      expect(output[1].thrust).toBe(80);
      expect(output[3].thrust).toBe(95);
    });
  });

  describe("stats", function() {
    it("data points", function() {
      var output;
      expect(function() {
	output = analyze.stats([
	  { time: 0.065, thrust: 604.264 },
	  { time: 0.196, thrust: 642.625 },
	  { time: 0.327, thrust: 682.197 },
	  { time: 0.458, thrust: 732.995 },
	  { time: 0.591, thrust: 758.236 },
	  { time: 0.723, thrust: 780.289 },
	  { time: 0.854, thrust: 794.452 },
	  { time: 0.985, thrust: 797.939 },
	  { time: 1.117, thrust: 797.601 },
	  { time: 1.249, thrust: 773.842 },
	  { time: 1.381, thrust: 711.608 },
	  { time: 1.512, thrust: 646.522 },
	  { time: 1.644, thrust: 590.724 },
	  { time: 1.775, thrust: 537.505 },
	  { time: 1.907, thrust: 491.012 },
	  { time: 2.040, thrust: 445.836 },
	  { time: 2.171, thrust: 401.461 },
	  { time: 2.302, thrust: 364.291 },
	  { time: 2.433, thrust: 319.614 },
	  { time: 2.566, thrust: 255.577 },
	  { time: 2.698, thrust: 172.573 },
	  { time: 2.829, thrust: 103.501 },
	  { time: 2.960, thrust: 51.795 },
	  { time: 3.092, thrust: 26.814 },
	  { time: 3.224, thrust: 15.203 },
	  { time: 3.356, thrust: 0.000 },
	]);
      }).not.toThrow();
      expect(output).toBeDefined();
      expect(typeof output).toBe('object');
      expect(output.pointCount).toBe(26);
      expect(output.params).toBeDefined();
      expect(output.maxThrust).toBeCloseTo(797.9, 1);
      expect(output.maxTime).toBe(3.356);
      expect(output.avgThrust).toBeCloseTo(537.5, 1);
      expect(output.burnTime).toBeCloseTo(3.0, 1);
      expect(output.totalImpulse).toBeCloseTo(1624.9, 1);
    });
  });

  describe("fit", function() {
    var func;
    it("create", function() {
      expect(function() {
	func = analyze.fit([
	  { time: 0.065, thrust: 604.264 },
	  { time: 0.196, thrust: 642.625 },
	  { time: 0.327, thrust: 682.197 },
	  { time: 0.458, thrust: 732.995 },
	  { time: 0.591, thrust: 758.236 },
	  { time: 0.723, thrust: 780.289 },
	  { time: 0.854, thrust: 794.452 },
	  { time: 0.985, thrust: 797.939 },
	  { time: 1.117, thrust: 797.601 },
	  { time: 1.249, thrust: 773.842 },
	  { time: 1.381, thrust: 711.608 },
	  { time: 1.512, thrust: 646.522 },
	  { time: 1.644, thrust: 590.724 },
	  { time: 1.775, thrust: 537.505 },
	  { time: 1.907, thrust: 491.012 },
	  { time: 2.040, thrust: 445.836 },
	  { time: 2.171, thrust: 401.461 },
	  { time: 2.302, thrust: 364.291 },
	  { time: 2.433, thrust: 319.614 },
	  { time: 2.566, thrust: 255.577 },
	  { time: 2.698, thrust: 172.573 },
	  { time: 2.829, thrust: 103.501 },
	  { time: 2.960, thrust: 51.795 },
	  { time: 3.092, thrust: 26.814 },
	  { time: 3.224, thrust: 15.203 },
	  { time: 3.356, thrust: 0.000 },
	]);
      }).not.toThrow();
      expect(typeof func).toBe('function');
    });
    it("graph", function() {
      console.log('plot "-" with lines');
      for (var i = 0; i <= 360; i++) {
	console.log(i / 100 + ' ' + func(i / 100));
      }
    });
    it("out of range", function() {
      expect(func(-1)).toBe(0);
      expect(func(4.0)).toBe(0);
    });
    it("ends of range", function() {
      expect(func(0)).toBe(0);
      expect(func(3.356)).toBe(0);
    });
    it("rising", function() {
      var lastThrust, nextThrust, i, t;
      lastThrust = 0;
      for (i = 1; i < 99; i++) {
	t = i / 100;
	nextThrust = func(t);
	expect(nextThrust).toBeGreaterThan(lastThrust);
	lastThrust = nextThrust;
      }
      expect(lastThrust).toBeCloseTo(797.8, 1);
    });
    it("falling", function() {
      var lastThrust, nextThrust, i, t;
      lastThrust = func(0.985);
      for (i = 99; i <= 336; i++) {
	t = i / 100;
	nextThrust = func(t);
	expect(nextThrust).toBeLessThan(lastThrust);
	lastThrust = nextThrust;
      }
      expect(lastThrust).toBe(0);
    });
  });
});
