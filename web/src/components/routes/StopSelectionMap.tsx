'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Rectangle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface CustomerLocation {
  id: string;
  name: string;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  category?: string | null;
  phone?: string | null;
}

interface StopSelectionMapProps {
  customers: CustomerLocation[];
  selectedCustomerIds: string[];
  onToggleCustomer: (id: string) => void;
  onSelectMultiple: (ids: string[], mode: 'add' | 'replace' | 'remove') => void;
}

// Haversine formula to compute distance in meters between two coordinates
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Custom DivIcon generator to avoid Next.js asset resolution issues and provide rich states
function createMarkerIcon(isSelected: boolean, orderNumber?: number) {
  return L.divIcon({
    className: 'custom-stop-pin',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: ${isSelected ? '#C4A35A' : '#1A1D20'};
        color: ${isSelected ? '#1A1A1A' : '#FFFFFF'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        border: 2.5px solid ${isSelected ? '#FFFFFF' : '#C4A35A'};
        box-shadow: 0 3px 8px rgba(0,0,0,0.35);
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        transform: ${isSelected ? 'scale(1.15)' : 'scale(1.0)'};
      ">
        ${isSelected ? (orderNumber !== undefined ? `${orderNumber}` : '✓') : '📍'}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function MapEventsHandler({
  selectionTool,
  onMapClick,
}: {
  selectionTool: 'PIN' | 'CIRCLE' | 'RECTANGLE';
  onMapClick: (latlng: L.LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function MapViewController({ target }: { target: { center: [number, number]; zoom: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target.center, target.zoom, { duration: 1.0 });
    }
  }, [target, map]);
  return null;
}

export default function StopSelectionMap({
  customers,
  selectedCustomerIds,
  onToggleCustomer,
  onSelectMultiple,
}: StopSelectionMapProps) {
  // Addis Ababa default center
  const defaultCenter: [number, number] = [9.0227, 38.7469];
  const [viewTarget, setViewTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);

  // Active Tool: 'PIN' | 'CIRCLE' | 'RECTANGLE'
  const [tool, setTool] = useState<'PIN' | 'CIRCLE' | 'RECTANGLE'>('PIN');

  // Circle Geofence State
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const [circleRadius, setCircleRadius] = useState<number>(1500); // 1.5 km default

  // Rectangle Area State
  const [rectCorner1, setRectCorner1] = useState<[number, number] | null>(null);
  const [rectCorner2, setRectCorner2] = useState<[number, number] | null>(null);

  // Status message
  const [toolTipMessage, setToolTipMessage] = useState<string>('Click any shop pin to toggle selection');

  // Customers with valid GPS
  const validCustomers = useMemo(() => {
    return customers.filter(c => typeof c.lat === 'number' && typeof c.lng === 'number');
  }, [customers]);

  // Handle map clicks according to the active tool
  const handleMapClick = (latlng: L.LatLng) => {
    if (tool === 'CIRCLE') {
      const newCenter: [number, number] = [latlng.lat, latlng.lng];
      setCircleCenter(newCenter);
      applyCircleSelection(newCenter, circleRadius);
    } else if (tool === 'RECTANGLE') {
      if (!rectCorner1 || (rectCorner1 && rectCorner2)) {
        // First corner
        setRectCorner1([latlng.lat, latlng.lng]);
        setRectCorner2(null);
        setToolTipMessage('Corner 1 pinned! Click on the opposite corner to complete the rectangle.');
      } else {
        // Second corner
        const newCorner2: [number, number] = [latlng.lat, latlng.lng];
        setRectCorner2(newCorner2);
        applyRectSelection(rectCorner1, newCorner2);
      }
    }
  };

  // Apply circle selection
  const applyCircleSelection = (center: [number, number], radiusMeters: number) => {
    const inside = validCustomers.filter(c => {
      const dist = getDistanceMeters(center[0], center[1], c.lat!, c.lng!);
      return dist <= radiusMeters;
    });
    const ids = inside.map(c => c.id);
    onSelectMultiple(ids, 'add');
    setToolTipMessage(`⭕ Circle pinned! ${ids.length} shops selected within ${(radiusMeters / 1000).toFixed(1)} km.`);
  };

  // Apply rectangle selection
  const applyRectSelection = (c1: [number, number], c2: [number, number]) => {
    const minLat = Math.min(c1[0], c2[0]);
    const maxLat = Math.max(c1[0], c2[0]);
    const minLng = Math.min(c1[1], c2[1]);
    const maxLng = Math.max(c1[1], c2[1]);

    const inside = validCustomers.filter(c => {
      return c.lat! >= minLat && c.lat! <= maxLat && c.lng! >= minLng && c.lng! <= maxLng;
    });
    const ids = inside.map(c => c.id);
    onSelectMultiple(ids, 'add');
    setToolTipMessage(`▭ Rectangle pinned! ${ids.length} shops selected within area.`);
  };

  // Adjust circle radius
  const handleRadiusChange = (newRadius: number) => {
    setCircleRadius(newRadius);
    if (circleCenter) {
      applyCircleSelection(circleCenter, newRadius);
    }
  };

  // Clear shapes
  const handleClearShapes = () => {
    setCircleCenter(null);
    setRectCorner1(null);
    setRectCorner2(null);
    setTool('PIN');
    setToolTipMessage('Tools reset. Click any shop pin to toggle selection.');
  };

  // Calculate rectangle bounds for Leaflet
  const rectBounds = useMemo(() => {
    if (!rectCorner1 || !rectCorner2) return null;
    return [
      [Math.min(rectCorner1[0], rectCorner2[0]), Math.min(rectCorner1[1], rectCorner2[1])],
      [Math.max(rectCorner1[0], rectCorner2[0]), Math.max(rectCorner1[1], rectCorner2[1])],
    ] as L.LatLngBoundsLiteral;
  }, [rectCorner1, rectCorner2]);

  return (
    <div className="flex flex-col h-full w-full bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Top Map Control Bar */}
      <div className="p-3 bg-gray-50 border-b border-border flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-primary mr-1">Tools:</span>
          
          <button
            type="button"
            onClick={() => {
              setTool('PIN');
              setToolTipMessage('Pin Mode: Click individual shops to toggle selection.');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all ${
              tool === 'PIN'
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white text-text-muted border-border hover:bg-gray-100'
            }`}
          >
            <span>📍</span>
            <span>Single Pin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTool('CIRCLE');
              setToolTipMessage('Circle Tool: Click anywhere on the map to pin a circle radius.');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all ${
              tool === 'CIRCLE'
                ? 'bg-accent text-primary-darker border-accent shadow-sm'
                : 'bg-white text-text-muted border-border hover:bg-gray-100'
            }`}
          >
            <span>⭕</span>
            <span>Pin Circle (Radius)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTool('RECTANGLE');
              setRectCorner1(null);
              setRectCorner2(null);
              setToolTipMessage('Rectangle Tool: Click map to pin Corner 1, then click Corner 2.');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all ${
              tool === 'RECTANGLE'
                ? 'bg-accent text-primary-darker border-accent shadow-sm'
                : 'bg-white text-text-muted border-border hover:bg-gray-100'
            }`}
          >
            <span>▭</span>
            <span>Pin Rectangle</span>
          </button>

          {(circleCenter || rectCorner1) && (
            <button
              type="button"
              onClick={handleClearShapes}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
            >
              ✕ Clear Geofence
            </button>
          )}
        </div>

        {/* Sector Quick Jump */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold text-text-muted mr-1">Sector:</span>
          {[
            { name: 'All Addis', center: [9.0227, 38.7469] as [number, number], zoom: 12 },
            { name: 'Mercato', center: [9.0305, 38.7360] as [number, number], zoom: 14 },
            { name: 'Yeka', center: [9.0255, 38.8150] as [number, number], zoom: 14 },
            { name: 'Bole', center: [8.9950, 38.7880] as [number, number], zoom: 14 },
          ].map(sec => (
            <button
              key={sec.name}
              type="button"
              onClick={() => setViewTarget({ center: sec.center, zoom: sec.zoom })}
              className="px-2 py-1 text-[11px] font-semibold bg-white border border-border rounded text-text-muted hover:text-primary hover:border-gray-400 transition-colors"
            >
              {sec.name}
            </button>
          ))}
        </div>
      </div>

      {/* Geofence Active Sub-Toolbar (When circle or rectangle is active) */}
      {tool === 'CIRCLE' && (
        <div className="px-3 py-2 bg-amber-50/70 border-b border-accent/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary">⭕ Radius Range:</span>
            {[
              { label: '500m', val: 500 },
              { label: '1.0 km', val: 1000 },
              { label: '1.5 km', val: 1500 },
              { label: '2.5 km', val: 2500 },
              { label: '4.0 km', val: 4000 },
            ].map(r => (
              <button
                key={r.val}
                type="button"
                onClick={() => handleRadiusChange(r.val)}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  circleRadius === r.val
                    ? 'bg-accent text-primary-darker shadow-sm'
                    : 'bg-white border border-border text-text-muted hover:bg-gray-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="text-text-muted italic">Click on map to drop or move center</span>
        </div>
      )}

      {tool === 'RECTANGLE' && (
        <div className="px-3 py-2 bg-amber-50/70 border-b border-accent/30 flex items-center justify-between text-xs font-semibold text-primary">
          <div className="flex items-center gap-2">
            <span>▭ Bounding Box Mode:</span>
            <span className="text-text-muted font-normal">
              {!rectCorner1
                ? 'Step 1: Click to place first corner'
                : !rectCorner2
                ? 'Step 2: Click to place opposite corner'
                : 'Box active! Click again to draw a new rectangle'}
            </span>
          </div>
          {rectCorner1 && !rectCorner2 && (
            <span className="text-accent font-bold animate-pulse">Awaiting Corner 2...</span>
          )}
        </div>
      )}

      {/* Main Map Container */}
      <div className="flex-1 w-full min-h-[460px] relative z-0">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapEventsHandler selectionTool={tool} onMapClick={handleMapClick} />
          <MapViewController target={viewTarget} />

          {/* Render Circle if defined */}
          {circleCenter && (
            <Circle
              center={circleCenter}
              radius={circleRadius}
              pathOptions={{
                color: '#C4A35A',
                fillColor: '#C4A35A',
                fillOpacity: 0.18,
                weight: 2.5,
                dashArray: '5, 5',
              }}
            />
          )}

          {/* Render Rectangle if defined */}
          {rectBounds && (
            <Rectangle
              bounds={rectBounds}
              pathOptions={{
                color: '#C4A35A',
                fillColor: '#C4A35A',
                fillOpacity: 0.18,
                weight: 2.5,
                dashArray: '5, 5',
              }}
            />
          )}

          {/* Render Corner 1 indicator while placing rectangle */}
          {rectCorner1 && !rectCorner2 && (
            <Circle
              center={rectCorner1}
              radius={100}
              pathOptions={{ color: '#D64545', fillColor: '#D64545', fillOpacity: 0.5 }}
            />
          )}

          {/* Customer Markers */}
          {validCustomers.map(c => {
            const isSelected = selectedCustomerIds.includes(c.id);
            const selectedIndex = isSelected ? selectedCustomerIds.indexOf(c.id) + 1 : undefined;

            return (
              <Marker
                key={c.id}
                position={[c.lat!, c.lng!]}
                icon={createMarkerIcon(isSelected, selectedIndex)}
                eventHandlers={{
                  click: () => {
                    if (tool === 'PIN') {
                      onToggleCustomer(c.id);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="font-sans text-xs space-y-1.5 p-1 max-w-[200px]">
                    <div className="font-bold text-sm text-primary flex items-center justify-between gap-1">
                      <span>{c.name}</span>
                      {c.category && (
                        <span className="text-[10px] bg-gray-100 px-1 py-0.5 rounded text-text-muted">
                          {c.category}
                        </span>
                      )}
                    </div>
                    {c.address && <div className="text-text-muted">{c.address}</div>}
                    {c.phone && <div className="font-mono text-text-muted">📞 {c.phone}</div>}
                    <div className="font-mono text-[11px] text-emerald-700">
                      📍 {c.lat?.toFixed(4)}, {c.lng?.toFixed(4)}
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleCustomer(c.id)}
                      className={`w-full mt-2 py-1 px-2 rounded font-bold text-xs transition-colors ${
                        isSelected
                          ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                          : 'bg-accent text-primary-darker hover:bg-accent-light'
                      }`}
                    >
                      {isSelected ? '✕ Remove Stop' : '+ Add to Route'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Bottom Map Status & Quick Selection Action Bar */}
      <div className="p-3 bg-white border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
          <span className="text-text-muted">{toolTipMessage}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-primary">
            {selectedCustomerIds.length} of {validCustomers.length} Mapped Stops Selected
          </span>
          <button
            type="button"
            onClick={() => onSelectMultiple(validCustomers.map(c => c.id), 'add')}
            className="px-2 py-1 font-bold text-text-muted hover:text-primary underline"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={() => onSelectMultiple([], 'replace')}
            className="px-2 py-1 font-bold text-red-600 hover:underline"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
