<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# TriSaarathi - Rural Journeys & Collaborative Travel

## Run locally

**Prerequisites:** Node.js 20.19 or later and a running MongoDB instance (local or Atlas).

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`, set `MONGODB_URI` to your MongoDB connection string, and set `JWT_SECRET` to a unique random value of at least 32 characters. `JWT_EXPIRES_IN` defaults to `8h`. Existing installations can temporarily continue using `SESSION_SECRET`. Add `GEMINI_API_KEY` if you use Gemini API calls. Keep server credentials private; do not prefix server secrets with `VITE_`.
3. Run `npm run dev` from the project root, or `npm run dev` from `frontend`. Both commands start the backend API and Vite together. The frontend is available at `http://localhost:3000` and the API at `http://localhost:4000`. Stop any already-running frontend-only dev server and restart it after changing these commands so `/api` requests are not sent to a missing backend.

Traveller, Business, and Admin registration, login sessions, and account data are handled by the API and stored in MongoDB with bcrypt-hashed passwords. Login sessions use expiring HS256 JWTs in HttpOnly, SameSite cookies; the server reloads the user's role and account status for protected API requests. New host accounts remain pending until an Admin approves them. Public Admin registration requires a unique Employee ID in the format of two uppercase letters followed by four digits (for example, `AB1234`) and activates the account immediately. On startup, the backend also activates older Admin registrations that were awaiting the removed verification step.

To create the first active administrator, configure both `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` (at least 12 characters) before the backend connects to MongoDB. The account is created only when no active Admin account exists. Remove both bootstrap variables after creation. Existing administrators can create additional Admin accounts from the dashboard; share the initial password securely.

The Traveller dashboard uses persisted account/profile data and clearly identifies trip sections that do not yet have backing data services. The Business dashboard uses MongoDB for posts, profiles, experiences, gallery records, reviews, inquiries, and notifications; business owners can only manage their own records, and publishing/upload operations require approval. Admin-only endpoints approve or reject business registrations. Business image uploads require the backend-only Cloudinary settings below. Traveller review and inquiry submission APIs exist, but a traveller-facing submission form is not yet connected. Contact form submissions are stored in the `contactmessages` collection. The Vite development server forwards `/api` requests to the backend.

## Rural discovery integrations

- `GET /api/discovery/destinations` first queries OpenStreetMap Overpass and falls back to OpenStreetMap Nominatim when Overpass is unavailable or returns no matches. Results remain external discovery records; they are not written to MongoDB. The service caches results in memory for 15 minutes and spaces Nominatim requests at least 1.1 seconds apart. Place cards identify their source and link to OpenStreetMap.
- The Leaflet map uses `https://tile.openstreetmap.org/{z}/{x}/{y}.png` and displays OpenStreetMap attribution. Follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and use a suitable tile provider for production/high traffic.
- Commons photos are only shown when the file title matches the destination name. Cards link to the original file page and show the creator and licence when available; no matching photo is shown as a no-photo state.
- Wikidata details are looked up only for exact Wikidata identifiers provided by OpenStreetMap records. Missing details are not inferred.
- `GET /api/discovery/route` uses the public OSRM demonstration routing server. Treat it as a development integration and configure an appropriate hosted/self-managed OSRM service before production traffic.

For business gallery uploads, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the backend environment. The upload-signing endpoint returns `503` until all credentials are configured. Never set these as `VITE_` variables. `OVERPASS_URL` is optional and can point to an Overpass-compatible interpreter.

If MongoDB is unavailable, both servers still start, `/api/health` reports `503`, and database-backed requests return `503` until the connection is restored. For MongoDB Atlas, add your current IP address to the cluster's Network Access allowlist and verify the database user's credentials.

For production, set `MONGODB_URI` in the backend environment and route `/api` requests to the backend server.
