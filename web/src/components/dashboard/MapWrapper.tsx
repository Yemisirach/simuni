'use client';

import dynamic from 'next/dynamic';

// We dynamically import the map with SSR disabled inside a Client Component.
// This prevents Next.js from trying to render Leaflet on the server where `window` doesn't exist.
const LiveMap = dynamic(() => import('./LiveMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#e5e3df]">
      <div className="text-4xl mb-2 animate-bounce">🗺️</div>
      <p className="text-sm font-medium text-gray-600">Loading map...</p>
    </div>
  )
});

export default function MapWrapper() {
  return <LiveMap />;
}
