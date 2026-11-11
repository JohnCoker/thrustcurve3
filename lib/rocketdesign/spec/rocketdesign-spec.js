'use strict';

const designfiles = require('../../../simulate/designfiles');
const rocketdesign = require('..');

describe('rocketdesign', function() {
  const metric = { lengthUnit: 'mm', massUnit: 'g', guideUnit: 'm' };
  const imperial = { lengthUnit: 'in', massUnit: 'oz', guideUnit: 'ft' };

  function parsed(xml, parse) {
    const error = () => {};
    return parse(xml, error);
  }

  it('copies the launch mount onto the rocket and keeps every stage', function() {
    const built = rocketdesign.fromDesign({
      name: 'Alpha',
      bodyDiameter: 0.0248,
      mass: 0.085,
      cd: 0.6,
      guideLength: 0.9144,
      stages: [{
        name: 'Sustainer',
        mmts: [{ diameter: 0.018, length: 0.073, count: 2 }],
      }],
    }, Object.assign({ fileName: 'Alpha.ork' }, metric));

    expect(built.missing).toEqual([]);
    expect(built.rocket).toEqual({
      public: true,
      name: 'Alpha',
      bodyDiameter: 24.8,
      bodyDiameterUnit: 'mm',
      weight: 85,
      weightUnit: 'g',
      mmtDiameter: 18,
      mmtDiameterUnit: 'mm',
      mmtLength: 73,
      mmtLengthUnit: 'mm',
      mmtCount: 2,
      cd: 0.6,
      guideLength: 0.914,
      guideLengthUnit: 'm',
      stages: [{
        name: 'Sustainer',
        mmts: [{
          mmtDiameter: 18,
          mmtDiameterUnit: 'mm',
          mmtLength: 73,
          mmtLengthUnit: 'mm',
          mmtCount: 2,
        }],
      }],
    });
  });

  it('uses the caller units for the body, weight, and guide', function() {
    const built = rocketdesign.fromDesign({
      name: 'Alpha',
      bodyDiameter: 0.0248,
      mass: 0.085,
      cd: 0.45,
      guideLength: 0.9144,
      stages: [{
        name: 'Sustainer',
        mmts: [{ diameter: 0.018, length: 0.073, count: 1 }],
      }],
    }, imperial);

    expect(built.missing).toEqual([]);
    expect(built.rocket.bodyDiameter).toBe(0.976);
    expect(built.rocket.bodyDiameterUnit).toBe('in');
    expect(built.rocket.weight).toBeCloseTo(2.998, 3);
    expect(built.rocket.weightUnit).toBe('oz');
    expect(built.rocket.mmtDiameter).toBe(18);
    expect(built.rocket.mmtDiameterUnit).toBe('mm');
    expect(built.rocket.mmtLength).toBe(2.874);
    expect(built.rocket.mmtLengthUnit).toBe('in');
    expect(built.rocket.guideLength).toBe(3);
    expect(built.rocket.guideLengthUnit).toBe('ft');
  });

  it('asks for the dry weight an OpenRocket file did not state', function() {
    const built = rocketdesign.fromDesign(parsed(openrocketSingle(), designfiles.parseOpenRocket),
      Object.assign({ fileName: 'Alpha.ork' }, metric));

    expect(built.missing).toEqual(['dry weight']);
    expect(rocketdesign.prompt(built.missing))
      .toBe('The design file did not include the dry weight. Enter it to save the rocket.');
    expect(built.rocket.name).toBe('Alpha');
    expect(built.rocket.mmtDiameter).toBe(18);
    expect(built.rocket.mmtCount).toBe(2);
    expect(built.rocket.cd).toBe(0.6);
    expect(built.rocket.guideLength).toBe(0.914);
    expect(built.rocket.stages[0].name).toBe('Sustainer');
  });

  it('uses the widest tube of the first stage as the launch mount', function() {
    const built = rocketdesign.fromDesign({
      name: 'Cluster',
      bodyDiameter: 0.05,
      mass: 0.2,
      cd: 0.5,
      guideLength: 1,
      stages: [{
        name: 'Booster',
        mmts: [
          { diameter: 0.018, length: 0.07, count: 2 },
          { diameter: 0.029, length: 0.1, count: 1 },
        ],
      }, {
        name: 'Sustainer',
        mmts: [{ diameter: 0.038, length: 0.2, count: 1 }],
      }],
    }, metric);

    expect(built.missing).toEqual([]);
    expect(built.rocket.mmtDiameter).toBe(29);
    expect(built.rocket.mmtLength).toBe(100);
    expect(built.rocket.mmtCount).toBe(1);
    expect(built.rocket.stages[0].mmts.map(mmt => mmt.mmtDiameter)).toEqual([29, 18]);
    expect(built.rocket.stages[0].mmts[1].mmtCount).toBe(2);
    expect(built.rocket.stages[1].mmts[0].mmtDiameter).toBe(38);
  });

  it('uses the first stage as the main mount and keeps the other tubes', function() {
    const built = rocketdesign.fromDesign(parsed(openrocketStaged(), designfiles.parseOpenRocket), metric);

    expect(built.missing).toEqual(['guide length']);
    expect(built.rocket.name).toBe('Two');
    expect(built.rocket.weight).toBe(500);
    expect(built.rocket.bodyDiameter).toBe(40);
    expect(built.rocket.cd).toBe(0.55);
    expect(built.rocket.mmtDiameter).toBe(24);
    expect(built.rocket.mmtLength).toBe(100);
    expect(built.rocket.mmtCount).toBe(2);
    expect(built.rocket.stages.map(stage => stage.name)).toEqual(['Booster', 'Sustainer']);
    expect(built.rocket.stages[0].mmts[0].mmtDiameter).toBe(24);
    expect(built.rocket.stages[1].mmts[0].mmtDiameter).toBe(18);
    expect(built.rocket.stages[1].mmts[0].mmtCount).toBe(1);
  });

  it('asks for the mount a RASAero file cannot describe', function() {
    const built = rocketdesign.fromDesign(parsed(rasaero(), designfiles.parseRASAero),
      Object.assign({ fileName: 'Gamma.cdx1' }, imperial));

    expect(built.missing).toEqual([
      'dry weight',
      'motor mount diameter',
      'motor mount length',
      'motor mount count',
    ]);
    expect(rocketdesign.prompt(built.missing)).toBe(
      'The design file did not include the dry weight, motor mount diameter, motor mount length, or motor mount count. Enter them to save the rocket.');
    expect(built.rocket.name).toBe('Gamma');
    expect(built.rocket.bodyDiameter).toBe(2.6);
    expect(built.rocket.bodyDiameterUnit).toBe('in');
    expect(built.rocket.cd).toBe(0.45);
    expect(built.rocket.guideLength).toBe(6);
    expect(built.rocket.guideLengthUnit).toBe('ft');
    expect(built.rocket.stages).toBeUndefined();
    expect(built.rocket.mmtDiameter).toBeUndefined();
  });

  it('uses the file name when the design has no rocket name', function() {
    const built = rocketdesign.fromDesign({
      bodyDiameter: 0.024,
      cd: 0.5,
    }, Object.assign({ fileName: 'C:\\fakepath\\Estes Alpha III.ork' }, metric));

    expect(built.rocket.name).toBe('Estes Alpha III');
    expect(built.missing).toContain('dry weight');
    expect(built.missing).not.toContain('name');
  });

  it('writes the form mount onto the launch tube and leaves the other tubes', function() {
    const stages = [{
      name: 'Booster',
      mmts: [
        { mmtDiameter: 24, mmtDiameterUnit: 'mm', mmtLength: 100, mmtLengthUnit: 'mm', mmtCount: 2 },
        { mmtDiameter: 18, mmtDiameterUnit: 'mm', mmtLength: 70, mmtLengthUnit: 'mm', mmtCount: 1 },
      ],
    }, {
      name: 'Sustainer',
      mmts: [{ mmtDiameter: 18, mmtDiameterUnit: 'mm', mmtLength: 70, mmtLengthUnit: 'mm', mmtCount: 1 }],
    }];
    const rocket = {
      mmtDiameter: 29,
      mmtDiameterUnit: 'mm',
      mmtLength: 100,
      mmtLengthUnit: 'mm',
      mmtCount: 2,
    };

    rocketdesign.applyImport(rocket, {
      name: 'Two.ork',
      format: 'OpenRocket',
      mimeType: 'application/x-openrocket',
      content: Buffer.from('hello').toString('base64'),
      stages,
    });

    expect(rocket.designFile.format).toBe('OpenRocket');
    expect(rocket.designFile.content.toString()).toBe('hello');
    expect(rocket.stages[0].mmts[0].mmtDiameter).toBe(29);
    expect(rocket.stages[0].mmts[0].mmtCount).toBe(2);
    expect(rocket.stages[0].mmts[1].mmtDiameter).toBe(18);
    expect(rocket.stages[1].name).toBe('Sustainer');
    expect(stages[0].mmts[0].mmtDiameter).toBe(24);
  });

  it('keeps a submitted mount when the file had a stage and no tube', function() {
    const rocket = {
      mmtDiameter: 18,
      mmtDiameterUnit: 'mm',
      mmtLength: 70,
      mmtLengthUnit: 'mm',
      mmtCount: 1,
    };

    rocketdesign.applyImport(rocket, {
      name: 'Gamma.cdx1',
      format: 'RASAero II',
      mimeType: 'application/xml',
      content: Buffer.from('<RASAeroDocument/>'),
      stages: [{ name: 'Sustainer', mmts: [] }],
    });

    expect(rocket.stages[0].name).toBe('Sustainer');
    expect(rocket.stages[0].mmts[0].mmtDiameter).toBe(18);
    expect(rocket.stages[0].mmts[0].mmtLength).toBe(70);
    expect(rocket.mmtDiameter).toBe(18);
  });

  it('stores the file without stages when the design has no tubes', function() {
    const rocket = {
      mmtDiameter: 24,
      mmtDiameterUnit: 'mm',
      mmtLength: 70,
      mmtLengthUnit: 'mm',
      mmtCount: 1,
    };

    rocketdesign.applyImport(rocket, {
      name: 'Gamma.cdx1',
      format: 'RASAero II',
      mimeType: 'application/xml',
      content: Buffer.from('<RASAeroDocument/>'),
    });

    expect(rocket.stages).toBeUndefined();
    expect(rocket.mmtDiameter).toBe(24);
    expect(rocket.designFile.name).toBe('Gamma.cdx1');
    expect(rocket.designFile.content.toString()).toBe('<RASAeroDocument/>');
  });
});

function openrocketSingle() {
  return [
    '<openrocket version="1.10">',
    '<rocket>',
    '<name>Alpha</name>',
    '<stage>',
    '<name>Sustainer</name>',
    '<nosecone><finish>normal</finish><aftradius>0.0124</aftradius></nosecone>',
    '<bodytube>',
    '<outerradius>0.0124</outerradius>',
    '<innertube>',
    '<length>0.07</length>',
    '<outerradius>0.0095</outerradius>',
    '<thickness>0.0005</thickness>',
    '<clusterconfiguration>double</clusterconfiguration>',
    '<motormount><overhang>0.003</overhang></motormount>',
    '</innertube>',
    '</bodytube>',
    '</stage>',
    '</rocket>',
    '<simulations><simulation><conditions>',
    '<launchrodlength>0.9144</launchrodlength>',
    '</conditions></simulation></simulations>',
    '</openrocket>',
  ].join('');
}

function openrocketStaged() {
  return [
    '<openrocket version="1.10">',
    '<rocket>',
    '<name>Two</name>',
    '<stage>',
    '<name>Sustainer</name>',
    '<overridemass>0.2</overridemass>',
    '<overridesubcomponentsmass>true</overridesubcomponentsmass>',
    '<bodytube><outerradius>0.012</outerradius>',
    '<innertube>',
    '<length>0.07</length><outerradius>0.0095</outerradius><thickness>0.0005</thickness>',
    '<motormount><overhang>0</overhang></motormount>',
    '</innertube></bodytube>',
    '</stage>',
    '<stage>',
    '<name>Booster</name>',
    '<overridemass>0.3</overridemass>',
    '<overridesubcomponentsmass>true</overridesubcomponentsmass>',
    '<overridecd>0.55</overridecd>',
    '<overridesubcomponentscd>true</overridesubcomponentscd>',
    '<bodytube><finish>smooth</finish><outerradius>0.02</outerradius>',
    '<podset><instancecount>2</instancecount>',
    '<bodytube>',
    '<length>0.1</length><outerradius>0.0125</outerradius><thickness>0.0005</thickness>',
    '<motormount></motormount>',
    '</bodytube>',
    '</podset></bodytube>',
    '</stage>',
    '</rocket>',
    '</openrocket>',
  ].join('');
}

function rasaero() {
  return [
    '<RASAeroDocument>',
    '<Name>Gamma</Name>',
    '<NoseCone>10 2.6 Tangent Ogive 0 0 Black</NoseCone>',
    '<BodyTube>30 2.6 0 0 0 0 0 10 Black</BodyTube>',
    '<Booster1BodyTube>18 2.2 0 0</Booster1BodyTube>',
    '<Surface>Smooth Paint</Surface>',
    '<RailGuideHeight>72</RailGuideHeight>',
    '</RASAeroDocument>',
  ].join('');
}
