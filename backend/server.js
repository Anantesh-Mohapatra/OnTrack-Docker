// Load environment variables from .env file
// Prefer default CWD .env; if missing, also try project root one level up.
const path = require("path");
require("dotenv").config();
if (!process.env.REACT_APP_NJTRANSIT_API_KEY) {
  const rootEnv = path.resolve(__dirname, "..", ".env");
  require("dotenv").config({ path: rootEnv });
}

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const gtfs = require("./gtfs");

const app = express();
app.use(cors()); // Enable CORS for all routes
// Parse JSON bodies (not strictly needed for our GET endpoint, but safe)
app.use(express.json());

// Simple health endpoint
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, gtfs: gtfs.status() });
});

// Per-caller freshness cache for getVehicleData. The cache stores when the
// data was fetched; each caller declares its staleness tolerance via
// ?maxAge=<seconds>. TrainStatus needs ~30s for an accurate map marker;
// PopularTrains is happy with the 5-minute default since it only reads
// TRAIN_LINE / ID, not GPS. Pattern mirrors HTTP Cache-Control: max-age.
const vehicleCache = { data: null, fetchedAt: 0 };
const VEHICLE_DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

app.get("/api/vehicle-data", async (req, res) => {
  const now = Date.now();
  const requested = parseInt(req.query.maxAge, 10);
  const maxAgeMs = Number.isFinite(requested) && requested > 0
    ? requested * 1000
    : VEHICLE_DEFAULT_MAX_AGE_MS;
  if (vehicleCache.data && now - vehicleCache.fetchedAt < maxAgeMs) {
    return res.json(vehicleCache.data);
  }
  const token = process.env.REACT_APP_NJTRANSIT_API_KEY;
  if (!token) return res.status(500).json({ error: "Server is missing NJ Transit API key" });
  try {
    const upstream = await axios.post(
      "https://raildata.njtransit.com/api/TrainData/getVehicleData",
      new URLSearchParams({ token }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 }
    );
    let payload = upstream.data;
    if (typeof payload === "string") {
      try { payload = JSON.parse(payload); } catch (_) {}
    }
    vehicleCache.data = payload;
    vehicleCache.fetchedAt = now;
    return res.json(payload);
  } catch (err) {
    console.error("/api/vehicle-data error:", err?.message || err);
    return res.status(502).json({ error: "Failed to fetch vehicle data" });
  }
});

// GTFS-backed scheduled stops for one train on a given date. Used only by
// PopularTrains to populate the customization dropdown — especially for
// inactive trains where the realtime getTrainStopList returns nothing.
// Query: ?train=3725&date=20260422  (date defaults to today, America/New_York)
app.get("/api/scheduled-stops", (req, res) => {
  const train = (req.query.train || "").toString().trim();
  if (!train) return res.status(400).json({ error: "Missing required query param: train" });
  // Distinguish "GTFS hasn't loaded yet" (transient server problem → 503)
  // from "train is genuinely not in today's schedule" (404). Frontend uses
  // the status code to pick an appropriate message.
  if (!gtfs.isReady()) {
    return res.status(503).json({ error: "Schedule data is not yet loaded" });
  }
  const date = (req.query.date || "").toString().trim() || todayYYYYMMDD();
  const result = gtfs.getScheduledStops(train, date);
  if (!result) return res.status(404).json({ error: "Train not scheduled on that date" });
  return res.json(result);
});

function todayYYYYMMDD() {
  // Use America/New_York so the date matches NJT's service calendar even if
  // the backend runs in a different timezone.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  return fmt.format(new Date()).replace(/-/g, "");
}

// Server-side proxy for NJ Transit Train Stop List
// Hides the API key from the frontend and prevents direct browser calls.
// Usage (frontend): GET /api/train-data?train=1234
app.get("/api/train-data", async (req, res) => {
  try {
    const train = (req.query.train || "").toString().trim();
    if (!train) {
      return res.status(400).json({ error: "Missing required query param: train" });
    }

    // Read API key from env. We intentionally use the existing name
    // to avoid changing your .env setup.
    const token = process.env.REACT_APP_NJTRANSIT_API_KEY;
    if (!token) {
      return res.status(500).json({ error: "Server is missing NJ Transit API key" });
    }

    // Prepare URL-encoded body. Using URLSearchParams keeps things simple and
    // lets axios set a correct content-length automatically (avoids undici mismatch errors).
    const params = new URLSearchParams({ token, train });

    const upstream = await axios.post(
      "https://raildata.njtransit.com/api/TrainData/getTrainStopList",
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        // Tight timeout so backend doesn't hang if upstream is slow
        timeout: 10000,
      }
    );

    // Pass through the upstream JSON as-is (handle text bodies that contain JSON)
    let payload = upstream.data;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (_) {
        // leave as string if not valid JSON
      }
    }
    return res.json(payload);
  } catch (err) {
    // Log minimal info and return a clean error to the client
    console.error("/api/train-data error:", err?.message || err);
    return res.status(502).json({ error: "Failed to fetch train data" });
  }
});

// Start the server
const PORT = process.env.PORT || 5000; // Default to 5000 if PORT is not set
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
  gtfs.startRefreshLoop();
});
