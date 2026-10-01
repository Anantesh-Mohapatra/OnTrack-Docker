# Welcome to OnTrack!

## Project Description

OnTrack makes it easier to find information about a train by its train number. Since NJ Transit’s app can be slow or confusing, OnTrack’s simple interface makes it easy to see where a train is, how delayed it is, and more.

OnTrack also shows a customizable list of active trains at the top of the site.

## Instructions

Prerequisites
- Node.js
- npm

Steps
1. Clone the repository: `git clone https://github.com/Anantesh-Mohapatra/OnTrack-Docker.git`
2. Install frontend dependencies (project root): `npm install`
3. Install backend dependencies:
   - `cd backend`
   - `npm install`
   - `cd ..`
4. Create a `.env` file (in the project root or in `backend/`) with your NJ Transit credentials:
   - `REACT_APP_NJTRANSIT_API_KEY=your_api_key_here` (RailData token, used for train/stop data)
   - `NJT_GTFSRT_USERNAME=your_username` and `NJT_GTFSRT_PASSWORD=your_password` (used for live train GPS; see [Train location](#train-location))
   - Optional: `NJT_GTFSRT_TOKEN=your_gtfsrt_token` to skip the login entirely
   - The backend proxies NJ Transit calls so none of these reach the browser.
5. Start the backend in one terminal: `node backend/server.js` (http://localhost:5000)
6. Start the frontend in another terminal: `npm start` (http://localhost:3000)
   - The frontend automatically uses the local backend if available.

### Docker (optional)

You can run both the backend and the static frontend with Docker. Ensure you have a `.env` file with the variables from step 4 available.

- Build and run the backend (maps to host port 5000):
  - `docker build -t ontrack-backend ./backend`
  - `docker run -d --name ontrack-backend --env-file ./.env -p 5000:5000 ontrack-backend`

- Build and run the frontend:
  - `docker build -t ontrack-frontend .`
  - `docker run -d --name ontrack-frontend -e PORT=8080 -p 8080:8080 ontrack-frontend`

Open http://localhost:8080 in your browser. The browser will call the backend at http://localhost:5000 automatically (the app prefers that URL if it’s reachable).

## API Information

This project uses NJ Transit's free RailData and GTFS/GTFS-RT APIs. The backend calls NJ Transit with your credentials so they never reach the frontend. It exposes:

- `/api/train-data?train=<number>` — the train's stop list (RailData `getTrainStopList`)
- `/api/vehicle-data` — fleet snapshot (RailData `getVehicleData`), used for each train's next stop
- `/api/station-list` — station name/code crosswalk (RailData `getStationList`)
- `/api/train-position?train=<number>` — latest GPS fix (GTFS-RT `getVehiclePositions`) and scheduled origin station
- `/api/scheduled-stops?train=<number>` — scheduled stops from the static GTFS feed

RailData and GTFS-RT use separate tokens. Tokens can be generated up to 10 times a day per API, and RailData tokens can be used up to 40,000 times a day; GTFS-RT data calls are unlimited.
Register and read the docs: https://developer.njtransit.com/registration/docs

For one-off experiments, use NJ Transit's test host (`testraildata.njtransit.com`) with your test token. Test and production tokens are not interchangeable. For GTFS-RT, set `NJT_GTFSRT_BASE_URL=https://testraildata.njtransit.com/api/GTFSRT` to point the backend at it.

### Train location

The map uses GTFS-RT GPS, not `getVehicleData`: that endpoint's latitude/longitude is just the coordinates of the train's next station. One rule decides what the map shows:

1. Fully cancelled train → no map.
2. Hasn't left its first stop → pinned at its scheduled origin station.
3. GPS fix no more than 5 minutes old → pinned at the fix, with "updated N min ago".
4. Otherwise → no map.

Terminated trains fall under rule 3: the map shows them at the terminal until the fix ages out. The age limit also filters out the stale fix GTFS-RT keeps from a train's previous run.

The backend logs in to GTFS-RT only when a train is looked up, and at most once every 10 minutes per server instance, to conserve the 10-per-day `getToken` limit. Every fresh instance still needs one login, so on hosts that cold-start often (e.g. Cloud Run scaled to zero) set `NJT_GTFSRT_TOKEN` to skip logins; the backend falls back to the username/password only if that token is rejected.

Attributions: [Leaflet](https://leafletjs.com), [React‑Leaflet](https://react-leaflet.js.org), map tiles & data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [Font Awesome](https://fontawesome.com).
