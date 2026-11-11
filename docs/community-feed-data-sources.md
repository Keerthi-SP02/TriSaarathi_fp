# Community feed data sources

Core place discovery works without paid services or API keys.

| Data | Provider | Key required | Notes |
| --- | --- | --- | --- |
| Places and map data | OpenStreetMap through Overpass API | No | Uses the FOSSGIS endpoint, then the Private.coffee community endpoint if the first fails. Results are cached and attributed to OpenStreetMap. |
| User-requested nearby search | OpenStreetMap Nominatim | No | Called only after the user chooses nearby search or enters a village, town, or district. It geocodes that single area, then searches a bounded radius. Requests are serialized and rate limited. |
| Place photographs | Wikimedia Commons API | No | A photo is shown only when the file title matches the place name and the API provides a license. Creator, license, and source page are shown with it. A neutral placeholder is used otherwise. |
| Place descriptions | Wikidata Query Service | No | Optional facts for OSM records linked by Wikidata ID. |
| Road routes | OSRM demo router | No | Public demo service; availability and capacity are not guaranteed. |

Do not use public Nominatim for autocomplete, periodic background lookups, or bulk place harvesting. Its public service has a strict usage policy. For larger deployments, use a hosted provider with an appropriate plan or operate your own OSM infrastructure. Public Overpass instances can also be busy and provide no uptime guarantee; endpoint overrides are available through `OVERPASS_URL` and `OVERPASS_FALLBACK_URL`.

Required backend configuration is documented in `.env.example`. Place discovery uses free, keyless OpenStreetMap, Wikimedia Commons, and Wikidata services. Community posts and business records always come from TriSaarathi's database; imported place records remain clearly labeled discoveries and are never converted into business-authored posts.
