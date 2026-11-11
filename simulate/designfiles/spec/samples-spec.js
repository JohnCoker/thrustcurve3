'use strict';

const fs = require('fs'),
      path = require('path'),
      errors = require('../../../lib/errors'),
      designfiles = require('../');

// RockSim files are from ~/Documents/Rocketry/RockSim. Most leave mass and Cd
// for RockSim to calculate. n1_2.rkt is n1.rkt resaved by the current RockSim
// and is still file version 4. Arreaux_2.RKT is that resave with the mass
// and Cd overrides left on. OpenRocket examples are from the OpenRocket
// distribution, including the 24.12 examples shipped in the app. Simple.ork and
// Arreaux.ork are from ~/Documents/Rocketry/OpenRocket. Arreaux.ork is the
// RockSim file opened and saved by OpenRocket 24.12.
// A stage mass override is the uncommon case in both sets.
// RASAero II files are the OpenRocket importer fixtures. Launch weight includes
// the motor, and the file stores neither a rocket Cd nor a motor mount. The
// extract omits stages so the mount can be entered by hand.
const samples = path.join(__dirname, 'samples');

describe('designfiles RockSim samples', function() {
  function load(name) {
    const error = errors.Collector();
    const rocket = designfiles.parseRockSim(fs.readFileSync(path.join(samples, name), 'utf8'), error);
    expect(error.errors).toEqual([]);
    return rocket;
  }

  it('n1.rkt is an old three-stage cluster', function() {
    const rocket = load('n1.rkt');
    expect(rocket.name).toBe('N1');
    expect(rocket.bodyDiameter).toBeCloseTo(1.07188, 4);
    expect(rocket.guideLength).toBeCloseTo(6.096, 3);
    expect(rocket.mass).toBeUndefined();
    expect(rocket.cd).toBeCloseTo(0.45);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.stages.map(stage => stage.name)).toEqual(['Second booster', 'Booster', 'Sustainer']);
    expect(rocket.stages[0].mmts.map(mmt => mmt.count)).toEqual([24, 7]);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.029, 4);
    expect(rocket.stages[0].mmts[0].length).toBeCloseTo(0.1524, 4);
    expect(rocket.stages[0].mmts[1].diameter).toBeCloseTo(0.054, 4);
    expect(rocket.stages[1].mmts.map(mmt => mmt.count)).toEqual([8, 1]);
    expect(rocket.stages[2].mmts.map(mmt => mmt.count)).toEqual([4, 1]);
  });

  it('n1_2.rkt keeps the same guide data after a current RockSim resave', function() {
    const rocket = load('n1_2.rkt');
    expect(rocket.name).toBe('N1');
    expect(rocket.bodyDiameter).toBeCloseTo(1.07188, 4);
    expect(rocket.guideLength).toBeCloseTo(6.096, 3);
    expect(rocket.mass).toBeUndefined();
    expect(rocket.cd).toBeCloseTo(0.45);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.stages.map(stage => stage.name)).toEqual(['Second booster', 'Booster', 'Sustainer']);
    expect(rocket.stages[0].mmts.map(mmt => [mmt.count, +mmt.diameter.toFixed(3)])).toEqual([[24, 0.029], [7, 0.054]]);
    expect(rocket.stages[1].mmts.map(mmt => mmt.count)).toEqual([8, 1]);
    expect(rocket.stages[2].mmts.map(mmt => mmt.count)).toEqual([4, 1]);
  });

  it('2 Stage Complex.rkt is an old file with CDATA in the parts', function() {
    const rocket = load('2 Stage Complex.rkt');
    expect(rocket.name).toBe('2 stage complex model');
    expect(rocket.bodyDiameter).toBeCloseTo(0.04158, 4);
    expect(rocket.mass).toBeUndefined();
    expect(rocket.cd).toBeCloseTo(0.45);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.stages.map(stage => stage.name)).toEqual(['Booster', 'Sustainer']);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.024, 3);
    expect(rocket.stages[1].mmts[0].diameter).toBeCloseTo(0.018, 3);
  });

  it('Aerobe4in.rkt calculates mass and infers Cd from a polished finish', function() {
    const rocket = load('Aerobe4in.rkt');
    expect(rocket.name).toBe('Aerobee 4"');
    expect(rocket.bodyDiameter).toBeCloseTo(0.10211, 4);
    expect(rocket.guideLength).toBeCloseTo(0.9144, 3);
    expect(rocket.mass).toBeUndefined();
    expect(rocket.cd).toBeCloseTo(0.3);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.stages.map(stage => stage.name)).toEqual(['Booster', 'Sustainer']);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.029, 3);
    expect(rocket.stages[1].mmts[0].diameter).toBeCloseTo(0.054, 3);
  });

  it('Arreaux.RKT overrides both mass and Cd', function() {
    const rocket = load('Arreaux.RKT');
    expect(rocket.name).toBe('Arreaux');
    expect(rocket.mass).toBeCloseTo(5.4431, 3);
    expect(rocket.cd).toBeCloseTo(0.25);
    expect(rocket.cdInferred).toBe(false);
    expect(rocket.stages.length).toBe(1);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.098, 3);
  });

  it('Arreaux_2.RKT keeps the overrides after a current RockSim resave', function() {
    const rocket = load('Arreaux_2.RKT');
    expect(rocket.name).toBe('Arreaux');
    expect(rocket.mass).toBeCloseTo(5.443, 4);
    expect(rocket.cd).toBeCloseTo(0.25);
    expect(rocket.cdInferred).toBe(false);
    expect(rocket.bodyDiameter).toBeCloseTo(0.10221, 4);
    expect(rocket.guideLength).toBeCloseTo(1.8288, 4);
    expect(rocket.stages.length).toBe(1);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.098, 3);
  });

  it('Comanche 3.rkt overrides mass and infers a polished Cd', function() {
    const rocket = load('Comanche 3.rkt');
    expect(rocket.name).toBe('Comanche 3 Upscale');
    expect(rocket.mass).toBeCloseTo(5.6245, 3);
    expect(rocket.cd).toBeCloseTo(0.3);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.stages.map(stage => stage.name)).toEqual(['Second booster', 'Booster', 'Sustainer']);
    expect(rocket.stages.map(stage => stage.mmts.length)).toEqual([1, 1, 1]);
    rocket.stages.forEach(stage => expect(stage.mmts[0].diameter).toBeCloseTo(0.054, 3));
  });

  it('100k-V8.rkt overrides the stacked Cd and calculates mass', function() {
    const rocket = load('100k-V8.rkt');
    expect(rocket.name).toBe('100K');
    expect(rocket.bodyDiameter).toBeCloseTo(0.1651, 4);
    expect(rocket.cd).toBeCloseTo(0.78);
    expect(rocket.cdInferred).toBe(false);
    expect(rocket.mass).toBeUndefined();
    expect(rocket.guideLength).toBeCloseTo(3.6576, 3);
    expect(rocket.stages.map(stage => stage.name)).toEqual(['Booster', 'Sustainer']);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.15, 3);
    expect(rocket.stages[1].mmts[0].diameter).toBeCloseTo(0.076, 3);
  });

  it('Ariane 6 A64.rkt is a recent single stage with two mount sizes', function() {
    const rocket = load('Ariane 6 A64.rkt');
    expect(rocket.name).toBe('Ariane 6 A64');
    expect(rocket.bodyDiameter).toBeCloseTo(0.15646, 4);
    expect(rocket.guideLength).toBeCloseTo(0.9144, 3);
    expect(rocket.mass).toBeUndefined();
    expect(rocket.cd).toBeCloseTo(0.3);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.stages.map(stage => stage.name)).toEqual(['Sustainer']);
    expect(rocket.stages[0].mmts.map(mmt => mmt.count)).toEqual([1, 4]);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.076, 3);
    expect(rocket.stages[0].mmts[0].length).toBeCloseTo(0.6482, 4);
    expect(rocket.stages[0].mmts[1].diameter).toBeCloseTo(0.038, 3);
    expect(rocket.stages[0].mmts[1].length).toBeCloseTo(0.3561, 4);
  });
});

describe('designfiles OpenRocket samples', function() {
  function load(name) {
    const error = errors.Collector();
    const rocket = designfiles.parseOpenRocket(fs.readFileSync(path.join(samples, name)), error);
    expect(error.errors).toEqual([]);
    return rocket;
  }

  it('Simple.ork is a calculated single stage with no rod', function() {
    const rocket = load('Simple.ork');
    expect(rocket.name).toBe('Simple');
    expect(rocket.bodyDiameter).toBeCloseTo(0.0563, 3);
    expect(rocket.guideLength).toBeUndefined();
    expect(rocket.mass).toBeUndefined();
    expect(rocket.cd).toBeCloseTo(0.6);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.stages.length).toBe(1);
    expect(rocket.stages[0].mmts[0].count).toBe(1);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.018, 3);
    expect(rocket.stages[0].mmts[0].length).toBeCloseTo(0.1, 3);
  });

  it('Clustered rocket design.ork is a four-motor cluster', function() {
    const rocket = load('Clustered rocket design.ork');
    expect(rocket.name).toBe('A clustered rocket');
    expect(rocket.mass).toBeUndefined();
    expect(rocket.cd).toBeCloseTo(0.6);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.stages[0].mmts[0].count).toBe(4);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.018, 3);
  });

  it('Three-stage rocket.ork lights the bottom stage first', function() {
    const rocket = load('Three-stage rocket.ork');
    expect(rocket.name).toBe('Three-staged rocket');
    expect(rocket.mass).toBeUndefined();
    expect(rocket.stages.map(stage => stage.name)).toEqual(['Booster stage', 'Booster stage', 'Sustainer']);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.018, 3);
    expect(rocket.stages[2].mmts[0].length).toBeCloseTo(0.078, 3);
  });

  it('Pods Example.ork multiplies the pod motors', function() {
    const rocket = load('Pods Example.ork');
    expect(rocket.stages[0].name).toBe('Core Stage');
    expect(rocket.stages[0].mmts.map(mmt => mmt.count)).toEqual([1, 4]);
    expect(rocket.stages[0].mmts[1].diameter).toBeCloseTo(0.02, 3);
    expect(rocket.stages[1].mmts).toEqual([]);
  });

  it('Parallel Staging Example.ork keeps the strap-on motors on the core', function() {
    const rocket = load('Parallel Staging Example.ork');
    expect(rocket.stages[0].name).toBe('Core Stage');
    expect(rocket.stages[0].mmts.map(mmt => mmt.count)).toEqual([1, 3]);
    expect(rocket.stages[0].mmts[1].diameter).toBeCloseTo(0.018, 3);
    expect(rocket.stages[0].mmts[1].length).toBeCloseTo(0.26, 3);
  });

  it('Dual parachute deployment.ork overrides the stage mass', function() {
    const rocket = load('Dual parachute deployment.ork');
    expect(rocket.name).toBe('Dual parachute deployment');
    expect(rocket.mass).toBeCloseTo(1.3608, 3);
    expect(rocket.cd).toBeCloseTo(0.6);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.bodyDiameter).toBeCloseTo(0.0566, 3);
    expect(rocket.guideLength).toBeCloseTo(3.048, 3);
    expect(rocket.stages.length).toBe(1);
    expect(rocket.stages[0].mmts[0].count).toBe(1);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.0386, 3);
  });

  it('Airstart timing.ork has two motor sizes on one stage', function() {
    const rocket = load('Airstart timing.ork');
    expect(rocket.name).toBe('Airstart timing');
    expect(rocket.mass).toBeUndefined();
    expect(rocket.cd).toBeCloseTo(0.6);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.bodyDiameter).toBeCloseTo(0.1949, 3);
    expect(rocket.stages[0].mmts.map(mmt => mmt.count)).toEqual([1, 3]);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.0547, 3);
    expect(rocket.stages[0].mmts[1].diameter).toBeCloseTo(0.0387, 3);
  });

  it('Pods--powered with recovery deployment.ork puts the side motors on the booster', function() {
    const rocket = load('Pods--powered with recovery deployment.ork');
    expect(rocket.name).toBe('Pods--powered with recovery deployment');
    expect(rocket.mass).toBeUndefined();
    expect(rocket.cd).toBeCloseTo(0.6);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.stages.map(stage => stage.name)).toEqual(['Booster', 'Sustainer']);
    expect(rocket.stages[0].mmts.map(mmt => mmt.count)).toEqual([1, 1, 1]);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.01816, 4);
    expect(rocket.stages[0].mmts[1].diameter).toBeCloseTo(0.01308, 4);
    expect(rocket.stages[1].mmts[0].diameter).toBeCloseTo(0.018, 3);
  });

  it('Base drag hack (short-wide).ork does not use a Cd that leaves the parts in place', function() {
    const rocket = load('Base drag hack (short-wide).ork');
    expect(rocket.name).toBe('Base drag hack (short-wide)');
    expect(rocket.bodyDiameter).toBeCloseTo(0.07874, 4);
    expect(rocket.guideLength).toBeCloseTo(3.048, 3);
    expect(rocket.mass).toBeUndefined();
    expect(rocket.cd).toBeCloseTo(0.6);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.stages[0].mmts[0].count).toBe(1);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.02413, 4);
  });

  it('Arreaux.ork keeps the RockSim dry mass and infers a smooth finish', function() {
    const rocket = load('Arreaux.ork');
    expect(rocket.name).toBe('Arreaux');
    expect(rocket.mass).toBeCloseTo(5.44310844, 5);
    expect(rocket.cd).toBeCloseTo(0.45);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.bodyDiameter).toBeCloseTo(0.10221, 4);
    expect(rocket.guideLength).toBeUndefined();
    expect(rocket.stages.map(stage => stage.name)).toEqual(['Stage']);
    expect(rocket.stages[0].mmts[0].count).toBe(1);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.09906, 5);
    expect(rocket.stages[0].mmts[0].length).toBeCloseTo(1.2319, 4);
  });

  it('Apocalypse with decals.ork overrides the stage mass', function() {
    const rocket = load('Apocalypse with decals.ork');
    expect(rocket.name).toBe('Apocalypse');
    expect(rocket.mass).toBeCloseTo(4);
    expect(rocket.cd).toBeCloseTo(0.45);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.0544, 3);
  });
});

describe('designfiles RASAero II samples', function() {
  function load(name) {
    const error = errors.Collector();
    const rocket = designfiles.parseRASAero(fs.readFileSync(path.join(samples, name), 'utf8'), error);
    expect(error.errors).toEqual([]);
    return rocket;
  }

  it('Show-off.CDX1 takes the fin-can diameter and ignores the launch weight', function() {
    const rocket = load('Show-off.CDX1');
    expect(rocket.name).toBeUndefined();
    expect(rocket.bodyDiameter).toBeCloseTo(2.73 * 0.0254, 5);
    expect(rocket.guideLength).toBeCloseTo(4 * 0.0254, 5);
    expect(rocket.mass).toBeUndefined();
    expect(rocket.cd).toBeCloseTo(0.3);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.stages).toBeUndefined();
  });

  it('Complex.Two-Stage.CDX1 uses the booster flare as the body diameter', function() {
    const rocket = load('Complex.Two-Stage.CDX1');
    expect(rocket.bodyDiameter).toBeCloseTo(6.5 * 0.0254, 5);
    expect(rocket.guideLength).toBeCloseTo(12 * 0.0254, 5);
    expect(rocket.mass).toBeUndefined();
    expect(rocket.cd).toBeCloseTo(0.45);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.stages).toBeUndefined();
  });

  it('Three-stage rocket.CDX1 reads the airframe and leaves the mount unset', function() {
    const rocket = load('Three-stage rocket.CDX1');
    expect(rocket.bodyDiameter).toBeCloseTo(0.984 * 0.0254, 5);
    expect(rocket.guideLength).toBeCloseTo(12 * 0.0254, 5);
    expect(rocket.mass).toBeUndefined();
    expect(rocket.cd).toBeCloseTo(0.3);
    expect(rocket.cdInferred).toBe(true);
    expect(rocket.stages).toBeUndefined();
  });
});
