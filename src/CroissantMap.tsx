import React, { useRef, useImperativeHandle, forwardRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from "react-leaflet";
import L, { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { CroissantSpot } from "./types";

// Base croissant image
const croissantPng = new URL("../assets/croissant.png", import.meta.url).href;

function colorForRating(r?: number) {
  if (!r) return '#adb5bd'; // gray for unrated
  switch (r) {
    case 1: return '#ff4d4f';
    case 2: return '#ff884d';
    case 3: return '#ffbf3c';
    case 4: return '#9ad14b';
    case 5: return '#4caf50';
    default: return '#adb5bd';
  }
}

function markerIcon(rating?: number) {
  const color = colorForRating(rating);
  return L.divIcon({
    className: 'croissant-marker',
    html: `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;position:relative;">
      <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.25;"></div>
      <img src="${croissantPng}" style="width:28px;height:28px;filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));" alt="croissant" />
    </div>`
  });
}

const defaultCenter: [number, number] = [48.8566, 2.3522];

interface AddHandlerProps {
  onAdd: (lat: number, lng: number) => void;
}

interface CroissantMapProps {
  spots: CroissantSpot[];
  onAddSpot: (lat: number, lng: number) => void;
  onRemoveSpot: (id: string) => void;
  onUpdateSpot?: (spot: CroissantSpot) => void;
}

// Map ref interface for imperative actions
export interface CroissantMapRef {
  navigateToSpot: (lat: number, lng: number, zoom?: number) => void;
}

const AddHandler: React.FC<AddHandlerProps> = ({ onAdd }) => {
  useMapEvents({
    click(e) {
      onAdd(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Component to handle map navigation
interface MapNavigatorProps {
  mapRef: React.MutableRefObject<L.Map | null>;
}

const MapNavigator: React.FC<MapNavigatorProps> = ({ mapRef }) => {
  const map = useMapEvents({});

  React.useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  return null;
};

const starStyles: React.CSSProperties = {
  cursor: 'pointer',
  fontSize: '20px',
  lineHeight: '1',
  userSelect: 'none'
};

function RatingStars({ value, onChange }: { value?: number; onChange: (val: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(n => (
        <span
          key={n}
          style={{ ...starStyles, color: (value ?? 0) >= n ? '#ffc107' : '#ddd' }}
          role="button"
          aria-label={`Rate ${n} star${n>1?'s':''}`}
          onClick={e => { e.stopPropagation(); onChange(n); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(n); } }}
          tabIndex={0}
        >★</span>
      ))}
    </div>
  );
}

export const CroissantMap = forwardRef<CroissantMapRef, CroissantMapProps>(
  ({ spots, onAddSpot, onRemoveSpot, onUpdateSpot }, ref) => {
    const mapRef = useRef<L.Map | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        navigateToSpot: (lat: number, lng: number, zoom = 16) => {
          if (mapRef.current) {
            mapRef.current.flyTo([lat, lng], zoom, {
              duration: 1.5,
              easeLinearity: 0.1,
            });
          }
        },
      }),
      []
    );
    return (
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapContainer
          center={spots[0] ? [spots[0].lat, spots[0].lng] : defaultCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapNavigator mapRef={mapRef} />
          <AddHandler onAdd={onAddSpot} />
          {spots.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              icon={markerIcon(s.rating)}
              eventHandlers={{
                contextmenu: () => onRemoveSpot(s.id),
              }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Rate this croissant</div>
                  <RatingStars value={s.rating} onChange={(val) => onUpdateSpot && onUpdateSpot({ ...s, rating: val })} />
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <small style={{ color: '#666' }}>{s.rating ? `${s.rating}/5` : 'Unrated'}</small>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveSpot(s.id); }}
                      style={{ background:'#ff6b6b', color:'#fff', border:'none', borderRadius:4, padding: '4px 8px', cursor:'pointer', fontSize:12 }}
                    >Delete</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <div className="rating-legend" aria-label="Rating legend" style={{ zIndex:1100, pointerEvents:'auto' }}>
          <div style={{ fontWeight:600, fontSize:11, letterSpacing:'.5px', textTransform:'uppercase', opacity:.8 }}>Ratings</div>
          {[5,4,3,2,1].map(r => (
            <div key={r} className="rating-legend-row">
              <span className="legend-dot" style={{ background: colorForRating(r) }} />
              <span style={{ fontSize:12 }}>{r} star{r>1?'s':''}</span>
            </div>
          ))}
          <div className="rating-legend-row">
            <span className="legend-dot" style={{ background: colorForRating(undefined) }} />
            <span style={{ fontSize:12 }}>Unrated</span>
          </div>
        </div>
      </div>
    );
  }
);
