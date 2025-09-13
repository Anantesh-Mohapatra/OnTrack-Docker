// Cloud Run Integration
// - Local Preference: Frontend pings `http://localhost:5000/api/health`. If reachable,
//   it uses the local backend and logs “Using local backend at http://localhost:5000”.
// - Cloud Fallback: If localhost isn’t reachable within ~700ms, it uses
//   `https://ontrack-docker-551821400291.us-central1.run.app` and logs a clear message.
// - No Frontend Env: The frontend does not need a backend URL env var; detection is automatic.
// - Backend Env: Set `REACT_APP_NJTRANSIT_API_KEY` on the backend (locally via `.env`, in
//   Cloud Run as an environment variable).
// - Health Check: Backend exposes `GET /api/health` for detection.
// - Custom URL: If your Cloud Run URL changes, update the `CLOUD_RUN_URL` constant below.
//
// Lightweight runtime selection of backend base URL for browser builds.
// - Prefers local dev server at http://localhost:5000 when available
// - Falls back to the deployed Cloud Run URL when local is unreachable

const CLOUD_RUN_URL = "https://ontrack-docker-551821400291.us-central1.run.app";
let cachedBase = null;

async function ping(url, timeoutMs = 700) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok;
  } catch (_err) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function getBackendBase() {
  if (cachedBase) return cachedBase;
  const local = "http://localhost:5000";
  const healthy = await ping(`${local}/api/health`);
  cachedBase = healthy ? local : CLOUD_RUN_URL;
  if (healthy) {
    console.log(`Using local backend at ${local}`);
  } else {
    console.log(`Local backend not found; using Cloud Run backend at ${CLOUD_RUN_URL}`);
  }
  return cachedBase;
}
