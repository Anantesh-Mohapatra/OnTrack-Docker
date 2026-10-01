// GTFS-RT vehicle positions — NJT's only feed with real train GPS.
//
// getVehicleData's LATITUDE/LONGITUDE is just the coordinates of NEXT_STOP
// (verified: 23 of 25 trains sat exactly 0m from their next station), so the
// map used to snap to the upcoming station. getVehiclePositions returns an
// actual fix per train, one call for the whole fleet, with no daily limit.
//
// Feed quirks (verified 2026-09-30):
//   - vehicle.id is the train number, zero-padded ("0068" = train 68).
//   - trip.trip_id does NOT join to the public rail_data.zip — don't use it.
//   - A train that hasn't started still carries the last fix from its
//     previous run (e.g. a 22h-old position at the old terminal). Callers
//     must gate on fix age; we pass the timestamp through untouched.
//   - Errors come back as JSON ({"errorMessage":"Invalid token."}) with
//     HTTP 500, not as protobuf.
//
// Auth: GTFS-RT has its own token, separate from the TrainData key. We use
// NJT_GTFSRT_TOKEN if set; otherwise (or once it's rejected) we log in with
// NJT_GTFSRT_USERNAME / NJT_GTFSRT_PASSWORD. getToken is capped at 10 calls
// per day, so logins are lazy and rate-limited.

const axios = require("axios");
const GtfsRealtimeBindings = require("gtfs-realtime-bindings");

// Override only for local testing against testraildata.njtransit.com.
const BASE_URL = process.env.NJT_GTFSRT_BASE_URL || "https://raildata.njtransit.com/api/GTFSRT";
const FEED_MAX_AGE_MS = 30 * 1000;
const LOGIN_COOLDOWN_MS = 10 * 60 * 1000;
const FORM_HEADERS = { "Content-Type": "application/x-www-form-urlencoded" };

let token = process.env.NJT_GTFSRT_TOKEN || null;
let lastLoginAt = 0;
// train number (unpadded) -> { lat, lon, timestamp (ms), startDate (YYYYMMDD) }
let cache = { byTrain: new Map(), fetchedAt: 0 };
let inflight = null;

function parseJson(body) {
  try {
    return JSON.parse(Buffer.isBuffer(body) ? body.toString("utf8") : body);
  } catch (_) {
    return null;
  }
}

async function login() {
  const username = process.env.NJT_GTFSRT_USERNAME;
  const password = process.env.NJT_GTFSRT_PASSWORD;
  if (!username || !password) {
    throw new Error("missing NJT_GTFSRT_USERNAME / NJT_GTFSRT_PASSWORD");
  }
  if (Date.now() - lastLoginAt < LOGIN_COOLDOWN_MS) {
    throw new Error("getToken skipped (cooldown protects the 10/day limit)");
  }
  lastLoginAt = Date.now();
  const res = await axios.post(
    `${BASE_URL}/getToken`,
    new URLSearchParams({ username, password }).toString(),
    { headers: FORM_HEADERS, timeout: 10000, validateStatus: () => true }
  );
  const data = typeof res.data === "string" ? parseJson(res.data) : res.data;
  if (data?.Authenticated !== "True" || !data.UserToken) {
    throw new Error(`getToken failed: HTTP ${res.status} ${data?.errorMessage || ""}`.trim());
  }
  console.log("[gtfsrt] obtained new token");
  token = data.UserToken;
}

async function fetchFeed() {
  const res = await axios.post(
    `${BASE_URL}/getVehiclePositions`,
    new URLSearchParams({ token }).toString(),
    { headers: FORM_HEADERS, responseType: "arraybuffer", timeout: 10000, validateStatus: () => true }
  );
  const buf = Buffer.from(res.data);
  // A protobuf FeedMessage starts with 0x0a (field 1, the header); NJT's
  // errors are JSON, so a leading "{" means an error even on HTTP 500.
  if (buf[0] === 0x7b) {
    const message = parseJson(buf)?.errorMessage || "unknown error";
    const err = new Error(`getVehiclePositions: ${message}`);
    err.invalidToken = /invalid token/i.test(message);
    throw err;
  }
  if (res.status !== 200 || !buf.length) {
    throw new Error(`getVehiclePositions: HTTP ${res.status}, ${buf.length} bytes`);
  }
  return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buf);
}

function toNumber(value) {
  return value && typeof value === "object" ? value.toNumber() : Number(value);
}

function indexByTrain(feed) {
  const byTrain = new Map();
  for (const entity of feed.entity) {
    const v = entity.vehicle;
    const id = v?.vehicle?.id;
    if (!id || !v.position) continue;
    const train = id.replace(/^0+/, "") || "0";
    const fix = {
      lat: v.position.latitude,
      lon: v.position.longitude,
      timestamp: toNumber(v.timestamp) * 1000,
      startDate: v.trip?.startDate || null,
    };
    const prev = byTrain.get(train);
    if (!prev || fix.timestamp > prev.timestamp) byTrain.set(train, fix);
  }
  return byTrain;
}

async function refresh() {
  try {
    if (!token) await login();
    let feed;
    try {
      feed = await fetchFeed();
    } catch (err) {
      if (!err.invalidToken) throw err;
      await login();
      feed = await fetchFeed();
    }
    cache = { byTrain: indexByTrain(feed), fetchedAt: Date.now() };
  } catch (err) {
    // Keep serving the last good snapshot (callers gate on each fix's age)
    // and wait a full cache period before trying again.
    console.error("[gtfsrt] refresh failed:", err?.message || err);
    cache = { ...cache, fetchedAt: Date.now() };
  }
}

// Latest fix for a train number, or null. Shared 30s cache across callers.
async function getPosition(trainNumber) {
  if (Date.now() - cache.fetchedAt >= FEED_MAX_AGE_MS) {
    if (!inflight) inflight = refresh().finally(() => { inflight = null; });
    await inflight;
  }
  const train = String(trainNumber).replace(/^0+/, "") || "0";
  return cache.byTrain.get(train) || null;
}

module.exports = { getPosition };
