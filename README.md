# TriSaarathi - Rural Journeys & Collaborative Travel

## Run locally

**Prerequisites:** Node.js 20.19 or later and a running MongoDB instance (local or Atlas).

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`, set `MONGODB_URI` to your MongoDB connection string, and set `JWT_SECRET` to a unique random value of at least 32 characters. `JWT_EXPIRES_IN` defaults to `8h`. Existing installations can temporarily continue using `SESSION_SECRET`. Keep server credentials private; do not prefix server secrets with `VITE_`.
3. Run `npm run dev` from the project root, or `npm run dev` from `frontend`. Both commands start the backend API and Vite together. The frontend is available at `http://localhost:3000` and the API at `http://localhost:4000`. Stop any already-running frontend-only dev server and restart it after changing these commands so `/api` requests are not sent to a missing backend.

Traveller, Business, and Admin registration, login sessions, and account data are handled by the API and stored in MongoDB with bcrypt-hashed passwords. Login sessions use expiring HS256 JWTs in HttpOnly, SameSite cookies; the server reloads the user's role and account status for protected API requests. New host accounts remain pending until an Admin approves them. Public Admin registration requires a unique Employee ID in the format of two uppercase letters followed by four digits (for example, `AB1234`) and activates the account immediately. On startup, the backend also activates older Admin registrations that were awaiting the removed verification step.

To create the first active administrator, configure both `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` (at least 12 characters) before the backend connects to MongoDB. The account is created only when no active Admin account exists. Remove both bootstrap variables after creation. Existing administrators can create additional Admin accounts from the dashboard; share the initial password securely.

The Traveller dashboard uses persisted account/profile data and clearly identifies trip sections that do not yet have backing data services. The Business portal uses the existing profile, application, community, review, inquiry, and notification APIs. Business gallery uploads and community post photos/videos use backend-signed Cloudinary uploads; Cloudinary is optional and its free plan can be used without a paid API subscription. Traveller review and inquiry submission APIs exist, but a traveller-facing submission form is not yet connected. Contact form submissions are stored in the `contactmessages` collection. The Vite development server forwards `/api` requests to the backend.

## Rural discovery integrations

- `GET /api/discovery/destinations` first queries OpenStreetMap Overpass and falls back to OpenStreetMap Nominatim when Overpass is unavailable or returns no matches. Results remain external discovery records; they are not written to MongoDB. The service caches results in memory for 15 minutes and spaces Nominatim requests at least 1.1 seconds apart. Place cards identify their source and link to OpenStreetMap.
- The Leaflet map uses `https://tile.openstreetmap.org/{z}/{x}/{y}.png` and displays OpenStreetMap attribution. Follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and use a suitable tile provider for production/high traffic.
- Commons photos are only shown when the file title matches the destination name. Cards link to the original file page and show the creator and licence when available; no matching photo is shown as a no-photo state.
- Wikidata details are looked up only for exact Wikidata identifiers provided by OpenStreetMap records. Missing details are not inferred.
- `GET /api/discovery/route` uses the public OSRM demonstration routing server. Treat it as a development integration and configure an appropriate hosted/self-managed OSRM service before production traffic.

For business gallery and post media uploads, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the backend environment. The upload-signing endpoint returns `503` until all credentials are configured. Post upload defaults allow five JPG/JPEG, PNG, or WEBP photos up to 10 MB each and two MP4, WEBM, or MOV videos up to 50 MB each and 120 seconds. Configure limits with `BUSINESS_POST_PHOTO_MAX_BYTES`, `BUSINESS_POST_VIDEO_MAX_BYTES`, `BUSINESS_POST_PHOTO_MAX_COUNT`, `BUSINESS_POST_VIDEO_MAX_COUNT`, and `BUSINESS_POST_VIDEO_MAX_DURATION_SECONDS`. The server verifies uploaded Cloudinary resource type, format, size, duration, and business ownership before saving media metadata with a post; media files are not stored in MongoDB. Never set Cloudinary credentials as `VITE_` variables. `OVERPASS_URL` is optional and can point to an Overpass-compatible interpreter.

Approved Business owners can publish text posts with optional photo/video attachments from the dashboard. Uploads show local previews and progress; media is removed from Cloudinary if publishing fails. Existing text-only posts and legacy gallery-image posts remain supported.

If MongoDB is unavailable, both servers still start, `/api/health` reports `503`, and database-backed requests return `503` until the connection is restored. For MongoDB Atlas, add your current IP address to the cluster's Network Access allowlist and verify the database user's credentials.

For production, set `MONGODB_URI` in the backend environment and route `/api` requests to the backend server.
# Business data and verification APIs

Business owners can use the five-step portal flow to save an application, upload private evidence and photos, and submit it for administrator review. Registration details and review status remain stored in MongoDB. Evidence files are served only to the application owner or an authenticated administrator. Approved business photos are exposed through a separate endpoint that checks the server-side approval state.

An owner may edit a `draft`, `changes_requested`, or `rejected` application and resubmit it. Applications in `pending_review` or `approved` status are locked to the owner. Only administrators can approve, request changes, or reject a submitted application.

Configure `PRIVATE_UPLOAD_DIR` to a persistent, access-controlled volume in production. The default is `backend/private_uploads`; the directory is not served as static content. `BUSINESS_DOCUMENT_MAX_BYTES`, `BUSINESS_PHOTO_MAX_BYTES`, `BUSINESS_PHOTO_MIN_COUNT`, and `BUSINESS_PHOTO_MAX_COUNT` configure upload limits. Defaults allow PDF/JPEG/PNG evidence up to 10 MB and 2–5 JPEG/PNG/WebP photos up to 5 MB each. Back up the private upload volume along with MongoDB. No map API key is required; location search uses the existing authenticated OpenStreetMap/Nominatim service, and map coordinates remain optional.

Use the existing commands:

```sh
npm install
npm run dev
npm run build
npm test
```

Set `MONGODB_URI` and a random `JWT_SECRET` in `.env` as described in `.env.example`. Administrator review is available in the existing Admin Portal under **Business Applications**. Approval, change requests, and rejection are recorded in the application audit history and sent through the existing notification collection.
