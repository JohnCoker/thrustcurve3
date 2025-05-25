// API Response and Request Types

export interface NameAndAbbrev {
  name: string;
  abbrev: string;
}

export interface MetadataRequest {
  manufacturer?: string;
  impulseClass?: string;
  diameter?: number;
  type?: 'SU' | 'reload' | 'hybrid';
  certOrg?: string;
  availability?: 'regular' | 'occasional' | 'OOP' | 'available' | 'all';
}

export interface MetadataResponse {
  manufacturers: NameAndAbbrev[];
  certOrgs: NameAndAbbrev[];
  types: ('SU' | 'reload' | 'hybrid')[];
  diameters: number[];
  impulseClasses: string[];
  error?: string;
}

export interface SearchRequest {
  id?: string;
  manufacturer?: string;
  designation?: string;
  commonName?: string;
  impulseClass?: string;
  diameter?: number;
  type?: 'SU' | 'reload' | 'hybrid';
  certOrg?: string;
  sparky?: boolean;
  infoUpdatedSince?: string;
  hasDataFiles?: boolean;
  dataUpdatedSince?: string;
  availability?: 'regular' | 'occasional' | 'OOP' | 'available' | 'all';
  maxResults?: number;
}

export interface SearchResult {
  motorId: string;
  manufacturer: string;
  manufacturerAbbrev: string;
  designation: string;
  commonName: string;
  impulseClass: string;
  certOrg: string;
  diameter: number;
  length: number;
  type: string;
  avgThrustN?: number;
  maxThrustN?: number;
  totImpulseNs?: number;
  burnTimeS?: number;
  dataFiles: number;
  infoUrl?: string;
  totalWeightG?: number;
  propWeightG?: number;
  delays?: string;
  caseInfo?: string;
  propInfo?: string;
  sparky: boolean;
  updatedOn: string;
  availability: 'regular' | 'occasional' | 'OOP';
}

export interface SearchResponse {
  criteria: Array<{
    name: string;
    value: string;
    matches: number;
    error?: string;
  }>;
  matches: number;
  results: SearchResult[];
}

export interface DownloadRequest {
  motorIds: string[];
  format?: 'RASP' | 'RockSim';
  license?: 'PD' | 'free' | 'other';
  data?: 'file' | 'samples' | 'both';
  maxResults?: number;
}

export interface DataSample {
  time: number;
  thrust: number;
}

export interface DownloadResult {
  motorId: string;
  simfileId: string;
  format: 'RASP' | 'RockSim';
  source: 'cert' | 'mfr' | 'user';
  license: 'PD' | 'free' | 'other';
  data?: string;
  samples?: DataSample[];
  infoUrl: string;
  dataUrl: string;
}

export interface DownloadResponse {
  results: DownloadResult[];
  error?: string;
}

export interface Rocket {
  id?: string;
  name: string;
  public?: boolean;
  bodyDiameterM: number;
  mmtDiameterMm: number;
  mmtLengthMm: number;
  mmtCount?: number;
  weightKg: number;
  adapters?: Array<{
    mmtDiameterMm: number;
    mmtLengthMm: number;
    weightKg: number;
  }>;
  cd: number;
  guideLengthM: number;
  website?: string;
  comments?: string;
  createdOn?: string;
  updatedOn?: string;
  clientId?: string;
}

export interface GetRocketsRequest {
  username: string;
  password: string;
}

export interface GetRocketsResponse {
  results: Rocket[];
  error?: string;
}

export interface SaveRocketsRequest {
  username: string;
  password: string;
  rockets: Rocket[];
}

export interface SaveRocketsResponse {
  results: Array<{
    clientId?: string;
    id: string;
    name: string;
    status: 'created' | 'updated' | 'unchanged' | 'invalid';
  }>;
  error?: string;
}

export interface MotorGuideRequest {
  rocket: {
    name?: string;
    bodyDiameterM: number;
    mmtDiameterMm: number;
    mmtLengthMm: number;
    weightKg: number;
    cd: number;
    guideLengthM: number;
  };
  manufacturer?: string;
  impulseClass?: string;
  type?: 'SU' | 'reload' | 'hybrid';
  availability?: 'regular' | 'occasional' | 'OOP' | 'available' | 'all';
  maxResults?: number;
}

export interface MotorGuideResult {
  motorId: string;
  manufacturer: string;
  manufacturerAbbrev: string;
  designation: string;
  commonName: string;
  thrustToWeight: number;
  simulationsRun: number;
  liftoffTime: number;
  burnoutTime: number;
  apogeeTime: number;
  maxAcceleration: number;
  guideVelocity: number;
  maxVelocity: number;
  burnoutAltitude: number;
  maxAltitude: number;
  optimalDelay: number;
  status: 'ok' | '5-to-1' | 'guide-vel' | 'too-low';
}

export interface MotorGuideResponse {
  criteria: Array<{
    name: string;
    value: string;
    matches: number;
    error?: string;
  }>;
  matches: number;
  results: MotorGuideResult[];
  okCount: number;
  failedCount: number;
  error?: string;
} 
