import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'leaflet/dist/leaflet.css';
import '../styles/TrainLocation.css';

// Helper to recenter the map when coords change
const RecenterOnPosition = ({ lat, lon }) => {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      map.setView([lat, lon]);
    }
  }, [lat, lon, map]);
  return null;
};

const TrainLocation = ({ lat, lon, trainName = 'Train' }) => {
  // Create the icon unconditionally so Hooks order is stable
  // Create a custom NJ Transit themed circle with a train glyph
  const trainIcon = useMemo(
    () =>
      L.divIcon({
        className: 'njtTrainIcon',
        html:
          '<div class="njt-train-circle"><i class="fa-solid fa-train"></i></div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      }),
    []
  );

  const latitude = typeof lat === 'string' ? parseFloat(lat) : lat;
  const longitude = typeof lon === 'string' ? parseFloat(lon) : lon;

  const isValid = Number.isFinite(latitude) && Number.isFinite(longitude);
  if (!isValid) return null;

  const center = [latitude, longitude];

  return (
    <div className="pillContainer TrainLocation">
      <h2 style={{ textAlign: 'left', marginTop: 0 }}>Location</h2>
      <div className="mapWrapper">
        <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="mapContainer">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={center} icon={trainIcon}>
            <Popup>{trainName}</Popup>
          </Marker>
          <RecenterOnPosition lat={latitude} lon={longitude} />
        </MapContainer>
      </div>
      <div className="mapDisclaimer">Reported location may be delayed or approximate.</div>
    </div>
  );
};

export default TrainLocation;
