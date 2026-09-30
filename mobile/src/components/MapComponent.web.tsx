import React, { useMemo } from 'react';
import { View } from 'react-native';

export const Marker = (props: any) => null;
(Marker as any).isMarker = true;

export const Polyline = (props: any) => null;
(Polyline as any).isPolyline = true;

export const MapView = (props: any) => {
  const { initialRegion, style, children } = props;

  // Extract markers and polylines from children
  const { markers, polylines } = useMemo(() => {
    const m: any[] = [];
    const p: any[] = [];
    React.Children.forEach(children, (child: any) => {
      if (!child) return;
      if (child.props?.coordinate) {
        m.push({
          lat: child.props.coordinate.latitude,
          lng: child.props.coordinate.longitude,
          title: child.props.title || '',
          color: child.props.pinColor || '#C4A35A',
        });
      } else if (child.props?.coordinates) {
        p.push({
          coords: child.props.coordinates.map((c: any) => [c.latitude, c.longitude]),
          color: child.props.strokeColor || '#0F7A5C',
          weight: child.props.strokeWidth || 4,
        });
      }
    });
    return { markers: m, polylines: p };
  }, [children]);

  const centerLat = initialRegion?.latitude || (markers[0]?.lat ?? 9.03);
  const centerLng = initialRegion?.longitude || (markers[0]?.lng ?? 38.74);

  const html = useMemo(() => {
    const markersJson = JSON.stringify(markers);
    const polylinesJson = JSON.stringify(polylines);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
    .custom-pin {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #FFFFFF;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${centerLat}, ${centerLng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    var markers = ${markersJson};
    var polylines = ${polylinesJson};
    var bounds = [];

    markers.forEach(function(m) {
      var icon = L.divIcon({
        className: 'custom-pin-wrap',
        html: '<div class="custom-pin" style="background:' + m.color + '"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      var marker = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
      if (m.title) marker.bindPopup('<b>' + m.title + '</b>');
      bounds.push([m.lat, m.lng]);
    });

    polylines.forEach(function(p) {
      if (p.coords && p.coords.length > 1) {
        L.polyline(p.coords, { color: p.color, weight: p.weight, opacity: 0.85 }).addTo(map);
        p.coords.forEach(function(pt) { bounds.push(pt); });
      }
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [25, 25] });
    }
  </script>
</body>
</html>`;
  }, [centerLat, centerLng, markers, polylines]);

  return (
    <View style={[{ width: '100%', height: '100%', overflow: 'hidden' }, style]}>
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Route Map"
      />
    </View>
  );
};

export default MapView;
