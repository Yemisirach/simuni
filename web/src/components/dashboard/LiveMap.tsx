'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icons in Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function LiveMap() {
  // Center map on Addis Ababa (Piassa/Mercato area)
  const addisCenter: [number, number] = [9.0227, 38.7469];

  // Mock live agents based on our database seed
  const agents = [
    { id: 'Dawit', lat: 9.0227, lng: 38.7469, status: 'In Transit to Mercato' },
    { id: 'Tigist', lat: 8.9897, lng: 38.7885, status: 'Idle (Bole)' },
    { id: 'Henok', lat: 9.0292, lng: 38.7530, status: 'Pending Dispatch' },
  ];

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={addisCenter} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', zIndex: 10 }}
      >
        {/* OpenStreetMap standard tiles (highly accurate for Addis Ababa) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Draw a subtle radius for the Addis Ababa Hub coverage */}
        <Circle 
          center={addisCenter} 
          pathOptions={{ color: '#C4A35A', fillColor: '#C4A35A', fillOpacity: 0.1 }} 
          radius={5000} // 5km radius
        />

        {/* Plot Agents */}
        {agents.map((agent) => (
          <Marker key={agent.id} position={[agent.lat, agent.lng]} icon={customIcon}>
            <Popup>
              <div className="font-sans">
                <strong>Agent {agent.id}</strong><br/>
                Status: {agent.status}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
