# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-11-05

### Added
- Constructor options object with `baseUrl`, `userAgent`, and `rateLimit` (`backoff` or `error`). A string argument is still accepted as the base URL.
- Default rate-limit backoff. On HTTP 429 the client retries up to three times, waiting about 11s, then 21s, then 31s, before throwing. Pass `rateLimit: 'error'` to throw on the first 429.
- `User-Agent` request header, defaulting to `@thrustcurve/api1`. `null` keeps that default. An empty string omits the header so Node sends its own (usually `"node"`).
- `getConfig()`, which returns the resolved configuration (`ResolvedConfig`). Fields are set and read-only.
- Exported `BASE_URL`.

## [1.1.0] - 2025-08-04

### Added
- `delayAdjustable` on search results (`SearchResult`).

## [1.0.3] - 2025-05-24

### Added
- Initial release of the TypeScript API client.
