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

export class ThrustCurveAPI {
  private baseUrl: string;

  constructor(baseUrl = 'https://www.thrustcurve.org/api/v1') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    data?: MetadataRequest | SearchRequest | DownloadRequest | GetRocketsRequest | SaveRocketsRequest | MotorGuideRequest
  ): Promise<T> {
    let requestUrl = `${this.baseUrl}/${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
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

    const response = await fetch(requestUrl, options);
    
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
} 
