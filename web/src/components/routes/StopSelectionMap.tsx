'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Rectangle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ADDIS_ABABA_CENTRAL_LOCATION, ADDIS_ABABA_TAGGED_LOCATIONS } from '@/lib/constants/addisLocations';

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
  onViewportFetch?: (viewport: { minLat: number; maxLat: number; minLng: number; maxLng: number; zoom: number }) => void;
  isLoadingViewport?: boolean;
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

// Adaptive Marker Icon generator that scales based on zoom level
function createMarkerIcon(isSelected: boolean, orderNumber?: number, zoom = 14, category?: string) {
  let size = 26;
  let fontSize = 11;
  let borderWidth = 2;

  if (zoom < 13) {
    // City overview: micro dot
    size = isSelected ? 22 : 14;
    fontSize = 9;
    borderWidth = 1.5;
  } else if (zoom < 15) {
    // District / Corridor level: compact badge
    size = isSelected ? 28 : 22;
    fontSize = 11;
    borderWidth = 2;
  } else if (zoom < 17) {
    // Neighborhood level: standard badge
    size = isSelected ? 32 : 28;
    fontSize = 12;
    borderWidth = 2.5;
  } else {
    // Street / Block level: high-detail badge
    size = isSelected ? 36 : 30;
    fontSize = 13;
    borderWidth = 3;
  }

  const iconSymbol = isSelected
    ? (orderNumber !== undefined ? `${orderNumber}` : '✓')
    : (zoom < 13 ? '' : (category === 'Supermarket' || category === 'Wholesale' ? '🏬' : '📍'));

  return L.divIcon({
    className: 'custom-stop-pin',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background-color: ${isSelected ? '#C4A35A' : '#1A1D20'};
        color: ${isSelected ? '#1A1A1A' : '#FFFFFF'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: ${fontSize}px;
        border: ${borderWidth}px solid ${isSelected ? '#FFFFFF' : '#C4A35A'};
        box-shadow: 0 3px 8px rgba(0,0,0,0.55);
        cursor: pointer;
        transition: transform 0.15s ease, background-color 0.2s ease;
        transform: ${isSelected ? 'scale(1.15)' : 'scale(1.0)'};
      ">
        ${iconSymbol}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 2],
  });
}

function MapEventsHandler({
  selectionTool,
  onMapClick,
  onViewportChange,
}: {
  selectionTool: 'PIN' | 'CIRCLE' | 'RECTANGLE';
  onMapClick: (latlng: L.LatLng) => void;
  onViewportChange: (zoom: number, bounds: L.LatLngBounds) => void;
}) {
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const map = useMapEvents({
    click(e) {
      onMapClickRef.current(e.latlng);
    },
    zoomend() {
      onViewportChangeRef.current(map.getZoom(), map.getBounds());
    },
    moveend() {
      onViewportChangeRef.current(map.getZoom(), map.getBounds());
    },
  });

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      onViewportChangeRef.current(map.getZoom(), map.getBounds());
    }
  }, [map]);

  return null;
}

function MapViewController({
  target,
  targetZoom,
}: {
  target: { center: [number, number]; zoom: number } | null;
  targetZoom?: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo(target.center, target.zoom, { duration: 1.0 });
    }
  }, [target, map]);

  useEffect(() => {
    if (typeof targetZoom === 'number') {
      map.setZoom(targetZoom);
    }
  }, [targetZoom, map]);

  return null;
}

export default function StopSelectionMap({
  customers,
  selectedCustomerIds,
  onToggleCustomer,
  onSelectMultiple,
  onViewportFetch,
  isLoadingViewport = false,
}: StopSelectionMapProps) {
  // Addis Ababa default center
  const defaultCenter: [number, number] = [9.0227, 38.7469];
  const [viewTarget, setViewTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [zoomTarget, setZoomTarget] = useState<number | null>(null);

  // Map state
  const [currentZoom, setCurrentZoom] = useState<number>(13);
  const [currentBounds, setCurrentBounds] = useState<L.LatLngBounds | null>(null);
  const [densityMode, setDensityMode] = useState<'SMART' | 'ALL'>('SMART');

  // Viewport fetch debounce tracking
  const lastFetchedBoundsRef = React.useRef<string>('');
  const fetchTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Map Layer: 'SATELLITE' (default) vs 'STREET'
  const [mapLayer, setMapLayer] = useState<'SATELLITE' | 'STREET'>('SATELLITE');

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

  // Debounced Viewport Fetcher
  const triggerViewportFetch = useCallback(
    (zoom: number, bounds: L.LatLngBounds) => {
      if (!onViewportFetch) return;
      const minLat = bounds.getSouth();
      const maxLat = bounds.getNorth();
      const minLng = bounds.getWest();
      const maxLng = bounds.getEast();

      // Precision to avoid duplicate requests for micro pixel jitter
      const boundsKey = `${minLat.toFixed(3)},${maxLat.toFixed(3)},${minLng.toFixed(3)},${maxLng.toFixed(3)},${zoom}`;
      if (lastFetchedBoundsRef.current === boundsKey) return;

      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = setTimeout(() => {
        lastFetchedBoundsRef.current = boundsKey;
        onViewportFetch({ minLat, maxLat, minLng, maxLng, zoom });
      }, 300);
    },
    [onViewportFetch],
  );

  // Manual trigger for current bounds
  const handleForceRefetch = useCallback(() => {
    if (onViewportFetch && currentBounds) {
      onViewportFetch({
        minLat: currentBounds.getSouth(),
        maxLat: currentBounds.getNorth(),
        minLng: currentBounds.getWest(),
        maxLng: currentBounds.getEast(),
        zoom: currentZoom,
      });
    }
  }, [onViewportFetch, currentBounds, currentZoom]);

  // Viewport change handler
  const handleViewportChange = useCallback((zoom: number, bounds: L.LatLngBounds) => {
    setCurrentZoom((prevZoom) => (prevZoom !== zoom ? zoom : prevZoom));
    setCurrentBounds((prevBounds) => {
      if (
        prevBounds &&
        Math.abs(prevBounds.getSouth() - bounds.getSouth()) < 0.0001 &&
        Math.abs(prevBounds.getNorth() - bounds.getNorth()) < 0.0001 &&
        Math.abs(prevBounds.getWest() - bounds.getWest()) < 0.0001 &&
        Math.abs(prevBounds.getEast() - bounds.getEast()) < 0.0001
      ) {
        return prevBounds;
      }
      return bounds;
    });
    triggerViewportFetch(zoom, bounds);
  }, [triggerViewportFetch]);

  // Filter and scale pins based on viewport bounds and zoom level ("Scale View")
  const displayedCustomers = useMemo(() => {
    if (!currentBounds) {
      return validCustomers.slice(0, 300);
    }

    // Pad bounds by 15% so markers outside edge don't abruptly pop in while panning
    const paddedBounds = currentBounds.pad(0.15);

    const selectedSet = new Set(selectedCustomerIds);
    const inViewport: CustomerLocation[] = [];
    const selectedInViewport: CustomerLocation[] = [];
    const selectedOutsideViewport: CustomerLocation[] = [];

    for (const c of validCustomers) {
      const isSelected = selectedSet.has(c.id);
      const inside = paddedBounds.contains([c.lat!, c.lng!]);

      if (isSelected) {
        if (inside) {
          selectedInViewport.push(c);
        } else {
          selectedOutsideViewport.push(c);
        }
      } else if (inside) {
        inViewport.push(c);
      }
    }

    // If densityMode is 'ALL' or zoomed in to neighborhood/street/condo block level (zoom >= 15):
    // Show 100% of all establishments in the viewport!
    if (densityMode === 'ALL' || currentZoom >= 15) {
      return [...selectedOutsideViewport, ...selectedInViewport, ...inViewport];
    }

    // Smart adaptive scale sampling for lower zoom levels to keep the map legible and high-performance
    let sampleStride = 1;
    let maxUnselected = 400;

    if (currentZoom < 13) {
      // City overview: sample every 5th pin (max 120 pins)
      sampleStride = 5;
      maxUnselected = 120;
    } else if (currentZoom === 13) {
      // Sub-city level: sample every 3rd pin (max 250 pins)
      sampleStride = 3;
      maxUnselected = 250;
    } else if (currentZoom === 14) {
      // District / corridor level: sample every 2nd pin (max 400 pins)
      sampleStride = 2;
      maxUnselected = 400;
    }

    const sampledUnselected: CustomerLocation[] = [];
    for (let i = 0; i < inViewport.length; i += sampleStride) {
      sampledUnselected.push(inViewport[i]);
      if (sampledUnselected.length >= maxUnselected) break;
    }

    return [...selectedOutsideViewport, ...selectedInViewport, ...sampledUnselected];
  }, [validCustomers, selectedCustomerIds, currentBounds, currentZoom, densityMode]);

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

  // Current Zoom Scale Description
  const zoomScaleLabel = useMemo(() => {
    if (currentZoom < 13) return { tier: 'City Scale', icon: '🌐', detail: 'Overview (Filtered landmarks)' };
    if (currentZoom < 15) return { tier: 'Corridor Scale', icon: '📍', detail: 'District hubs' };
    if (currentZoom < 17) return { tier: 'Neighborhood Scale', icon: '🏘️', detail: 'Condos & Sites' };
    return { tier: 'Street / Block Scale', icon: '🏪', detail: '100% full building & kiosk detail' };
  }, [currentZoom]);

  return (
    <div className="flex flex-col h-full w-full bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Top Map Control Bar */}
      <div className="p-3 bg-gray-50 border-b border-border flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
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

        {/* View Mode & Sector Quick Jump */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Layer Switcher (Satellite vs Street) */}
          <div className="flex items-center bg-white border border-border rounded-lg p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setMapLayer('SATELLITE')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                mapLayer === 'SATELLITE'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-muted hover:text-primary'
              }`}
            >
              <span>🛰️</span>
              <span>Satellite</span>
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('STREET')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                mapLayer === 'STREET'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-muted hover:text-primary'
              }`}
            >
              <span>🗺️</span>
              <span>Street</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-border mx-0.5 hidden sm:block" />

          {/* Quick Sectors & Tagged Location Fly-To */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-text-muted mr-0.5">Focus:</span>
            {[
              { name: '📍 Central Addis', center: [ADDIS_ABABA_CENTRAL_LOCATION.lat, ADDIS_ABABA_CENTRAL_LOCATION.lng] as [number, number], zoom: 13 },
              { name: 'Yeka Abado (Full Blocks)', center: [9.0665, 38.8720] as [number, number], zoom: 16 },
              { name: 'Mercato', center: [9.0305, 38.7360] as [number, number], zoom: 15 },
              { name: 'Bole', center: [8.9950, 38.7880] as [number, number], zoom: 15 },
              { name: 'Lebu / Jemo', center: [8.9600, 38.7200] as [number, number], zoom: 15 },
              { name: 'Piazza', center: [9.0220, 38.7520] as [number, number], zoom: 16 },
            ].map(sec => (
              <button
                key={sec.name}
                type="button"
                onClick={() => setViewTarget({ center: sec.center, zoom: sec.zoom })}
                className="px-2 py-1 text-[11px] font-semibold bg-white border border-border rounded text-text-muted hover:text-primary hover:border-accent transition-colors"
              >
                {sec.name}
              </button>
            ))}

            {/* Quick dropdown for all 20+ tagged locations */}
            <select
              aria-label="Jump to Tagged Location"
              onChange={(e) => {
                const loc = ADDIS_ABABA_TAGGED_LOCATIONS.find(l => l.id === e.target.value);
                if (loc) {
                  setViewTarget({ center: [loc.lat, loc.lng], zoom: 16 });
                }
              }}
              defaultValue=""
              className="text-[11px] font-bold text-primary bg-white border border-border rounded px-2 py-1 outline-none hover:border-accent cursor-pointer"
            >
              <option value="" disabled>Jump to Landmark ({ADDIS_ABABA_TAGGED_LOCATIONS.length})...</option>
              {ADDIS_ABABA_TAGGED_LOCATIONS.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.subCity})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scale View & Zoom Density Bar */}
      <div className="px-3 py-1.5 bg-gradient-to-r from-amber-50/90 to-gray-50 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Zoom & Scale Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-amber-300 px-2.5 py-1 rounded-md shadow-xs">
            <span className="text-sm">{zoomScaleLabel.icon}</span>
            <span className="font-bold text-primary font-mono">{currentZoom}x Zoom</span>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
              {zoomScaleLabel.tier}
            </span>
            <span className="text-[11px] text-text-muted hidden md:inline">({zoomScaleLabel.detail})</span>
          </div>

          {/* Quick Zoom Presets */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-text-muted font-bold mr-0.5">Scale:</span>
            {[
              { label: 'City (12x)', zoom: 12 },
              { label: 'Corridor (14x)', zoom: 14 },
              { label: 'Neighborhood (16x)', zoom: 16 },
              { label: 'Block (18x)', zoom: 18 },
            ].map(p => (
              <button
                key={p.zoom}
                type="button"
                onClick={() => setZoomTarget(p.zoom)}
                className={`px-2 py-0.5 text-[11px] rounded font-semibold border transition-all ${
                  currentZoom === p.zoom
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white text-text-muted border-border hover:text-primary hover:bg-gray-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Density Mode Switcher & Viewport Fetch Indicator */}
        <div className="flex items-center gap-2">
          {isLoadingViewport ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-900 text-[11px] font-bold border border-amber-300 shadow-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Fetching Viewport Stops…</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleForceRefetch}
              title="Click to re-fetch stops inside current map viewport"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-border text-text-muted hover:text-primary hover:border-accent transition-colors cursor-pointer"
            >
              <span>⚡ Viewport Stream</span>
              <span className="text-[10px] text-emerald-600 font-mono font-bold">● Live</span>
            </button>
          )}

          <span className="text-[11px] text-text-muted">
            Rendering <strong>{displayedCustomers.length}</strong> stops in view
          </span>
          <div className="flex items-center bg-white border border-border rounded-lg p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setDensityMode('SMART')}
              className={`px-2 py-0.5 font-bold rounded ${
                densityMode === 'SMART' ? 'bg-accent text-primary-darker shadow-xs' : 'text-text-muted hover:text-primary'
              }`}
              title="Adaptive scaling based on zoom level"
            >
              Smart Scale
            </button>
            <button
              type="button"
              onClick={() => setDensityMode('ALL')}
              className={`px-2 py-0.5 font-bold rounded ${
                densityMode === 'ALL' ? 'bg-accent text-primary-darker shadow-xs' : 'text-text-muted hover:text-primary'
              }`}
              title="Show all stops in viewport regardless of zoom"
            >
              Show All (100%)
            </button>
          </div>
        </div>
      </div>

      {/* Geofence Active Sub-Toolbar */}
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
          {mapLayer === 'SATELLITE' ? (
            <>
              {/* Esri World Imagery Satellite Tiles */}
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              {/* Esri Transportation & Labels Overlay for readability */}
              <TileLayer
                attribution='&copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                opacity={0.8}
              />
            </>
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          <MapEventsHandler
            selectionTool={tool}
            onMapClick={handleMapClick}
            onViewportChange={handleViewportChange}
          />
          <MapViewController target={viewTarget} targetZoom={zoomTarget} />

          {/* Render Circle if defined */}
          {circleCenter && (
            <Circle
              center={circleCenter}
              radius={circleRadius}
              pathOptions={{
                color: '#C4A35A',
                fillColor: '#C4A35A',
                fillOpacity: 0.22,
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
                fillOpacity: 0.22,
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

          {/* Customer Markers with Zoom-Adaptive Scaling */}
          {displayedCustomers.map(c => {
            const isSelected = selectedCustomerIds.includes(c.id);
            const selectedIndex = isSelected ? selectedCustomerIds.indexOf(c.id) + 1 : undefined;

            return (
              <Marker
                key={c.id}
                position={[c.lat!, c.lng!]}
                icon={createMarkerIcon(isSelected, selectedIndex, currentZoom, c.category || undefined)}
                eventHandlers={{
                  click: () => {
                    if (tool === 'PIN') {
                      onToggleCustomer(c.id);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="font-sans text-xs space-y-1.5 p-1 max-w-[210px]">
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
                      📍 {c.lat?.toFixed(5)}, {c.lng?.toFixed(5)}
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
            Select All ({validCustomers.length})
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
