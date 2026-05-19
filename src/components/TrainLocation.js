import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'leaflet/dist/leaflet.css';
import '../styles/TrainLocation.css';

// Recenter the map when coords change (train picks a new position).
const RecenterOnPosition = ({ lat, lon }) => {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      map.setView([lat, lon]);
    }
  }, [lat, lon, map]);
  return null;
};

// Carto Positron — minimalist light-gray base, faint dashed rail
// tracks, small POI labels. OpenRailwayMap layered on top brings back
// station names; we render at zoom 13 (ORM uses smaller label glyphs
// at this zoom — at 14+ it goes "you're standing here" bold) and at
// reduced opacity so labels feel like annotations, not UI chrome.
// Per the OSM wiki, ORM tiles are served from tiles.openrailwaymap.org
// with NO `{s}` subdomain; tile size 512, max zoom 19.
const BASE_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const RAILWAY_TILE_URL = 'https://tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png';

const TrainLocation = ({ lat, lon, trainName = 'Train', backColor, foreColor, trainNumber }) => {
  const trainIcon = useMemo(() => {
    const pin = backColor || 'var(--njt-orange)';
    const fore = foreColor || '#fff';
    return L.divIcon({
      className: 'njtTrainIcon',
      html: `<div class="njt-train-circle" style="background:${pin};color:${fore}"><i class="fa-solid fa-train"></i></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });
  }, [backColor, foreColor]);

  const latitude = typeof lat === 'string' ? parseFloat(lat) : lat;
  const longitude = typeof lon === 'string' ? parseFloat(lon) : lon;
  const isValid = Number.isFinite(latitude) && Number.isFinite(longitude);
  if (!isValid) return null;

  const center = [latitude, longitude];
  const coordLabel = `${latitude.toFixed(3)}° N · ${Math.abs(longitude).toFixed(3)}° W`;

  return (
    <section className="locationCard TrainLocation">
      <header className="locationHead">
        <span className="locationTitle">Location</span>
        <span className="locationCoords">{coordLabel}</span>
      </header>
      <div className="mapWrapper">
        <MapContainer
          center={center}
          /* Zoom 13 reads "this neighborhood" — ORM renders smaller
             station labels at 13 than at 14+, and the wider geographic
             area pulls dense terminals like Hoboken into context. */
          zoom={13}
          scrollWheelZoom={false}
          fadeAnimation={false}
          className="mapContainer locationMap"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &middot; <a href="https://carto.com/attributions">Carto</a>'
            url={BASE_TILE_URL}
            maxZoom={19}
          />
          <TileLayer
            attribution='Rail: <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a> (CC-BY-SA)'
            url={RAILWAY_TILE_URL}
            tileSize={512}
            zoomOffset={-1}
            maxZoom={19}
            opacity={0.45}
          />
          <Marker position={center} icon={trainIcon}>
            <Popup>{trainName}{trainNumber ? ` · ${trainNumber}` : ''}</Popup>
          </Marker>
          <RecenterOnPosition lat={latitude} lon={longitude} />
        </MapContainer>
      </div>
      <div className="mapDisclaimer locationFoot">
        Reported location may be delayed or approximate.
      </div>
    </section>
  );
};

export default TrainLocation;
