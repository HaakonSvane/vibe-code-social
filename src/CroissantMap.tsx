import React, { useRef, useImperativeHandle, forwardRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from "react-leaflet";
import L, { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./mapOverrides.css"; // hide default zoom control
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
  invalidateSize?: () => void;
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
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [searchOpen, setSearchOpen] = React.useState(true);

    // Basic Nominatim search
    interface SearchResult { lat: string; lon: string; display_name: string; }
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<SearchResult[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    React.useEffect(() => {
      if (!query.trim()) { setResults([]); setError(null); return; }
      setLoading(true); setError(null);
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const delay = setTimeout(() => {
        // Note: For production heavy usage self-host or add proper server proxy & email param.
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`;
        fetch(url, { headers: { 'Accept': 'application/json' }, signal: ac.signal })
          .then(r => { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.json(); })
          .then((data: SearchResult[]) => { setResults(data); })
          .catch(e => { if (e.name !== 'AbortError') setError('Search failed'); })
          .finally(() => setLoading(false));
      }, 350); // debounce
      return () => { clearTimeout(delay); ac.abort(); };
    }, [query]);

    function selectResult(r: SearchResult) {
      const lat = parseFloat(r.lat); const lng = parseFloat(r.lon);
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], 16, { duration: 1.1 });
      }
      setResults([]);
      setQuery(r.display_name);
    }

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
        invalidateSize: () => { mapRef.current?.invalidateSize(); }
      }),
      []
    );

    // Observe container size changes (drawer open/close) and invalidate map size
    React.useEffect(() => {
      if (!containerRef.current) return;
      const el = containerRef.current;
      let timeout: number | null = null;
      const ro = new ResizeObserver(() => {
        if (timeout) window.clearTimeout(timeout);
        timeout = window.setTimeout(() => {
          mapRef.current?.invalidateSize();
        }, 120); // slight debounce to wait for transition
      });
      ro.observe(el);
      return () => {
        if (timeout) window.clearTimeout(timeout);
        ro.disconnect();
      };
    }, []);

    return (
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, position:'relative' }}>
        <MapContainer
          center={spots[0] ? [spots[0].lat, spots[0].lng] : defaultCenter}
            zoom={13}
            zoomControl={false}
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
  {/* Search UI Overlay */}
        <div style={{ position:'absolute', top:12, left:12, zIndex:1200, width: searchOpen? 300: 46, transition:'width 160ms ease' }}>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button
              onClick={() => setSearchOpen(o=>!o)}
              style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, boxShadow:'var(--shadow)' }}
              title={searchOpen? 'Collapse search' : 'Expand search'}
            >
              <span style={{ fontSize:14 }}>🔍</span>{searchOpen && <span style={{ fontSize:12, fontWeight:500 }}>Search</span>}
            </button>
            {searchOpen && (
              <div style={{ flex:1, position:'relative' }}>
                <input
                  value={query}
                  onChange={e=> setQuery(e.target.value)}
                  placeholder="Search places (OSM)"
                  style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:8, background:'var(--panel)', color:'var(--text)', fontSize:13 }}
                  aria-label="Search places"
                />
                {loading && <div style={{ position:'absolute', top:8, right:10, fontSize:11, opacity:.6 }}>…</div>}
                {error && <div style={{ position:'absolute', top:'100%', left:0, marginTop:4, fontSize:11, color:'#e03131' }}>{error}</div>}
                {results.length>0 && (
                  <ul style={{ listStyle:'none', margin:0, padding:0, position:'absolute', top:'100%', left:0, right:0, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:8, marginTop:4, maxHeight:240, overflowY:'auto', boxShadow:'0 4px 14px rgba(0,0,0,0.25)' }}>
                    {results.map(r => (
                      <li key={r.lat+','+r.lon}>
                        <button
                          onClick={() => selectResult(r)}
                          style={{ all:'unset', display:'block', width:'100%', textAlign:'left', padding:'8px 10px', cursor:'pointer', fontSize:12, lineHeight:1.3 }}
                        >{r.display_name}</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Custom Zoom Control below search */}
        <div style={{ position:'absolute', left:12, zIndex:1200, top: searchOpen ? 70 : 64, display:'flex', flexDirection:'column', gap:6 }}>
          <button
            onClick={() => mapRef.current?.zoomIn()}
            style={{ width:44, height:44, borderRadius:10, border:'1px solid var(--border)', background:'var(--panel)', cursor:'pointer', fontSize:20, fontWeight:600, boxShadow:'var(--shadow)', display:'flex', alignItems:'center', justifyContent:'center' }}
            aria-label="Zoom in"
          >+</button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            style={{ width:44, height:44, borderRadius:10, border:'1px solid var(--border)', background:'var(--panel)', cursor:'pointer', fontSize:22, fontWeight:600, boxShadow:'var(--shadow)', display:'flex', alignItems:'center', justifyContent:'center' }}
            aria-label="Zoom out"
          >−</button>
        </div>
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
