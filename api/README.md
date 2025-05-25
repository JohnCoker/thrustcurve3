# ThrustCurve.org API Client

A TypeScript client for the ThrustCurve.org API. This client provides type-safe access to the ThrustCurve.org motor and simulator file database.

For details, see [the API documentation](https://www.thrustcurve.org/info/api.html).

## Installation

```bash
npm install @thrustcurve/api1
```

## Usage

First, import and instantiate the API client:

```typescript
import { ThrustCurveAPI } from '@thrustcurve/api1';

const api = new ThrustCurveAPI();
```

### Examples

#### Motor Metadata

```typescript
// Get metadata for all motors
const metadata = await api.metadata();

// Get metadata for motors that match the criteria
const filteredMetadata = await api.metadata({
  manufacturer: 'Estes',
  impulseClass: 'C',
  type: 'SU'
});
```

#### Search Motors

```typescript
const searchResults = await api.searchMotors({
  manufacturer: 'Estes',
  impulseClass: 'C',
  diameter: 18,
  type: 'SU',
  availability: 'regular'
});
```

#### Download Motor Data

```typescript
const motorData = await api.downloadMotorData({
  motorIds: ['5f4294d20002310000000015'],
  format: 'RASP',
  data: 'both'
});
```

#### Saved Rockets

```typescript
// Get rockets from account
const rockets = await api.getRockets({
  username: 'user@example.com',
  password: 'password'
});

// Save rockets to account
const savedRockets = await api.saveRockets({
  username: 'user@example.com',
  password: 'password',
  rockets: [{
    name: 'Alpha III',
    bodyDiameterM: 0.025,
    mmtDiameterMm: 18,
    mmtLengthMm: 70,
    weightKg: 0.045,
    cd: 0.25,
    guideLengthM: 1.0
  }]
});
```

#### Motor Recommendations

```typescript
const recommendations = await api.motorGuide({
  rocket: {
    name: 'Alpha III',
    bodyDiameterM: 0.025,
    mmtDiameterMm: 18,
    mmtLengthMm: 70,
    weightKg: 0.045,
    cd: 0.25,
    guideLengthM: 1.0
  },
  manufacturer: 'Estes',
  type: 'SU',
  availability: 'regular'
});
```

## Error Handling

The API client throws errors for non-200 responses. You should wrap API calls in try/catch blocks:

```typescript
try {
  const data = await api.searchMotors({ /* ... */ });
} catch (error) {
  console.error('API request failed:', error);
}
```

## API Reference

The client provides the following methods:
- `metadata(params?: MetadataRequest)`: Get metadata about motors
- `searchMotors(criteria: SearchRequest)`: Search for motors
- `downloadMotorData(request: DownloadRequest)`: Download motor data files
- `getRockets(credentials: GetRocketsRequest)`: Get saved rockets
- `saveRockets(request: SaveRocketsRequest)`: Save rockets
- `motorGuide(request: MotorGuideRequest)`: Get motor recommendations

See the TypeScript type definitions for detailed parameter and response types
and for details, see [the API documentation](https://www.thrustcurve.org/info/api.html).

## License

This software is licensed under the [ISC license](https://opensource.org/licenses/ISC); see [LICENSE](LICENSE) for more info.
