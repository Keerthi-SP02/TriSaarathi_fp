import React, { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const indiaCenter = [22.9734, 78.6569];

function MapBounds({ places }) {
  const map = useMap();
  useEffect(() => {
    if (!places.length) return;
    const bounds = places
      .filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
      .map((place) => [place.latitude, place.longitude]);
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 8 });
    else if (bounds.length === 1) map.setView(bounds[0], 9);
  }, [map, places]);
  return null;
}

export default function RuralDiscoveryMap({
  destinations,
  route,
  routeStart,
  routeEnd,
  onSelectStart,
  onSelectEnd,
}) {
  const routePositions = route?.geometry?.coordinates?.map(([longitude, latitude]) => [latitude, longitude]) || [];
  const visiblePlaces = destinations.filter((place) => (
    Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
  ));

  return (
    <div className="business-v2-discovery-map">
      <MapContainer center={indiaCenter} zoom={5} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapBounds places={visiblePlaces} />
        {visiblePlaces.map((place) => (
          <CircleMarker
            key={place.id}
            center={[place.latitude, place.longitude]}
            radius={routeStart?.id === place.id || routeEnd?.id === place.id ? 9 : 6}
            pathOptions={{
              color: routeStart?.id === place.id ? '#db6a30' : routeEnd?.id === place.id ? '#377b5b' : '#2379a6',
              fillColor: routeStart?.id === place.id ? '#ef9b44' : routeEnd?.id === place.id ? '#78a86c' : '#68b4d2',
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <div className="business-v2-map-popup">
                <strong>{place.name}</strong>
                <span>{place.category}{place.location ? ` · ${place.location}` : ''}</span>
                <div>
                  <button type="button" onClick={() => onSelectStart(place)}>Set route start</button>
                  <button type="button" onClick={() => onSelectEnd(place)}>Set route end</button>
                </div>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=15/${place.latitude}/${place.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in OpenStreetMap
                </a>
              </div>
            </Popup>
          </CircleMarker>
        ))}
        {routePositions.length > 0 && (
          <Polyline positions={routePositions} pathOptions={{ color: '#d9652b', weight: 5, opacity: 0.85 }} />
        )}
      </MapContainer>
    </div>
  );
}
