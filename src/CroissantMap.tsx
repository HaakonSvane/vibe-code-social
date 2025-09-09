import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Polygon, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CroissantSpot } from './types';
import { loadSpots, saveSpots } from './storage';
import { convexHull } from './convexHull';

const defaultCenter: [number, number] = [48.8566, 2.3522];

interface AddHandlerProps { onAdd: (lat: number, lng: number) => void; }

const AddHandler: React.FC<AddHandlerProps> = ({ onAdd }) => {
  useMapEvents({
    click(e) { onAdd(e.latlng.lat, e.latlng.lng); },
  });
  return null;
};

export const CroissantMap: React.FC = () => {
  const [spots, setSpots] = React.useState<CroissantSpot[]>(() => loadSpots());

  function addSpot(lat: number, lng: number) {
    setSpots(prev => {
      const next = [...prev, { id: crypto.randomUUID(), lat, lng, createdAt: new Date().toISOString() }];
      saveSpots(next);
      return next;
    });
  }

  function removeSpot(id: string) {
    setSpots(prev => {
      const next = prev.filter(s => s.id !== id);
      saveSpots(next);
      return next;
    });
  }

  const hull = spots.length >= 3 ? convexHull(spots.map(s => [s.lat, s.lng])) : null;

  return (
    <div style={{ flex:1, minHeight:0 }}>
      <MapContainer center={spots[0] ? [spots[0].lat, spots[0].lng] : defaultCenter} zoom={13} style={{ height:'100%', width:'100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AddHandler onAdd={addSpot} />
        {hull && (
          <Polygon positions={hull} pathOptions={{ color:'#ff6f61', weight:2, fillOpacity:0.15 }} />
        )}
        {spots.map(s => (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={10}
            pathOptions={{ color:'#ff9f43', fillColor:'#ff9f43', fillOpacity:0.8 }}
            eventHandlers={{
              contextmenu: () => removeSpot(s.id),
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
};
