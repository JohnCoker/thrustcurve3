# npm audit review

Reviewed 2026-10-30 against the installed lockfile.
`npm audit` reported 19 vulnerabilities (2 low, 6 moderate, 4 high, 7 critical).
Those roll up to the advisories below.
Each one needs an input this server does not take, so they are recorded here as non-issues.

The `GHSA-` ids in this file are the allowlist.

* `.npmrc` sets `audit=false`, so `npm install` does not print them. `npm audit` still reports the full set, which is how the next batch shows up.
* GitHub has no allowlist file. `sh .github/scripts/dismiss-audit-allowlist.sh` closes open Dependabot alerts whose id is listed here. It uses the logged-in `gh` account. A GitHub Actions token cannot dismiss alerts.

Look again if a package in a section is upgraded, or if a route starts passing request data into the API that section names. Add any new non-issue here, then run the dismiss script.

## mongoose 5.13.23

Search builds a new query from named fields (`searchQuery` in `lib/api/api1.js`, `doSearch` in `routes/motors.js`).
`populate()` is called with a fixed path such as `'_motor'` or `'_manufacturer'`.
Updates are literal objects (`{ approved: true }`) or one schema field assigned after `.trim()`.
`sanitizeFilter` is absent from Mongoose 5. The `$where` populate bug starts in 6.0.

| CVE | Advisory | Trigger |
| --- | --- | --- |
| CVE-2025-23061 | [GHSA-vg7j-7cwx-8wgw](https://github.com/advisories/GHSA-vg7j-7cwx-8wgw) | Nested `$where` inside `populate({ match })` |
| CVE-2026-42334 | [GHSA-wpg9-53fq-2r8h](https://github.com/advisories/GHSA-wpg9-53fq-2r8h) | `$nor` bypass of `sanitizeFilter` when a raw request body is the query |
| CVE-2026-73562 | [GHSA-664h-wqgq-64gw](https://github.com/advisories/GHSA-664h-wqgq-64gw) | User-controlled update document with a `__proto__` dotted path |

## qs 6.14.3 (Express 4.22.1)

Express parses query strings with `qs.parse` and `{ allowPrototypes: true }` only.
Form bodies use `bodyParser.urlencoded({ extended: false })`, which does not use this copy of `qs`.
`body-parser`'s own `qs` is 6.16.2, outside these ranges.
Nothing stringifies a parsed query with `qs`.

| CVE | Advisory | Trigger |
| --- | --- | --- |
| CVE-2026-8723 | [GHSA-q8mj-m7cp-5q26](https://github.com/advisories/GHSA-q8mj-m7cp-5q26) | `qs.stringify` with `arrayFormat: 'comma'` and `encodeValuesOnly` |
| CVE-2026-82562 | [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx) | `qs.parse` with `comma: true` bypassing `arrayLimit` |
| CVE-2026-82417 | [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) | `parse` then `stringify` round-trip when prototypes are kept |
| CVE-2026-110816 | [GHSA-6pq8-jhm2-2vcw](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw) | `qs.stringify` with `arrayFormat: 'comma'` on a hostile `toString` |

## handlebars 4.5.3 and minimist 0.0.10

`exphbs` compiles the files in `views/`.
The app does not call `Handlebars.compile` on request data, and it does not set `compat: true`.
`minimist` is required only by `node_modules/handlebars/bin/handlebars` (through `optimist`). The server does not run that CLI.

| CVE | Advisory | Trigger |
| --- | --- | --- |
| CVE-2021-23369 | [GHSA-f2jv-r9rf-7988](https://github.com/advisories/GHSA-f2jv-r9rf-7988) | Compiling an untrusted template |
| CVE-2021-23383 | [GHSA-765h-qjxv-5f44](https://github.com/advisories/GHSA-765h-qjxv-5f44) | Compiling an untrusted template |
| CVE-2026-33938 | [GHSA-3mfm-83xf-c92r](https://github.com/advisories/GHSA-3mfm-83xf-c92r) | AST type confusion while compiling a template |
| CVE-2026-33937 | [GHSA-2w6w-674q-4c4q](https://github.com/advisories/GHSA-2w6w-674q-4c4q) | AST type confusion while compiling a template |
| CVE-2026-33916 | [GHSA-2qvq-rjwj-gvw9](https://github.com/advisories/GHSA-2qvq-rjwj-gvw9) | Partial name taken from the template or context |
| — | [GHSA-442j-39wm-28r2](https://github.com/advisories/GHSA-442j-39wm-28r2) | `container.lookup` when compiled with `compat: true` |
| CVE-2026-33940 | [GHSA-xhpv-hc6g-r9c6](https://github.com/advisories/GHSA-xhpv-hc6g-r9c6) | Object passed as a dynamic partial |
| CVE-2026-33939 | [GHSA-9cx6-37pm-9jff](https://github.com/advisories/GHSA-9cx6-37pm-9jff) | Malformed decorator syntax at compile time |
| CVE-2026-33941 | [GHSA-xjpj-3mr7-gcpf](https://github.com/advisories/GHSA-xjpj-3mr7-gcpf) | Handlebars CLI precompiler |
| CVE-2026-106444 | [GHSA-xw65-4hp5-5hc7](https://github.com/advisories/GHSA-xw65-4hp5-5hc7) | Unsafe inline embedding of precompiled templates |
| CVE-2026-106446 | [GHSA-8r5x-fm3f-whwj](https://github.com/advisories/GHSA-8r5x-fm3f-whwj) | AST type confusion in `compile` |
| CVE-2026-106445 | [GHSA-p8wg-vrv2-v86f](https://github.com/advisories/GHSA-p8wg-vrv2-v86f) | Own-property check bypass while compiling |
| CVE-2020-7598 | [GHSA-vh95-rmgr-6w4m](https://github.com/advisories/GHSA-vh95-rmgr-6w4m) | `minimist` parsing attacker-controlled argv |
| CVE-2021-44906 | [GHSA-xvch-5gv4-984h](https://github.com/advisories/GHSA-xvch-5gv4-984h) | `minimist` parsing attacker-controlled argv |

## axios 0.26.1, deepmerge 4.3.1 (`@sendgrid/mail` 7.7.0)

`routes/mystuff.js` sends two messages: password reset and email verification.
Each call is an object literal (`to`, `from`, `subject`, `text`, `html`).
`to` is a trimmed email string.
`deepmerge` runs only when SendGrid is given `dynamicTemplateData`, which these calls omit.
The axios advisories need an attacker-controlled URL, proxy, headers, or config, or an already-polluted `Object.prototype` that axios then reads while building a request.

| CVE | Advisory | Trigger |
| --- | --- | --- |
| CVE-2023-45857 | [GHSA-wf5p-g6vw-rhxx](https://github.com/advisories/GHSA-wf5p-g6vw-rhxx) | Browser CSRF / XSRF handling |
| CVE-2025-27152 | [GHSA-jr5f-v2jv-69x6](https://github.com/advisories/GHSA-jr5f-v2jv-69x6) | Absolute URL in the request path (SSRF) |
| CVE-2025-62718 | [GHSA-3p68-rc4w-qgx5](https://github.com/advisories/GHSA-3p68-rc4w-qgx5) | `NO_PROXY` hostname bypass |
| CVE-2026-42043 | [GHSA-pmwg-cvhr-8vh7](https://github.com/advisories/GHSA-pmwg-cvhr-8vh7) | `NO_PROXY` bypass via 127.0.0.0/8 |
| CVE-2026-44492 | [GHSA-pjwm-pj3p-43mv](https://github.com/advisories/GHSA-pjwm-pj3p-43mv) | `NO_PROXY` bypass via IPv4-mapped IPv6 |
| CVE-2026-42038 | [GHSA-m7pr-hjqh-92cm](https://github.com/advisories/GHSA-m7pr-hjqh-92cm) | `NO_PROXY` bypass via an IP alias |
| CVE-2026-40175 | [GHSA-fvcv-3m26-pcqx](https://github.com/advisories/GHSA-fvcv-3m26-pcqx) | Header injection into a cloud metadata request |
| CVE-2026-44487 | [GHSA-p92q-9vqr-4j8v](https://github.com/advisories/GHSA-p92q-9vqr-4j8v) | `Proxy-Authorization` leaked across redirect |
| CVE-2026-44486 | [GHSA-j5f8-grm9-p9fc](https://github.com/advisories/GHSA-j5f8-grm9-p9fc) | `Proxy-Authorization` leaked when the proxy is dropped |
| CVE-2026-42040 | [GHSA-xhjh-pmcv-23jw](https://github.com/advisories/GHSA-xhjh-pmcv-23jw) | Null byte in `AxiosURLSearchParams` |
| CVE-2026-42034 | [GHSA-5c9x-8gcm-mpgx](https://github.com/advisories/GHSA-5c9x-8gcm-mpgx) | Streamed upload bypassing `maxBodyLength` |
| CVE-2026-42036 | [GHSA-vf2m-468p-8v99](https://github.com/advisories/GHSA-vf2m-468p-8v99) | Streamed response bypassing `maxContentLength` |
| CVE-2026-42039 | [GHSA-62hf-57xw-28j9](https://github.com/advisories/GHSA-62hf-57xw-28j9) | Deeply nested body passed to `toFormData` |
| CVE-2026-44496 | [GHSA-hfxv-24rg-xrqf](https://github.com/advisories/GHSA-hfxv-24rg-xrqf) | Cookie name chosen by the attacker (ReDoS) |
| CVE-2026-25639 | [GHSA-43fc-jf86-j433](https://github.com/advisories/GHSA-43fc-jf86-j433) | `__proto__` key in `mergeConfig` |
| CVE-2026-42041 | [GHSA-w9j2-pvgh-6h63](https://github.com/advisories/GHSA-w9j2-pvgh-6h63) | Prototype pollution gadget in `validateStatus` |
| CVE-2026-42033 | [GHSA-pf86-5x62-jrwf](https://github.com/advisories/GHSA-pf86-5x62-jrwf) | Prototype pollution gadget in response handling |
| CVE-2026-42035 | [GHSA-6chq-wfr3-2hj9](https://github.com/advisories/GHSA-6chq-wfr3-2hj9) | Prototype pollution gadget injecting headers |
| CVE-2026-42042 | [GHSA-xx6v-rp6x-q39c](https://github.com/advisories/GHSA-xx6v-rp6x-q39c) | Prototype pollution gadget leaking the XSRF token |
| CVE-2026-44495 | [GHSA-3g43-6gmg-66jw](https://github.com/advisories/GHSA-3g43-6gmg-66jw) | Prototype pollution gadget in config merge |
| CVE-2026-44490 | [GHSA-898c-q2cr-xwhg](https://github.com/advisories/GHSA-898c-q2cr-xwhg) | Prototype pollution read gadgets in merge |
| CVE-2026-67316 | [GHSA-mmx7-hfxf-jppx](https://github.com/advisories/GHSA-mmx7-hfxf-jppx) | Prototype pollution altering request construction |
| CVE-2026-67319 | [GHSA-7q8q-rj6j-mhjq](https://github.com/advisories/GHSA-7q8q-rj6j-mhjq) | Nested options reading polluted prototype values |
| CVE-2026-93753 | [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | `deepmerge` of an attacker-supplied source object |

## bson 1.0.9 and mongodb 2.2.36 (connect-mongo 1.3.2)

This pair is the session store only.
Mongoose resolves its own `bson` 1.1.6, and the application driver is `mongodb` 6.8 (`bson` 6.8.0).
Session fields are the passport user, a bot flag, and outbox ids.
Collection names are chosen by connect-mongo, not by the request.

| CVE | Advisory | Trigger |
| --- | --- | --- |
| CVE-2019-2391 | [GHSA-4jwp-vfvf-657p](https://github.com/advisories/GHSA-4jwp-vfvf-657p) | Crafted JSON passed through this bson serializer |
| CVE-2020-7610 | [GHSA-v8w9-2789-6hhr](https://github.com/advisories/GHSA-v8w9-2789-6hhr) | Object with a fake `_bsontype` passed to this bson serializer |
| — | [GHSA-mh5c-679w-hh4r](https://github.com/advisories/GHSA-mh5c-679w-hh4r) | Invalid collection name when the database does not exist (driver before 3.1.13) |

## jszip 2.4.0 (xlsx-style 0.8.13)

`render/spreadsheet` calls `xlsx.write` to build a workbook.
Certification uploads are stored as file bytes and are not unzipped.
The outbox builds archives with the direct `jszip` dependency, which is 3.10.1 and outside these ranges.

| CVE | Advisory | Trigger |
| --- | --- | --- |
| CVE-2021-23413 | [GHSA-jg8v-48h5-wgxg](https://github.com/advisories/GHSA-jg8v-48h5-wgxg) | Zip entry named `__proto__` (or another prototype key) |
| CVE-2022-48285 | [GHSA-36fh-84j7-cv5h](https://github.com/advisories/GHSA-36fh-84j7-cv5h) | `loadAsync` of a crafted zip |

## uuid 9.0.1 (mongodb-memory-server, devDependency)

Used to start MongoDB for tests. The production server does not depend on it.
The bug is a missing bounds check when the caller passes a short buffer to `v3`, `v5`, or `v6`.

| CVE | Advisory | Trigger |
| --- | --- | --- |
| CVE-2026-41907 | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | Caller-supplied `buf` and `offset` on uuid v3/v5/v6 |

## Alerts that were only on GitHub

These were open Dependabot alerts and were not in the root `npm audit` report.
They come from the standalone manifests under `database/`, which pin older packages than the site.

### mongoose 4.10.8

`database/schema`, `database/ranking`, `database/migrate`, `database/accesslog`, and `database/util` declare mongoose 4.10.8.
The running site resolves the root mongoose 5.13.23.
None of these tools call `Schema.path` with request data.

| CVE | Advisory | Trigger |
| --- | --- | --- |
| CVE-2022-2564 | [GHSA-f825-f98c-gj3g](https://github.com/advisories/GHSA-f825-f98c-gj3g) | Prototype pollution via `Schema.path` |

### lodash 4.17.20

A transitive dependency of `database/migrate` and `database/accesslog`.
No source file requires lodash or calls `_.template`.

| CVE | Advisory | Trigger |
| --- | --- | --- |
| CVE-2021-23337 | [GHSA-35jh-r3h4-6jhm](https://github.com/advisories/GHSA-35jh-r3h4-6jhm) | Command injection in `_.template` |
