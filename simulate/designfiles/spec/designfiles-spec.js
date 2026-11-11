'use strict';

const zlib = require('zlib'),
      errors = require('../../../lib/errors'),
      designfiles = require('../');

describe('designfiles', function() {
  describe('formatInfo', function() {
    it('unknown', function() {
      expect(designfiles.formatInfo('WinRoc')).toBeUndefined();
    });
    it('OpenRocket', function() {
      const info = designfiles.formatInfo('openrocket');
      expect(info.format).toBe('OpenRocket');
      expect(info.extension).toBe('.ork');
    });
    it('extension', function() {
      expect(designfiles.formatInfo('.cdx1').format).toBe('RASAero II');
      expect(designfiles.formatInfo('rkt').format).toBe('RockSim');
    });
  });

  describe('guessFormat', function() {
    it('empty', function() {
      expect(designfiles.guessFormat('')).toBeUndefined();
    });
    it('OpenRocket', function() {
      expect(designfiles.guessFormat('<openrocket version="1.10"></openrocket>')).toBe('OpenRocket');
    });
    it('OpenRocket zip', function() {
      const zip = storedZip([{ name: 'rocket.ork', data: '<openrocket/>' }]);
      expect(designfiles.guessFormat(zip)).toBe('OpenRocket');
    });
    it('RockSim', function() {
      expect(designfiles.guessFormat('<RockSimDocument></RockSimDocument>')).toBe('RockSim');
    });
    it('RASAero II', function() {
      expect(designfiles.guessFormat('<RASAeroDocument></RASAeroDocument>')).toBe('RASAero II');
    });
  });

  describe('parseData', function() {
    const reporter = errors.Collector;

    it('empty file', function() {
      const error = reporter();
      expect(designfiles.parseData('OpenRocket', '', error)).toBeUndefined();
      expect(error.errors[0].code).toBe(errors.DATA_FILE_EMPTY);
    });

    it('unknown format', function() {
      const error = reporter();
      expect(designfiles.parseData('WinRoc', '<openrocket/>', error)).toBeUndefined();
      expect(error.errors.length).toBe(1);
      expect(error.errors[0].code).toBe(errors.DATA_FILE_FORMAT);
    });

    it('OpenRocket cluster and rod', function() {
      const error = reporter();
      const rocket = designfiles.parseData('OpenRocket', openrocketSingle(), error);
      expect(error.errors).toEqual([]);
      expect(rocket.format).toBe('OpenRocket');
      expect(rocket.mimeType).toBe('application/x-openrocket');
      expect(rocket.name).toBe('Alpha');
      expect(rocket.bodyDiameter).toBeCloseTo(0.0248);
      expect(rocket.guideLength).toBeCloseTo(0.9144);
      expect(rocket.mass).toBeUndefined();
      expect(rocket.cd).toBeCloseTo(0.6);
      expect(rocket.cdInferred).toBe(true);
      expect(rocket.stages.length).toBe(1);
      expect(rocket.stages[0].name).toBe('Sustainer');
      expect(rocket.stages[0].mmts.length).toBe(1);
      expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.018, 6);
      expect(rocket.stages[0].mmts[0].length).toBeCloseTo(0.073, 6);
      expect(rocket.stages[0].mmts[0].count).toBe(2);
    });

    it('OpenRocket rocket mass override replaces the stage masses', function() {
      const error = reporter();
      const rocket = designfiles.parseOpenRocket([
        '<openrocket><rocket><name>Whole</name>',
        '<overridemass>1.25</overridemass>',
        '<overridesubcomponentsmass>true</overridesubcomponentsmass>',
        '<stage><name>Sustainer</name>',
        '<overridemass>0.2</overridemass><overridesubcomponentsmass>true</overridesubcomponentsmass>',
        '<nosecone><aftradius>0.012</aftradius></nosecone>',
        '</stage></rocket></openrocket>',
      ].join(''), error);
      expect(error.errors).toEqual([]);
      expect(rocket.mass).toBeCloseTo(1.25);
    });

    it('OpenRocket zip uses the launch stage first', function() {
      const error = reporter();
      const zip = storedZip([{ name: 'rocket.ork', data: openrocketStaged() }]);
      const rocket = designfiles.parseData('ork', zip, error);
      expect(error.errors).toEqual([]);
      expect(rocket.stages.map(stage => stage.name)).toEqual(['Booster', 'Sustainer']);
      expect(rocket.stages[0].mmts.length).toBe(1);
      expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.024, 6);
      expect(rocket.stages[0].mmts[0].length).toBeCloseTo(0.1, 6);
      expect(rocket.stages[0].mmts[0].count).toBe(2);
      expect(rocket.stages[1].mmts[0].count).toBe(1);
      expect(rocket.cd).toBeCloseTo(0.55);
      expect(rocket.cdInferred).toBe(false);
      expect(rocket.mass).toBeCloseTo(0.5);
    });

    it('OpenRocket deflated zip', function() {
      const error = reporter();
      const zip = deflatedZip('rocket.ork', openrocketSingle());
      const rocket = designfiles.parseOpenRocket(zip, error);
      expect(error.errors).toEqual([]);
      expect(rocket.name).toBe('Alpha');
      expect(rocket.stages[0].mmts[0].count).toBe(2);
    });

    it('OpenRocket gzip', function() {
      const error = reporter();
      const gz = zlib.gzipSync(Buffer.from(openrocketSingle()));
      const rocket = designfiles.parseOpenRocket(gz, error);
      expect(error.errors).toEqual([]);
      expect(rocket.name).toBe('Alpha');
    });

    it('OpenRocket stages are inside subcomponents', function() {
      const error = reporter();
      const rocket = designfiles.parseOpenRocket([
        '<openrocket version="1.9"><rocket><name>Auto</name>',
        '<subcomponents><stage><name>Sustainer</name><subcomponents>',
        '<nosecone><aftradius>0.015</aftradius></nosecone>',
        '<bodytube><length>0.2</length><radius>auto</radius><thickness>0.001</thickness>',
        '<motormount><overhang>0</overhang></motormount></bodytube>',
        '</subcomponents></stage></subcomponents>',
        '</rocket></openrocket>',
      ].join(''), error);
      expect(error.errors).toEqual([]);
      expect(rocket.stages[0].name).toBe('Sustainer');
      expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.028, 4);
      expect(rocket.stages[0].mmts[0].length).toBeCloseTo(0.2, 4);
    });

    it('RockSim booster is the launch stage', function() {
      const error = reporter();
      const rocket = designfiles.parseData('RockSim', rocksimStaged(), error);
      expect(error.errors).toEqual([]);
      expect(rocket.format).toBe('RockSim');
      expect(rocket.mimeType).toBe('application/xml');
      expect(rocket.name).toBe('Beta');
      expect(rocket.bodyDiameter).toBeCloseTo(0.0416);
      expect(rocket.cd).toBeCloseTo(0.7);
      expect(rocket.stages.map(stage => stage.name)).toEqual(['Booster', 'Sustainer']);
      expect(rocket.stages[0].mmts.length).toBe(1);
      expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.029, 6);
      expect(rocket.stages[0].mmts[0].length).toBeCloseTo(0.1, 6);
      expect(rocket.stages[0].mmts[0].count).toBe(1);
      expect(rocket.stages[1].mmts.length).toBe(1);
      expect(rocket.stages[1].mmts[0].diameter).toBeCloseTo(0.018, 6);
      expect(rocket.stages[1].mmts[0].length).toBeCloseTo(0.073, 6);
      expect(rocket.stages[1].mmts[0].count).toBe(1);
      expect(rocket.mass).toBeUndefined();
    });

    it('RockSim reads CDATA, the rod, and clusters identical tubes', function() {
      const error = reporter();
      const rocket = designfiles.parseRockSim([
        '<RockSimDocument><DesignInformation><RocketDesign>',
        '<Name><![CDATA[Aerobee 4"]]></Name>',
        '<LaunchGuideLength>914.4</LaunchGuideLength>',
        '<CalculateCD>0</CalculateCD>',
        '<FixedCd>0.25</FixedCd>',
        '<Stage3Parts>',
        '<NoseCone><Name><![CDATA[Nose]]></Name><BaseDia>101.6</BaseDia></NoseCone>',
        '<BodyTube><OD>101.6</OD><Len>500</Len><IsMotorMount>0</IsMotorMount><AttachedParts>',
        '<BodyTube><Len>70</Len><OD>24</OD><ID>18</ID><IsMotorMount>1</IsMotorMount>',
        '<MotorDia>18</MotorDia><EngineOverhang>0</EngineOverhang></BodyTube>',
        '<BodyTube><Len>70</Len><OD>24</OD><ID>18</ID><IsMotorMount>1</IsMotorMount>',
        '<MotorDia>18</MotorDia><EngineOverhang>0</EngineOverhang></BodyTube>',
        '<BodyTube><Len>70</Len><OD>32</OD><ID>29</ID><IsMotorMount>1</IsMotorMount>',
        '<MotorDia>29</MotorDia><EngineOverhang>0</EngineOverhang></BodyTube>',
        '</AttachedParts></BodyTube>',
        '</Stage3Parts>',
        '</RocketDesign></DesignInformation></RockSimDocument>',
      ].join(''), error);
      expect(error.errors).toEqual([]);
      expect(rocket.name).toBe('Aerobee 4"');
      expect(rocket.bodyDiameter).toBeCloseTo(0.1016);
      expect(rocket.guideLength).toBeCloseTo(0.9144);
      expect(rocket.cd).toBeCloseTo(0.25);
      expect(rocket.stages[0].mmts.length).toBe(2);
      expect(rocket.stages[0].mmts[0].diameter).toBeCloseTo(0.018);
      expect(rocket.stages[0].mmts[0].count).toBe(2);
      expect(rocket.stages[0].mmts[1].diameter).toBeCloseTo(0.029);
      expect(rocket.stages[0].mmts[1].count).toBe(1);
    });

    it('RockSim uses a saved diameter and a single old Cd', function() {
      const error = reporter();
      const saved = designfiles.parseRockSim([
        '<RockSimDocument><DesignInformation><RocketDesign>',
        '<MaxDiaWithoutFins>80</MaxDiaWithoutFins>',
        '<CalculateCD>0</CalculateCD>',
        '<FixedCd>0.5</FixedCd><FixedCd2>0.8</FixedCd2>',
        '<Stage3Parts><BodyTube><OD>100</OD><Len>200</Len><IsMotorMount>0</IsMotorMount></BodyTube></Stage3Parts>',
        '<Stage2Parts><BodyTube><OD>90</OD><Len>100</Len><IsMotorMount>1</IsMotorMount>',
        '<MotorDia>24</MotorDia><ID>24</ID></BodyTube></Stage2Parts>',
        '</RocketDesign></DesignInformation></RockSimDocument>',
      ].join(''), error);
      expect(error.errors).toEqual([]);
      expect(saved.bodyDiameter).toBeCloseTo(0.08);
      expect(saved.cd).toBeCloseTo(0.8);

      const old = designfiles.parseRockSim([
        '<RockSimDocument><DesignInformation><RocketDesign>',
        '<CalculateCD>0</CalculateCD>',
        '<FixedCd>0.6</FixedCd>',
        '<Stage3Parts><NoseCone><BaseDia>40</BaseDia></NoseCone></Stage3Parts>',
        '<Stage2Parts><BodyTube><OD>40</OD><Len>100</Len><IsMotorMount>0</IsMotorMount></BodyTube></Stage2Parts>',
        '</RocketDesign></DesignInformation></RockSimDocument>',
      ].join(''), error);
      expect(old.bodyDiameter).toBeCloseTo(0.04);
      expect(old.cd).toBeCloseTo(0.6);
    });

    it('RockSim known stage masses sum to the dry mass', function() {
      const error = reporter();
      const rocket = designfiles.parseRockSim(rocksimStaged(true), error);
      expect(error.errors).toEqual([]);
      expect(rocket.mass).toBeCloseTo(0.2);
    });

    it('RASAero II diameters are inches and the file has no mount', function() {
      const error = reporter();
      const rocket = designfiles.parseData('RASAero II', rasaeroStaged(), error);
      expect(error.errors).toEqual([]);
      expect(rocket.format).toBe('RASAero II');
      expect(rocket.mimeType).toBe('application/xml');
      expect(rocket.name).toBe('Gamma');
      expect(rocket.bodyDiameter).toBeCloseTo(2.6 * 0.0254);
      expect(rocket.guideLength).toBeCloseTo(72 * 0.0254);
      expect(rocket.mass).toBeUndefined();
      expect(rocket.cd).toBeCloseTo(0.45);
      expect(rocket.cdInferred).toBe(true);
      expect(rocket.stages).toBeUndefined();
    });
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

function rocksimStaged(knownMass) {
  return [
    '<RockSimDocument><DesignInformation><RocketDesign>',
    '<Name>Beta</Name>',
    '<CalculateCD>0</CalculateCD>',
    '<Cd>0.7</Cd>',
    knownMass ? '<UseKnownMass>1</UseKnownMass><Stage2Mass>120</Stage2Mass><Stage3Mass>80</Stage3Mass>' : '',
    '<Stage3Parts>',
    '<NoseCone><BaseDia>24.8</BaseDia></NoseCone>',
    '<BodyTube><OD>24.8</OD><Len>200</Len><IsMotorMount>0</IsMotorMount>',
    '<AttachedParts><BodyTube>',
    '<Len>70</Len><OD>19</OD><ID>18</ID>',
    '<IsMotorMount>1</IsMotorMount><MotorDia>18</MotorDia><EngineOverhang>3</EngineOverhang>',
    '</BodyTube></AttachedParts></BodyTube>',
    '</Stage3Parts>',
    '<Stage2Parts>',
    '<BodyTube><OD>41.6</OD><Len>100</Len>',
    '<IsMotorMount>1</IsMotorMount><MotorDia>29</MotorDia><EngineOverhang>0</EngineOverhang>',
    '</BodyTube>',
    '</Stage2Parts>',
    '</RocketDesign></DesignInformation></RockSimDocument>',
  ].join('');
}

function rasaeroStaged() {
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

function deflatedZip(name, xmlText) {
  const raw = Buffer.from(xmlText);
  const data = zlib.deflateRawSync(raw);
  const nameBuf = Buffer.from(name);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 6);
  local.writeUInt16LE(8, 8);
  local.writeUInt16LE(nameBuf.length, 26);
  const descriptor = Buffer.alloc(16);
  descriptor.writeUInt32LE(0x08074b50, 0);
  descriptor.writeUInt32LE(data.length, 8);
  descriptor.writeUInt32LE(raw.length, 12);
  const localAll = Buffer.concat([local, nameBuf, data, descriptor]);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(raw.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(46 + nameBuf.length, 12);
  end.writeUInt32LE(localAll.length, 16);
  return Buffer.concat([localAll, central, nameBuf, end]);
}

function storedZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  entries.forEach(entry => {
    const name = Buffer.from(entry.name);
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(Buffer.concat([local, name, data]));
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, name]));
    offset += 30 + name.length + data.length;
  });
  const centralAll = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralAll.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat(locals.concat(centrals, [end]));
}
