import { ThrustCurveAPI, BASE_URL } from '../src/api.js';

const ID_RE = /^[0-9a-f]{24}$/;

async function captureHeaders(api: ThrustCurveAPI): Promise<Record<string, string>> {
  const original = globalThis.fetch;
  let sent: Record<string, string> = {};
  globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = init?.headers;
    if (headers != null && !(headers instanceof Headers) && !Array.isArray(headers)) {
      sent = headers;
    }
    return Promise.resolve(new Response('{}', { status: 200 }));
  };
  try {
    await api.metadata();
  } finally {
    globalThis.fetch = original;
  }
  return sent;
}

describe('ThrustCurveAPI', () => {
  let api: ThrustCurveAPI;

  beforeEach(() => {
    api = new ThrustCurveAPI();
  });

  describe('constructor', () => {
    it('should use default options if no config provided', () => {
      expect(api.getConfig().baseUrl).toBe(BASE_URL);
      expect(api.getConfig().userAgent).toMatch(/^@thrustcurve\/api\d+$/);
      expect(api.getConfig().rateLimit).toBe('backoff');
    });
    it('should use default options if empty config provided', () => {
      const api = new ThrustCurveAPI({});
      expect(api.getConfig().baseUrl).toBe(BASE_URL);
      expect(api.getConfig().userAgent).toMatch(/^@thrustcurve\/api\d+$/);
      expect(api.getConfig().rateLimit).toBe('backoff');
    });
    it('should use options if provided', () => {
      const api = new ThrustCurveAPI({
        baseUrl: 'http://localhost:3000/api/v1',
        userAgent: 'test agent',
        rateLimit: 'error',
      });
      expect(api.getConfig().baseUrl).toBe('http://localhost:3000/api/v1');
      expect(api.getConfig().userAgent).toBe('test agent');
      expect(api.getConfig().rateLimit).toBe('error');
    });
    it('should use defaults when options are null', async () => {
      const api = new ThrustCurveAPI({
        baseUrl: null,
        userAgent: null,
        rateLimit: null,
      });
      expect(api.getConfig().baseUrl).toBe(BASE_URL);
      expect(api.getConfig().userAgent).toMatch(/^@thrustcurve\/api\d+$/);
      expect(api.getConfig().rateLimit).toBe('backoff');
      const sent = await captureHeaders(api);
      expect(sent['User-Agent']).toBe(api.getConfig().userAgent);
    });
    it('should omit User-Agent when set to an empty string', async () => {
      const api = new ThrustCurveAPI({ userAgent: '' });
      expect(api.getConfig().userAgent).toBe('');
      const sent = await captureHeaders(api);
      expect(sent['User-Agent']).toBeUndefined();
    });
    it('should use custom base URL if provided (compat)', () => {
      const customUrl = 'http://localhost:3000/api';
      const api = new ThrustCurveAPI(customUrl);
      expect(api.getConfig().baseUrl).toBe(customUrl);
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

  describe('rate limiting', () => {
    it('many searches', async () => {
      for (let i = 0; i < 19; i++) {
        const rsp = await api.searchMotors({ manufacturer: 'Estes' });
        expect(rsp.results.length).toBeGreaterThan(1);
      }
    }, 60_000);

    it('retries a 429 between successful responses', async () => {
      const statuses = [200, 429, 200];
      const payloads = [
        { criteria: [], matches: 1, results: [] },
        {},
        { criteria: [], matches: 2, results: [] },
      ];
      const urls: string[] = [];
      const delays: number[] = [];
      let n = 0;
      const originalFetch = globalThis.fetch;
      const originalSetTimeout = globalThis.setTimeout;

      globalThis.fetch = (input: RequestInfo | URL): Promise<Response> => {
        const i = n;
        n += 1;
        urls.push(String(input));
        return Promise.resolve(new Response(JSON.stringify(payloads[i]), {
          status: statuses[i],
          headers: { 'Content-Type': 'application/json' },
        }));
      };
      globalThis.setTimeout = ((handler: TimerHandler, timeout?: number): number => {
        delays.push(timeout ?? 0);
        if (typeof handler === 'function') {
          handler();
        }
        return 0;
      }) as typeof globalThis.setTimeout;

      try {
        const client = new ThrustCurveAPI({ baseUrl: 'http://example.test/api/v1' });
        const first = await client.searchMotors({ manufacturer: 'Estes' });
        const second = await client.searchMotors({ manufacturer: 'Estes' });

        expect(first.matches).toBe(1);
        expect(second.matches).toBe(2);
        expect(n).toBe(3);
        expect(urls).toEqual([
          'http://example.test/api/v1/search.json',
          'http://example.test/api/v1/search.json',
          'http://example.test/api/v1/search.json',
        ]);
        // Just past Cloudflare's 10 second backoff.
        expect(delays).toEqual([10_999]);
      } finally {
        globalThis.fetch = originalFetch;
        globalThis.setTimeout = originalSetTimeout;
      }
    });
  });
}); 
