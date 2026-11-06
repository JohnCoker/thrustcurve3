import type {
  MetadataRequest,
  MetadataResponse,
  SearchRequest,
  SearchResponse,
  DownloadRequest,
  DownloadResponse,
  GetRocketsRequest,
  GetRocketsResponse,
  SaveRocketsRequest,
  SaveRocketsResponse,
  MotorGuideRequest,
  MotorGuideResponse
} from './types.js';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function decodeBase64(base64String: string): string {
  if (typeof window === 'undefined') {
    // Node.js environment
    return Buffer.from(base64String, 'base64').toString('utf-8');
  } else {
    // Browser environment
    return new TextDecoder().decode(
      Uint8Array.from(atob(base64String), c => c.charCodeAt(0))
    );
  }
}

export const BASE_URL = 'https://www.thrustcurve.org/api/v1';

/**
 * Configuration options that may be passed to the ThrustCurveAPI constructor. All of these are optional and
 * default values will be used if unspecified. Explicit `null` also selects the default.
 * An empty `userAgent` omits the header so the runtime sends its own.
 */
export interface Config {
  baseUrl?: string | null;
  userAgent?: string | null;
  rateLimit?: 'error' | 'backoff' | null;
}

/**
 * Configuration after defaults are applied. Every field is set.
 * `userAgent` is `''` when the header is omitted.
 */
export interface ResolvedConfig {
  readonly baseUrl: string;
  readonly userAgent: string;
  readonly rateLimit: 'error' | 'backoff';
}

export class ThrustCurveAPI {
  private config: ResolvedConfig;

  constructor(config?: Config | string) {
    const resolved = {
      baseUrl: BASE_URL,
      userAgent: '@thrustcurve/api1',
      rateLimit: 'backoff' as ResolvedConfig['rateLimit'],
    };
    if (typeof config === 'string') {
      resolved.baseUrl = config;
    } else if (config != null) {
      if (config.baseUrl != null) {
        resolved.baseUrl = config.baseUrl;
      }
      if (config.userAgent != null) {
        resolved.userAgent = config.userAgent;
      }
      if (config.rateLimit != null) {
        resolved.rateLimit = config.rateLimit;
      }
    }
    this.config = Object.freeze(resolved);
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    data?: MetadataRequest | SearchRequest | DownloadRequest | GetRocketsRequest | SaveRocketsRequest | MotorGuideRequest
  ): Promise<T> {
    let requestUrl = `${this.config.baseUrl}/${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.userAgent != null && this.config.userAgent !== '') {
      headers['User-Agent'] = this.config.userAgent;
    }
    const options: RequestInit = {
      method,
      headers,
    };

    if (data) {
      if (method === 'GET') {
        const params = new URLSearchParams();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, String(value));
          }
        });
        const queryString = params.toString();
        if (queryString) {
          requestUrl += `?${queryString}`;
        }
      } else {
        options.body = JSON.stringify(data);
      }
    }

    let response = await fetch(requestUrl, options);

    function isRateLimited(): boolean {
      return response.status === 429;
    }
    if (isRateLimited() && this.config.rateLimit === 'backoff') {
      for (let retry = 1; isRateLimited() && retry <= 3; retry++) {
        await delay(10_000 * retry + 999);
        response = await fetch(requestUrl, options);
      }
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get metadata about motors in the database
   */
  async metadata(criteria: MetadataRequest = {}): Promise<MetadataResponse> {
    return this.request<MetadataResponse>('metadata.json', 'GET', criteria);
  }

  /**
   * Search for motors by various criteria
   */
  async searchMotors(criteria: SearchRequest): Promise<SearchResponse> {
    return this.request<SearchResponse>('search.json', 'POST', criteria);
  }

  /**
   * Download simulator files for specific motors
   */
  async downloadMotorData(request: DownloadRequest): Promise<DownloadResponse> {
    const response = await this.request<DownloadResponse>('download.json', 'POST', request);
    
    // Decode base64 data in results
    response.results = response.results.map(result => ({
      ...result,
      data: result.data ? decodeBase64(result.data) : undefined
    }));
    
    return response;
  }

  /**
   * Get saved rockets for an account
   */
  async getRockets(credentials: GetRocketsRequest): Promise<GetRocketsResponse> {
    return this.request<GetRocketsResponse>('getrockets.json', 'POST', credentials);
  }

  /**
   * Save rockets to an account
   */
  async saveRockets(request: SaveRocketsRequest): Promise<SaveRocketsResponse> {
    return this.request<SaveRocketsResponse>('saverockets.json', 'POST', request);
  }

  /**
   * Get motor recommendations for a specific rocket
   */
  async motorGuide(request: MotorGuideRequest): Promise<MotorGuideResponse> {
    return this.request<MotorGuideResponse>('motorguide.json', 'POST', request);
  }

  /**
   * Get the configuration set at construction time, including default values applied.
   */
  getConfig(): ResolvedConfig {
    return this.config;
  }
} 
