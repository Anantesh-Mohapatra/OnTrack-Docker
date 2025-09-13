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

const app = express();
app.use(cors()); // Enable CORS for all routes
// Parse JSON bodies (not strictly needed for our GET endpoint, but safe)
app.use(express.json());

// Simple health endpoint
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

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
});
