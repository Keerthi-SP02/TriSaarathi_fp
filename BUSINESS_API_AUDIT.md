# Rural Business Portal API Audit

## Scope and verification

This audit covers the Express API in `backend/server.js`, authentication/authorization middleware, Mongoose models in `backend/models/`, `frontend/src/lib/api.js`, and the Rural Business Portal in `frontend/src/pages/BusinessDashboard.js`.

The initial audit confirmed that the local API and Vite-proxied health endpoints returned `200` with MongoDB connected. Protected routes were also smoke-checked without a session and returned `401`. Authenticated CRUD flows and the rendered portal have not been exercised with a logged-in test account, so source presence and direct provider tests are distinguished from end-to-end verification below.

## 1. Existing API surface

| Capability | Endpoint(s) | Persistence / authorization | Status |
|---|---|---|---|
| Registration and login | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` | `User`; HttpOnly JWT session cookie; active role reloaded for requests | Existing. New Business accounts remain pending until an Admin approves them. |
| Account profile | `PUT /api/account/profile` | Authenticated account updates its own basic profile | Existing and owner-scoped. |
| Business posts | `GET/POST /api/business/posts`, `PATCH/DELETE /api/business/posts/:id`, `POST /api/business/posts/:id/like`, `POST /api/business/posts/:id/comments` | `BusinessPost`; publishing requires approval; mutations are scoped to owner | Existing MongoDB-backed posts and engagement; used by the community feed. |
| Community feed | `GET/POST /api/community/posts`, `PATCH/DELETE /api/community/posts/:id`, `POST /api/community/posts/:source/:id/:action` | `CommunityPost` and `BusinessPost`; authenticated and visibility-filtered | Existing and connected to the Business community feed. |
| Admin dashboard and accounts | `GET /api/admin/dashboard`, `/api/admin/overview`, `/api/admin/users`, `PATCH /api/admin/users/:id/status`, `POST /api/admin/admins` | MongoDB; Admin-only where appropriate | Existing. |
| Business verification | `GET /api/admin/businesses/pending`, `PATCH /api/admin/businesses/:id/approval` | `User`; authenticated Admin required | Existing; approval/rejection remains backend-authorized. |
| Contact form | `POST /api/contact` | `ContactMessage` | Existing; separate from business inquiries. |
| Health | `GET /api/health` | Reports Mongoose connection state | Verified locally during the initial audit. |

## 2. Previously incomplete or disconnected surfaces

- Business profile reads now work for pending/rejected businesses so they can see their verification status; profile updates persist the extended business contact/location fields.
- The Business portal now calls the persisted experience, photo gallery, review inbox, inquiry inbox, and notification APIs. Discover Destinations combines those approved, first-party experience listings with distinct external OSM records.
- Traveller review and inquiry submission endpoints exist, but a traveller-facing submission form is not yet connected. External OSM places are not treated as businesses and cannot receive business reviews or inquiries.
- Business `Bookings`, `Analytics`, and `Events` do not have their own backing services; no sample data is returned for them.
- Cloudinary credentials are optional and were not verified/configured in this task. Upload signing explicitly returns `503` until the backend credentials are present.

## 3. Added Rural Business APIs

New experience, photo, review, inquiry, and notification records use dedicated MongoDB models; existing `User` and `BusinessPost` models are reused.

| Capability | Endpoint(s) | Authorization / ownership |
|---|---|---|
| Business profile | `GET/PUT /api/business/profile` | Authenticated Business account; the account can read its own pending/rejected status and update only its profile. |
| Rural experiences / first-party destinations | `GET/POST /api/business/experiences`, `PATCH/DELETE /api/business/experiences/:id`, `GET /api/destinations` | Owner-scoped mutations; publishing is approval-gated. Public destination results include only published experiences from active, approved businesses. |
| Signed uploads / gallery | `POST /api/business/uploads/sign`, `GET/POST /api/business/photos`, `DELETE /api/business/photos/:id` | Approved business required for upload changes; signed paths are scoped to the authenticated business. Cloudinary credentials remain server-only. |
| Reviews | `GET /api/business/reviews`, `GET/POST /api/business/:businessId/reviews`, `PATCH /api/business/reviews/:id/reply` | Traveller identity is taken from the session; business replies and inbox queries are scoped to the business owner. |
| Inquiries | `POST /api/business/:businessId/inquiries`, `GET /api/business/inquiries`, `GET /api/inquiries`, `PATCH /api/business/inquiries/:id` | Traveller submissions use the session identity; business reads/updates are scoped to the recipient business. |
| Notifications | `GET /api/notifications`, `PATCH /api/notifications/read-all`, `PATCH /api/notifications/:id/read` | Reads and updates are scoped to the authenticated recipient. |
| External destinations and routing | `GET /api/discovery/destinations`, `GET /api/discovery/route` | Authenticated, rate-limited provider calls; external place data is not persisted to MongoDB. |

## 4. External integrations and current limitations

- **OpenStreetMap / Overpass:** destination discovery defaults to 15 records and caps results at 20, with at most 20 Nominatim results read per query and Commons images looked up for no more than four places per response. It first queries the configured Overpass interpreter (`OVERPASS_URL`, defaulting to `https://overpass-api.de/api/interpreter`). In live checks, the primary service returned `504`/timed out. The service falls back to bounded, country-filtered OpenStreetMap Nominatim searches; returned records retain OSM IDs, coordinates, categories, and rural location details. Nominatim requests are serialized at least 1.1 seconds apart and the combined response is cached in memory for 15 minutes. OSM attribution links appear on cards and the map.
- **Leaflet / OSM tiles:** the map uses the exact `https://tile.openstreetmap.org/{z}/{x}/{y}.png` URL and includes required attribution. Follow the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/); choose an appropriate provider for production/high-volume use.
- **OSRM:** road routes use the public OSRM demo endpoint and return its GeoJSON geometry, distance, and duration. A live route smoke test returned an 8,179 m route estimated at about 609 seconds. Replace the public demo service for production traffic.
- **Wikimedia Commons:** the backend requests image URLs and metadata including creator and licence; cards link to the original file page. Image selection now requires every distinctive place-name token to match and skips generic labels, so unrelated images are omitted. Commons returned real CC-licensed metadata during smoke checks; later requests also encountered HTTP `429`, which is surfaced as an optional-service warning and leaves a no-photo state.
- **Wikidata Query Service:** only exact `wikidata` IDs from OSM records are queried; details are not inferred. A live query encountered HTTP `429`, so Wikidata enrichment is optional and may be absent.
- **Cloudinary:** configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the backend environment to enable signed uploads. Do not expose these as `VITE_` variables. Without all three, upload signing returns `503`.

## 5. Validation performed

- `node --check` passed for `backend/server.js` and `backend/services/ruralDiscovery.js`.
- `npm run build` passed after the feed and map changes.
- Live provider smoke tests returned real Nominatim records with coordinates, Commons file metadata/licences, and the OSRM route noted above. Overpass and Wikidata/Commons rate-limit failures are reported rather than replaced with fabricated records.
- Focused automated tests cover destination-to-image matching so generic names cannot select unrelated photos; run them with `npm test`.
- Authenticated MongoDB CRUD and a logged-in browser walkthrough remain unverified because no test account was used.
