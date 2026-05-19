// GTFS loader for PopularTrains customization.
//
// Downloads NJ Transit's rail GTFS static feed and keeps it in memory so we
// can answer "what stops does train N make on date D" for any train — active
// or not. The rest of the app keeps using the realtime `getTrainStopList`
// endpoint; GTFS is only consulted by PopularTrains.
//
// Refresh model: fetch on startup, then once every 24h via setInterval.
// Conditional GET (If-None-Match / If-Modified-Since) makes the steady-state
// check basically free when NJT hasn't published a new feed.

const axios = require("axios");
const AdmZip = require("adm-zip");
const { parse } = require("csv-parse/sync");

// Prefer IPv4 when resolving — Node 18+ defaults to verbatim order, which
// returns AAAA first on some setups (notably Windows dev boxes). NJT's CDN
// advertises IPv6 addresses that aren't reliably reachable over every
// network, so preferring IPv4 avoids spurious connect timeouts. No-op on
// Linux hosts with working IPv6 like Cloud Run.
require("dns").setDefaultResultOrder("ipv4first");

const GTFS_URL = "https://www.njtransit.com/rail_data.zip";
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

// In-memory store. Swapped atomically on successful refresh so in-flight
// lookups always see a consistent view.
let store = {
  tripsByBlock: new Map(),    // block_id (train number) -> [trip]
  stopTimesByTrip: new Map(), // trip_id -> [stop_time] (sorted by stop_sequence)
  stops: new Map(),           // stop_id -> { name }
  routes: new Map(),          // route_id -> { shortName, longName, color }
  datesByService: new Map(),  // service_id -> Set<YYYYMMDD>
  etag: null,
  lastModified: null,
  loadedAt: null,
};

function parseCsv(buf) {
  return parse(buf.toString("utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function buildStore(zipBuffer) {
  const zip = new AdmZip(zipBuffer);
  const read = (name) => {
    const entry = zip.getEntry(name);
    if (!entry) throw new Error(`Missing ${name} in GTFS zip`);
    return parseCsv(entry.getData());
  };

  const tripsByBlock = new Map();
  for (const row of read("trips.txt")) {
    // block_id is the public-facing train number for NJT rail.
    const block = row.block_id;
    if (!block) continue;
    if (!tripsByBlock.has(block)) tripsByBlock.set(block, []);
    tripsByBlock.get(block).push({
      trip_id: row.trip_id,
      service_id: row.service_id,
      route_id: row.route_id,
      headsign: row.trip_headsign,
      direction_id: row.direction_id,
    });
  }
  // Alias each padded block_id under its leading-zero-stripped form. NJT's
  // GTFS stores short train numbers zero-padded to 4 digits ("0068" for
  // Port Jervis #68, "0204" for some Montclair-Boonton runs), but the
  // realtime API and NJT's own app display them unpadded. Without this,
  // customizing a slot with an inactive PJL train would 404 even though
  // its schedule is right here in the feed. Verified empirically: across
  // all 1434 block_ids no stripped variant collides with an existing key,
  // so this aliasing is safe — but we still skip on collision just in case
  // a future feed introduces one.
  for (const [key, trips] of [...tripsByBlock]) {
    const stripped = key.replace(/^0+/, "") || "0";
    if (stripped !== key && !tripsByBlock.has(stripped)) {
      tripsByBlock.set(stripped, trips);
    }
  }

  const stopTimesByTrip = new Map();
  for (const row of read("stop_times.txt")) {
    const tid = row.trip_id;
    if (!stopTimesByTrip.has(tid)) stopTimesByTrip.set(tid, []);
    stopTimesByTrip.get(tid).push({
      stop_id: row.stop_id,
      stop_sequence: Number(row.stop_sequence),
      arrival: row.arrival_time,
      departure: row.departure_time,
    });
  }
  for (const arr of stopTimesByTrip.values()) {
    arr.sort((a, b) => a.stop_sequence - b.stop_sequence);
  }

  const stops = new Map();
  for (const row of read("stops.txt")) {
    stops.set(row.stop_id, { name: row.stop_name });
  }

  const routes = new Map();
  for (const row of read("routes.txt")) {
    routes.set(row.route_id, {
      shortName: row.route_short_name,
      longName: row.route_long_name,
      color: row.route_color,
    });
  }

  // NJT uses calendar_dates.txt (explicit per-date service) rather than
  // calendar.txt. exception_type=1 means service runs that day; =2 means
  // removed. For NJT's feed, only type-1 rows appear in practice.
  const datesByService = new Map();
  for (const row of read("calendar_dates.txt")) {
    if (row.exception_type !== "1") continue;
    const sid = row.service_id;
    if (!datesByService.has(sid)) datesByService.set(sid, new Set());
    datesByService.get(sid).add(row.date);
  }

  return { tripsByBlock, stopTimesByTrip, stops, routes, datesByService };
}

async function refresh({ force = false } = {}) {
  const headers = {};
  if (!force && store.etag) headers["If-None-Match"] = store.etag;
  if (!force && store.lastModified) headers["If-Modified-Since"] = store.lastModified;

  const res = await axios.get(GTFS_URL, {
    headers,
    responseType: "arraybuffer",
    // Accept 304 as success so axios doesn't throw on "not modified".
    validateStatus: (s) => s === 200 || s === 304,
    timeout: 30000,
    maxRedirects: 5,
  });

  if (res.status === 304) {
    return { changed: false };
  }

  const parsed = buildStore(Buffer.from(res.data));
  store = {
    ...parsed,
    etag: res.headers.etag || null,
    lastModified: res.headers["last-modified"] || null,
    loadedAt: new Date(),
  };
  return { changed: true, size: res.data.byteLength };
}

// Returns { line, lineCode, color, stops: [name] } for the given train number
// on the given date (YYYYMMDD). Returns null if the train isn't scheduled that
// day. If the same block_id has multiple trips active on the same date (very
// rare), we return the first — callers can refine if that becomes a problem.
function getScheduledStops(trainNumber, date) {
  const trips = store.tripsByBlock.get(String(trainNumber));
  if (!trips) return null;
  const trip = trips.find((t) => store.datesByService.get(t.service_id)?.has(date));
  if (!trip) return null;

  const times = store.stopTimesByTrip.get(trip.trip_id) || [];
  const stops = times
    .map((st) => store.stops.get(st.stop_id)?.name)
    .filter(Boolean);

  const route = store.routes.get(trip.route_id) || {};
  return {
    line: route.longName || null,
    lineCode: route.shortName || null,
    color: route.color ? `#${route.color}` : null,
    headsign: trip.headsign,
    stops,
  };
}

function status() {
  return {
    loaded: !!store.loadedAt,
    loadedAt: store.loadedAt,
    lastModified: store.lastModified,
    trips: store.tripsByBlock.size,
    stops: store.stops.size,
  };
}

// Fire-and-forget scheduler. On startup, kick off an initial load; every 24h
// thereafter re-check. Errors are logged loudly so a startup failure is not
// invisible, and the first failure triggers exponential-backoff retries
// (30s → 1m → 5m → 30m, capped) so we don't have to wait a full 24h to
// recover from a transient network hiccup at boot.
const RETRY_BACKOFF_MS = [30_000, 60_000, 5 * 60_000, 30 * 60_000];

function logRefreshError(err) {
  const status = err?.response?.status;
  const statusText = err?.response?.statusText;
  console.error(
    "[gtfs] refresh failed:",
    err?.code || "",
    status ? `HTTP ${status}${statusText ? ` ${statusText}` : ""}` : "",
    err?.message || err,
    err?.cause?.message || ""
  );
}

function startRefreshLoop() {
  let retryIndex = 0;

  const tick = async () => {
    try {
      const { changed } = await refresh();
      console.log(
        changed
          ? `[gtfs] refreshed: ${store.tripsByBlock.size} train numbers, ${store.stops.size} stops`
          : "[gtfs] no change (304)"
      );
      retryIndex = 0; // Success — reset the backoff ladder.
    } catch (err) {
      logRefreshError(err);
      // If we've never successfully loaded GTFS, climb the backoff ladder
      // rather than waiting the full 24h interval for another chance.
      if (!store.loadedAt && retryIndex < RETRY_BACKOFF_MS.length) {
        const delay = RETRY_BACKOFF_MS[retryIndex++];
        console.warn(`[gtfs] retrying in ${Math.round(delay / 1000)}s (no data loaded yet)`);
        setTimeout(tick, delay);
      }
    }
  };
  tick();
  setInterval(tick, REFRESH_INTERVAL_MS);
}

// isReady distinguishes "we haven't loaded GTFS yet" (server should return
// 503) from "this train isn't scheduled today" (404). Lets the frontend
// show a meaningful message instead of blaming the user's input.
function isReady() {
  return !!store.loadedAt;
}

module.exports = { startRefreshLoop, refresh, getScheduledStops, status, isReady };
