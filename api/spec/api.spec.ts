import { ThrustCurveAPI } from '../src/api.js';

const ID_RE = /^[0-9a-f]{24}$/;

describe('ThrustCurveAPI', () => {
  let api: ThrustCurveAPI;

  beforeEach(() => {
    api = new ThrustCurveAPI();
  });

  describe('constructor', () => {
    it('should use default base URL if none provided', () => {
      expect(api['baseUrl']).toBe('https://www.thrustcurve.org/api/v1');
    });

    it('should use custom base URL if provided', () => {
      const customUrl = 'http://localhost:3000/api';
      api = new ThrustCurveAPI(customUrl);
      expect(api['baseUrl']).toBe(customUrl);
    });
  });

  describe('metadata', () => {
    it('all metadata', async () => {
      const rsp = await api.metadata();

      expect(rsp.manufacturers.length).toBeGreaterThan(10);
      expect(rsp.certOrgs.length).toBeGreaterThan(3);
      expect(rsp.types.length).toBe(3);
      expect(rsp.diameters.length).toBeGreaterThan(5);
      expect(rsp.impulseClasses.length).toBeGreaterThan(10);
    });

    it('Estes C motors', async () => {
      const rsp = await api.metadata({
        manufacturer: 'Estes',
        impulseClass: 'C'
      });
      expect(rsp.manufacturers.length).toBe(1);
      expect(rsp.manufacturers[0]).toEqual({ name: 'Estes Industries', abbrev: 'Estes' })
      expect(rsp.certOrgs.length).toBe(1);
      expect(rsp.certOrgs[0]).toEqual({ name: 'National Association of Rocketry', abbrev: 'NAR' })
      expect(rsp.types.length).toBe(1);
      expect(rsp.types[0]).toBe('SU');
      expect(rsp.diameters.length).toBeGreaterThan(1);
      expect(rsp.diameters[0]).toBe(18);
      expect(rsp.impulseClasses.length).toBe(1);
      expect(rsp.impulseClasses[0]).toBe('C');
    });
  });

  describe('searchMotors', () => {
    it('no criteria', async () => {
      const rsp = await api.searchMotors({});
      expect(rsp.criteria.length).toBe(0);
      expect(rsp.matches).toBeGreaterThan(1000);
      expect(rsp.results.length).toBe(20);
    });

    it('Estes C motors', async () => {
      const rsp = await api.searchMotors({
        manufacturer: 'Estes',
        impulseClass: 'C'
      });

      expect(rsp.criteria.length).toBe(2);
      expect(rsp.criteria[0].name).toBe('manufacturer');
      expect(rsp.criteria[0].value).toBe('Estes');
      expect(rsp.criteria[0].matches).toBeGreaterThan(10);
      expect(rsp.criteria[1].name).toBe('impulseClass');
      expect(rsp.criteria[1].value).toBe('C');
      expect(rsp.criteria[1].matches).toBeGreaterThan(10);
      expect(rsp.matches).toBeGreaterThan(2);

      expect(rsp.results.length).toBe(rsp.matches);
      rsp.results.forEach(r => {
        expect(r.motorId).toMatch(ID_RE);
        expect(r.manufacturer).toBe('Estes Industries');
        expect(r.manufacturerAbbrev).toBe('Estes');
        expect(r.designation).toMatch(/^C\d+/);
        expect(r.commonName).toEqual(r.designation);
        expect(r.impulseClass).toBe('C');
        expect(r.type).toBe('SU');
        expect(r.certOrg).toBe('National Association of Rocketry');
        expect(r.avgThrustN).toBeGreaterThan(0);
        expect(r.maxThrustN).toBeGreaterThan(0);
        expect(r.totImpulseNs).toBeGreaterThan(0);
        expect(r.burnTimeS).toBeGreaterThan(0);
        expect(r.totalWeightG).toBeGreaterThan(0);
        expect(r.propWeightG).toBeGreaterThan(0);
      });
    });

    it('Estes N motors', async () => {
      const rsp = await api.searchMotors({
        manufacturer: 'Estes',
        impulseClass: 'N'
      });
      expect(rsp.criteria.length).toBe(2);
      expect(rsp.criteria[0].name).toBe('manufacturer');
      expect(rsp.criteria[0].value).toBe('Estes');
      expect(rsp.criteria[0].matches).toBeGreaterThan(10);
      expect(rsp.criteria[1].name).toBe('impulseClass');
      expect(rsp.criteria[1].value).toBe('N');
      expect(rsp.criteria[1].matches).toBeGreaterThan(0);
      expect(rsp.matches).toBe(0);
      expect(rsp.results.length).toBe(0);
    });
  });

  describe('downloadMotorData', () => {
    it('Estes C6', async () => {
      const id = '5f4294d20002310000000015';
      const rsp = await api.downloadMotorData({
        motorIds: [id],
        data: 'both'
      });
      expect(rsp.results.length).toBeGreaterThan(1);
      rsp.results.forEach(r => {
        expect(r.motorId).toBe(id);
        expect(r.simfileId).toMatch(ID_RE);
        expect(typeof r.format).toBe('string');
        expect(typeof r.source).toBe('string');
        expect(typeof r.data).toBe('string');
        expect(Array.isArray(r.samples)).toBe(true);
        expect(r.samples?.length).toBeGreaterThan(10);
        const url = '/simfiles/' + r.simfileId + '/';
        expect(r.infoUrl).toBe(url);
        expect(r.dataUrl).toMatch(new RegExp('^' + url + 'download/data.[a-z]+$'));
      });
    });
  });

}); 
